import { AsyncSubject, Subject, from, interval, lastValueFrom, takeUntil, timeout } from 'rxjs';
import { ReadlineParser, SerialPort } from 'serialport';
import EventEmitter from 'stream';
import { AtCommand } from './classes/at-command';
import { CmgdaCommand } from './classes/cmgda-command';
import { CmgfCommand } from './classes/cmgf-command';
import { CmgsCommand } from './classes/cmgs-command';
import { CnmiCommand } from './classes/cnmi-command';
import { CpinStatusCommand } from './classes/cpin-status-command';
import { CregStatusCommand } from './classes/creg-status-command';
import { InputCommand } from './classes/input-command';
import { PinUnlockCommand } from './classes/pin-unlock-command';
import { Sim800Command } from './classes/sim800-command';
import { sim800DataHandler } from './handlers/sim800.data.handler';
import { sim800ErrorHandler } from './handlers/sim800.error.handler';
import { sim800OpenHandler } from './handlers/sim800.open.handler';
import { attachSerialListeners } from './helpers/attach-serial-listeners';
import { generatePduData } from './helpers/generate-pdu-data';
import { handleSmsStreamAfterPduPart } from './helpers/handle-sms-stream-after-pdu-part';
import { Sim800DeliveryEvent, Sim800DeliveryStatusDetail } from './interfaces/sim-800-delivery.interface';
import { Sim800ClientConfig } from './interfaces/sim800-client-config.interface';
import { Sim800ClientState } from './interfaces/sim800-client-state.enum';
import { CmgfMode } from './interfaces/sim800-command.enums';
import { Sim800EventEmitter } from './interfaces/sim800-event-emitter';
import { Sim800IncomingSms } from './interfaces/sim800-incoming-sms.interface';
import { Sim800MultipartSms } from './interfaces/sim800-multipart-sms.interface';
import {
  Sim800OutgoingSms,
  Sim800OutgoingSmsStatus,
  Sim800OutgoingSmsStreamEvent,
} from './interfaces/sim800-outgoing-sms.interface';
import { Sim800PinState } from './interfaces/sim800-pin-state.enum';
import { completedCommandSubscriberFactory } from './subscribers/completed-command-subscriber';
import { deliveryReportInputSubscriberFactory } from './subscribers/delivery-report-input-subscriber';
import { deliveryReportStreamSubscriberFactory } from './subscribers/delivery-report-stream-subscriber';
import { newSmsSubscriberFactory } from './subscribers/new-sms-subscriber';
import { smsStreamSubscriberFactory } from './subscribers/sms-stream-subscriber';

export class Sim800Client implements Sim800EventEmitter {
  eventEmitter = new EventEmitter();
  private nextJob$ = new Subject<void>();
  private buffer: Sim800Command[] = [];
  private port: string;
  private baudRate: number;
  private delimiter: string;
  private logger: Sim800ClientConfig['logger'];
  private serial: SerialPort;
  private parser: ReadlineParser;

  private pin?: string;
  private cnmi = '2,1,2,1,0' as const;

  ready$ = new AsyncSubject<boolean>();
  network$ = new AsyncSubject<boolean>();
  smsBusy$ = new AsyncSubject<boolean>();
  stream$ = new Subject<string>();
  inputStream$ = new Subject<string>();
  smsStream$ = new Subject<Sim800OutgoingSmsStreamEvent>();
  deliveryReportStream$ = new Subject<Sim800DeliveryEvent>();

  state: Sim800ClientState = Sim800ClientState.Idle;
  incomingSms: Sim800MultipartSms[] = [];
  preventWipe: boolean;
  outboxSpooler: Sim800OutgoingSms[] = [];
  receivingDeliveryReport: boolean = false;

  constructor({ port, baudRate, delimiter, logger, pin, preventWipe }: Sim800ClientConfig) {
    this.port = port;
    this.preventWipe = preventWipe || false;
    this.pin = pin;
    this.baudRate = baudRate || 115200;
    this.delimiter = delimiter || '\r\n';
    this.logger = logger || console;
    this.parser = new ReadlineParser({
      delimiter: this.delimiter,
    });
    this.serial = new SerialPort({ path: this.port, baudRate: this.baudRate });

    this.serial.pipe(this.parser);
    attachSerialListeners(this.serial, this.parser, {
      open: () => {
        this.eventEmitter.emit('deviceReady');
        sim800OpenHandler(this.ready$);
      },
      data: (data: string) => sim800DataHandler(data, this.stream$),
      error: (error: Error) => sim800ErrorHandler(error, logger),
    });
    this.nextJob$.subscribe(async () => {
      await this.awaitDevice();
      const command = this.buffer[0];
      command.send(this.stream$, this.serial);
    });
    this.stream$.subscribe(this.handleInputData);
    this.inputStream$.subscribe(newSmsSubscriberFactory(this, this.logger));
    this.inputStream$.subscribe(deliveryReportInputSubscriberFactory(this, this.logger));
    this.deliveryReportStream$.subscribe(deliveryReportStreamSubscriberFactory(this, this.logger));
    this.smsStream$.subscribe(smsStreamSubscriberFactory(this));
    this.init();
  }

  // TODO autoretry && reset watchdog
  private async init() {
    try {
      await lastValueFrom(from(this.awaitDevice()).pipe(timeout(5000)));
      // Checking if device is an AT modem
      await this.send(new AtCommand());

      // Handling Pin Status
      try {
        await this.handlePinState((await this.send(new CpinStatusCommand())) as Sim800PinState);
      } catch (err) {
        throw new Error(
          `Error while handling PIN code, please check that the pin is correct before trying again to prevent sim card lock`,
        );
      }
      this.state = Sim800ClientState.Initialized;
      this.logger?.log('Sim800Client Initialized, waiting for network');
      this.checkNewtork();
      // Change SIM Mode
      await this.send(new CnmiCommand(this.cnmi));
      // Change to PDU
      await this.send(new CmgfCommand(CmgfMode.Pdu));
      if (!this.preventWipe) {
        // By default, wipe every SMS
        await this.send(new CmgdaCommand());
      }
    } catch (error) {
      if (typeof error === 'object' && error && 'message' in error) {
        this.logger?.error(`Sim800Client init error : ${error.message}`);
      }
    }
  }

  awaitDevice() {
    return lastValueFrom(this.ready$);
  }

  isNetworkReady() {
    return lastValueFrom(this.network$);
  }

  async send(command: Sim800Command, options?: { raw?: boolean }) {
    // we subscribe to the completed observable
    command.completed$.subscribe(completedCommandSubscriberFactory(command, this.buffer, this.nextJob$, this.logger));
    // we add the command to the buffer
    this.buffer.push(command);
    // if the buffer has only one command, we execute it
    if (this.buffer.length === 1) {
      this.logger?.verbose?.(`Executing "${command.command}" with PID ${command.pid}`);
      this.nextJob$.next();
    }
    await lastValueFrom(command.completed$);
    if (command.error) throw command.error;
    if (options?.raw) {
      return command.raw;
    }
    return command.result;
  }

  async sendSms(number: string, text: string, deliveryReport = false) {
    const compositeId: number[] = [];
    // We need to add a busy observer to prevent sending multiple sms at the same time (debatable)
    try {
      const data = generatePduData(number, text, deliveryReport);

      // We send each pdu part
      for await (const pduPart of data) {
        await this.send(new CmgsCommand(pduPart.tpdu_length));
        const commandResult = (await this.send(new InputCommand(pduPart.smsc_tpdu), { raw: true })) as string[];
        const messageReference = parseInt(commandResult[0].split(':')[1].trim(), 10);
        compositeId.push(messageReference);

        // If there is only one part, we can push the unique part as a sms
        handleSmsStreamAfterPduPart(
          data,
          this.smsStream$,
          this.outboxSpooler,
          compositeId,
          text,
          deliveryReport,
          number,
          messageReference,
        );
      }
      this.eventEmitter.emit('sms-sent', compositeId);
      return compositeId;
    } catch (error) {
      this.logger?.error('ERROR', error);
    }
  }

  private async handlePinState(status: Sim800PinState) {
    switch (status) {
      case Sim800PinState.PinRequired:
        if (this.pin) {
          this.logger?.warn('Pin required, unlocking sim card with provided pin');
          return this.send(new PinUnlockCommand(this.pin));
        } else {
          throw new Error('Pin required but not provided');
        }
      case Sim800PinState.PukRequired:
        throw new Error('Sim locked, puk required, please use a mobile phone to unlock the sim card');
      case Sim800PinState.Ready:
        break;
    }
  }

  private checkNewtork() {
    interval(5000)
      .pipe(takeUntil(this.network$))
      .subscribe(async () => {
        const networkResult = (await this.send(new CregStatusCommand())) as string;
        this.handleNetworkResult(networkResult);
      });
  }

  private setNetworkReady() {
    this.eventEmitter.emit('networkReady');
    this.network$.next(true);
    this.network$.complete();
    // Initialize brownout detection, if brownout, reset and call back init if not pin error
  }

  private setNetworkNotReady() {
    this.network$.next(false);
    this.network$.complete();
    this.network$ = new AsyncSubject<boolean>();
    // check CREG or maybe COPS, reset and call back init if not pin error
  }

  private handleNetworkResult(result: string) {
    switch (result.slice(-1)) {
      case '1':
        this.setNetworkReady();
        break;
      case '5':
        this.setNetworkReady();
        break;
      case '3':
        this.logger?.warn('Network registration denied');
        this.setNetworkNotReady();
        break;
    }
  }

  private handleInputData = (data: string) => {
    const bufferCopy = [...this.buffer];
    // Copying buffer to prevent side effects of a command being removed from the buffer while the function is running
    // Is data part of command?
    if (!((bufferCopy.length && bufferCopy[0].isDataPartOfRunningCommand(data)) || data === 'OK' || data === 'ERROR')) {
      this.eventEmitter.emit('input', data);
      this.inputStream$.next(data);
    }
  };

  // Events override
  on(event: 'deviceReady', listener: () => void): import('events');
  on(event: 'networkReady', listener: () => void): import('events');
  on(event: 'input', listener: (data: string) => void): import('events');
  on(event: 'incoming-sms', listener: (sms: Sim800IncomingSms) => void): EventEmitter;
  on(event: 'sms-sent', listener: (compositeId: number[]) => void): EventEmitter;
  on(
    event: 'delivery-report',
    listener: (
      compositeId: number[],
      status: Sim800OutgoingSmsStatus,
      detail?: { messageReference: number; detail: Sim800DeliveryStatusDetail }[],
    ) => void,
  ): EventEmitter;
  on(event: string, listener: (...args: any) => void): import('events') {
    return this.eventEmitter.on(event, listener);
  }
}
