import {
  AsyncSubject,
  Subject,
  from,
  interval,
  lastValueFrom,
  takeUntil,
  timeout,
} from 'rxjs';
import { Sim800ClientConfig } from './interfaces/sim800-client-config.interface';
import { ReadlineParser, SerialPort } from 'serialport';
import { attachSerialListeners } from './helpers/attach-serial-listeners';
import { sim800OpenHandler } from './handlers/sim800.open.handler';
import { sim800DataHandler } from './handlers/sim800.data.handler';
import { sim800ErrorHandler } from './handlers/sim800.error.handler';
import { Sim800ClientState } from './interfaces/sim800-client-state.enum';
import { Sim800Command } from './classes/sim800-command';
import { AtCommand } from './classes/at-command';
import { CpinStatusCommand } from './classes/cpin-status-command';
import { Sim800PinState } from './interfaces/sim800-pin-state.enum';
import { PinUnlockCommand } from './classes/pin-unlock-command';
import { CregStatusCommand } from './classes/creg-status-command';

export class Sim800Client {
  private nextJob$ = new Subject<void>();
  private buffer: Sim800Command[] = [];
  private port: string;
  private baudRate: number;
  private delimiter: string;
  private logger: Sim800ClientConfig['logger'];
  private serial: SerialPort;
  private parser: ReadlineParser;

  private pin?: string;

  private ready$ = new AsyncSubject<boolean>();
  private network$ = new AsyncSubject<boolean>();
  private stream$ = new Subject<string>();

  state: Sim800ClientState = Sim800ClientState.Idle;

  constructor({ port, baudRate, delimiter, logger, pin }: Sim800ClientConfig) {
    this.port = port;
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
      open: () => sim800OpenHandler(this.ready$),
      data: (data: string) => sim800DataHandler(data, this.stream$),
      error: (error: Error) => sim800ErrorHandler(error, logger),
    });
    this.nextJob$.subscribe(async () => {
      await this.awaitDevice();
      const command = this.buffer[0];
      command.send(this.stream$, this.serial);
    });
    this.init();
  }

  // TODO autoretry
  private async init() {
    try {
      await lastValueFrom(from(this.awaitDevice()).pipe(timeout(5000)));
      // Checking if device is an AT modem
      await this.send(new AtCommand());

      // Handling Pin Status
      try {
        await this.handlePinState(await this.send(new CpinStatusCommand()));
      } catch (err) {
        throw new Error(
          `Error while handling PIN code, please check that the pin is correct before trying again to prevent sim card lock`,
        );
      }
      this.state = Sim800ClientState.Initialized;
      this.logger.log('Sim800Client Initialized, waiting for network');
      this.checkNewtork();
    } catch (error) {
      if ('message' in error) {
        this.logger.error(`Sim800Client init error : ${error.message}`);
      }
    }
  }

  awaitDevice() {
    return lastValueFrom(this.ready$);
  }

  isNetworkReady() {
    return lastValueFrom(this.network$);
  }

  async send<ModemResponse extends string = string>(
    command: Sim800Command,
  ): Promise<ModemResponse> {
    // we subscribe to the completed observable
    command.completed$.subscribe((pid) => {
      if (command.result) {
        this.logger.verbose?.(
          `Command "${command.command}" with PID ${pid} has completed with result "${command.result}"`,
        );
      }
      // we can remove the command from the buffer
      this.buffer = this.buffer.filter((c) => c.pid !== pid);
      if (this.buffer.length) {
        this.logger.verbose?.(
          `Executing next command "${this.buffer[0].command}" with PID ${this.buffer[0].pid}`,
        );
        this.nextJob$.next();
      }
    });
    // we add the command to the buffer
    this.buffer.push(command);
    // if the buffer has only one command, we execute it
    if (this.buffer.length === 1) {
      this.logger.verbose?.(
        `Executing "${command.command}" with PID ${command.pid}`,
      );
      this.nextJob$.next();
    }
    await lastValueFrom(command.completed$);
    if (command.error) throw command.error;
    return command.result as ModemResponse;
  }

  private async handlePinState(status: Sim800PinState) {
    switch (status) {
      case Sim800PinState.PinRequired:
        if (this.pin) {
          this.logger.warn(
            'Pin required, unlocking sim card with provided pin',
          );
          return this.send(new PinUnlockCommand(this.pin));
        } else {
          throw new Error('Pin required but not provided');
        }
      case Sim800PinState.PukRequired:
        throw new Error(
          'Sim locked, puk required, please use a mobile phone to unlock the sim card',
        );
      case Sim800PinState.Ready:
        break;
    }
  }

  private checkNewtork() {
    interval(10000)
      .pipe(takeUntil(this.network$))
      .subscribe(async () => {
        const networkResult = await this.send(new CregStatusCommand());
        this.handleNetworkResult(networkResult);
      });
  }

  private setNetworkReady() {
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
        this.logger.warn('Network registration denied');
        this.setNetworkNotReady();
        break;
    }
  }
}
