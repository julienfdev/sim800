import { AsyncSubject, Subject, from, interval, lastValueFrom, takeUntil, timeout } from 'rxjs';
import { ReadlineParser, SerialPort } from 'serialport';
import EventEmitter from 'stream';
import { AtCommand } from './classes/at-command';
import { CmgdaCommand } from './classes/cmgda-command';
import { CmgfCommand } from './classes/cmgf-command';
import { CmglCommand } from './classes/cmgl-command';
import { CnmiCommand } from './classes/cnmi-command';
import { CpinStatusCommand } from './classes/cpin-status-command';
import { CregStatusCommand } from './classes/creg-status-command';
import { PinUnlockCommand } from './classes/pin-unlock-command';
import { Sim800Command } from './classes/sim800-command';
import { Sim800Sms } from './classes/sim800-sms';
import { sim800DataHandler } from './handlers/sim800.data.handler';
import { sim800ErrorHandler } from './handlers/sim800.error.handler';
import { sim800OpenHandler } from './handlers/sim800.open.handler';
import { attachSerialListeners } from './helpers/attach-serial-listeners';
import { Sim800DeliveryEvent, Sim800DeliveryStatusDetail } from './interfaces/sim-800-delivery.interface';
import { Sim800ClientConfig } from './interfaces/sim800-client-config.interface';
import { Sim800ClientState } from './interfaces/sim800-client-state.enum';
import { CmgfMode } from './interfaces/sim800-command.enums';
import { Sim800EventEmitter } from './interfaces/sim800-event-emitter';
import { Sim800IncomingSms } from './interfaces/sim800-incoming-sms.interface';
import { Sim800MultipartSms } from './interfaces/sim800-multipart-sms.interface';
import {
  Sim800OutgoingSms,
  Sim800OutgoingSmsPart,
  Sim800OutgoingSmsStatus,
  Sim800OutgoingSmsStreamEvent,
} from './interfaces/sim800-outgoing-sms.interface';
import { Sim800PinState } from './interfaces/sim800-pin-state.enum';
import { completedCommandSubscriberFactory } from './subscribers/completed-command-subscriber';
import { deliveryReportInputSubscriberFactory } from './subscribers/delivery-report-input-subscriber';
import { deliveryReportStreamSubscriberFactory } from './subscribers/delivery-report-stream-subscriber';
import { newSmsSubscriberFactory } from './subscribers/new-sms-subscriber';
import { smsStreamSubscriberFactory } from './subscribers/sms-stream-subscriber';
import { NetworkStatus } from './interfaces';

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
  private noInit: boolean;
  private pin?: string;
  private cnmi = '2,1,2,1,0' as const;

  ready$ = new AsyncSubject<boolean>();
  network$ = new AsyncSubject<boolean>();
  smsBusy$ = new AsyncSubject<boolean>();
  stream$ = new Subject<string>();
  inputStream$ = new Subject<string>();
  smsStream$ = new Subject<Sim800OutgoingSmsStreamEvent>();
  deliveryReportStream$ = new Subject<Sim800DeliveryEvent>();
  smsQueuePing$ = new Subject<void>();

  state: Sim800ClientState = Sim800ClientState.Idle;
  incomingSms: Sim800MultipartSms[] = [];
  preventWipe: boolean;
  outboxSpooler: Sim800OutgoingSms[] = [];
  receivingDeliveryReport: boolean = false;
  smsQueue: Sim800Sms[] = [];

  constructor({ port, baudRate, delimiter, logger, pin, preventWipe, noInit }: Sim800ClientConfig) {
    this.port = port;
    this.preventWipe = preventWipe || false;
    this.pin = pin;
    this.noInit = noInit || false;
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
    this.smsQueuePing$.subscribe(() => {
      this.logger?.verbose?.('an sms job has ended, shifting queue...');
      this.smsQueue.shift();
      if (this.smsQueue.length) {
        this.logger?.debug?.('sending next SMS in line...');
        this.smsQueue[0].execute();
      } else {
        this.logger?.debug?.('no more SMS in queue, waiting...');
      }
    });
    if (!this.noInit) {
      this.init();
    }
  }

  private async init() {
    try {
      await lastValueFrom(from(this.awaitDevice()).pipe(timeout(5000)));
      // Checking if device is an AT modem
      await this.send(new AtCommand());

      // Handling Pin Status
      try {
        await this.handlePinState((await this.send(new CpinStatusCommand())) as Sim800PinState);
      } catch (err) {
        this.eventEmitter.emit('error', new Error('Error while handling PIN code'));
        throw new Error(
          `Error while handling PIN code, please check that the pin is correct before trying again to prevent sim card lock`,
        );
      }
      this.state = Sim800ClientState.Initialized;
      this.logger?.log('Sim800Client Initialized, waiting for network');
      this.monitorNetworkUntilReady(this.network$);
      // Change SIM Mode
      await this.send(new CnmiCommand(this.cnmi));
      // Change to PDU
      await this.send(new CmgfCommand(CmgfMode.Pdu));
      if (!this.preventWipe) {
        this.deleteAllStoredSms();
      }
    } catch (error) {
      if (typeof error === 'object' && error && 'message' in error) {
        this.eventEmitter.emit('error', error);
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
    const subscription = command.completed$.subscribe(
      completedCommandSubscriberFactory(command, this.buffer, this.nextJob$, this.logger),
    );
    // we add the command to the buffer
    this.buffer.push(command);
    // if the buffer has only one command, we execute it
    if (this.buffer.length === 1) {
      this.logger?.verbose?.(`Executing "${command.command}" with PID ${command.pid}`);
      this.nextJob$.next();
    }
    await lastValueFrom(command.completed$);
    subscription.unsubscribe();
    if (command.error) {
      this.eventEmitter.emit('error', command.error);
      throw command.error;
    }
    if (options?.raw) {
      return command.raw;
    }
    return command.result;
  }

  async sendSms(number: string, text: string, deliveryReport = false) {
    this.logger?.debug?.(`sendSms called for number: "${number}", waiting line free and network ready`);
    const networkReady = await this.isNetworkReady();
    if (!networkReady) {
      throw new Error('network stalled, please reset the device and try again');
    }

    const sms = new Sim800Sms(this, { number, text, deliveryReport });
    this.smsQueue.push(sms);
    if (this.smsQueue.length === 1) {
      // if the queue is now of length 1, it means that the sms is the only one in the queue
      // we can send it right away
      this.logger?.verbose?.(`sms queue was empty, sending sms right away`);
      sms.execute();
    } else {
      this.logger?.verbose?.(`sms is #${this.smsQueue.length} in queue, waiting for the line to be free`);
    }
    try {
      const compositeId = await lastValueFrom(sms.result$);
      this.eventEmitter.emit('sms-sent', compositeId, new Date());
      return compositeId;
    } catch (error) {
      this.eventEmitter.emit('error', error);
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

  /**
   *
   * @deprecated will be removed from the next minor release
   */
  checkNetwork(network$: AsyncSubject<boolean>) {
    this.monitorNetworkUntilReady(network$);
  }

  monitorNetworkUntilReady(network$: AsyncSubject<boolean>) {
    interval(5000)
      .pipe(takeUntil(network$))
      .subscribe(async () => {
        const networkResult = (await this.send(new CregStatusCommand())) as string;
        this.handleNetworkResult(networkResult);
      });
  }

  async getNetworkStatus(): Promise<NetworkStatus> {
    const result = (await this.send(new CregStatusCommand())) as string;

    return (result.slice(-1) as NetworkStatus) || NetworkStatus.Unknown;
  }

  private setNetworkReady() {
    this.eventEmitter.emit('networkReady');
    this.network$.next(true);
    this.network$.complete();
  }

  private setNetworkNotReady() {
    this.network$.next(false);
    this.network$.complete();
    this.network$.unsubscribe();
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

  reset(emptyBuffers = false, gracePeriodMs = 10000) {
    if (emptyBuffers) {
      this.buffer = [];
      this.incomingSms = [];
      this.outboxSpooler = [];
      this.smsQueue = [];
    }
    this.logger?.warn('Sim800Client reset called');
    this.setNetworkNotReady();
    this.serial.write(String.fromCharCode(27));
    this.serial.write('AT+CFUN=1,1\r\n');
    this.logger?.warn(`Sim800Client reset done, waiting ${gracePeriodMs}ms before reinitializing`);
    if (!this.noInit) {
      setTimeout(() => {
        this.init();
      }, gracePeriodMs);
    }
  }

  async deleteAllStoredSms() {
    // By default, wipe every SMS if there is any, we must wait for a network ready indication
    // and wait for another 2-3 seconds for the SIM to be ready
    await this.isNetworkReady();
    setTimeout(async () => {
      try {
        const result = await this.send(new CmglCommand(), { raw: true });
        if (result?.length) {
          await this.send(new CmgdaCommand());
        }
      } catch (error) {
        this.logger?.warn("Couldn't perform the CMGL command properly, maybe SIM not yet fully initialized");
        this.eventEmitter.emit('error', error);
      }
    }, 2000);
  }

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
      status: Sim800OutgoingSmsStatus.Delivered,
      detail?: Omit<Sim800OutgoingSmsPart, 'belongsTo'>[],
    ) => void,
  ): EventEmitter;
  on(
    event: 'delivery-report',
    listener: (compositeId: number[], status: Sim800OutgoingSmsStatus, detail?: Sim800DeliveryStatusDetail) => void,
  ): EventEmitter;
  on(event: 'error', listener: (error: Error) => void): EventEmitter;
  on(event: string, listener: (...args: any) => void): import('events') {
    return this.eventEmitter.on(event, listener);
  }
}
