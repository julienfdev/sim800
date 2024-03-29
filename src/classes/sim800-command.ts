import { AsyncSubject, Subscription, catchError, lastValueFrom, takeUntil, timeout } from 'rxjs';
import { Sim800CommandInput } from '../interfaces/sim800-command-input.interface';
import { Sim800CommandState } from '../interfaces/sim800-command-state.enum';
import { Sim800Client } from '../sim800.client';
import { SerialPort } from 'serialport';

export class Sim800Command {
  command: Sim800CommandInput['command'];
  arg?: string;
  state: Sim800CommandState = Sim800CommandState.Created;
  pid: number;
  completed$ = new AsyncSubject<number>();
  protected completeWhen: Sim800CommandInput['completeWhen'];
  protected errorWhen: Sim800CommandInput['errorWhen'];
  protected expectedData: Sim800CommandInput['expectedData'];
  protected ack: boolean = false;
  protected isInput?: boolean;
  result: string | null = null;
  raw: string[] = []; // the raw stream of input received during the command handling
  error: Error | null = null;
  protected observer: Sim800CommandInput['observer'];
  protected subscription?: Subscription;
  protected timeoutMs: number;

  constructor(input: Sim800CommandInput) {
    this.pid = Math.floor(Math.random() * 1000000);
    this.command = input.command;
    this.arg = input.arg;
    this.timeoutMs = input.timeoutMs || 5000;
    this.completeWhen = input.completeWhen;
    this.errorWhen = input.errorWhen;
    this.observer = input.observer;
    this.isInput = input.isInput;
    this.expectedData = input.expectedData;
    if (!this.observer && !this.completeWhen) {
      throw new Error(`Either observer or completeWhen must be provided for "${this.command}" command`);
    }
  }

  async send(stream$: Sim800Client['stream$'], serial: SerialPort) {
    this.execute(stream$, serial);
    await lastValueFrom(this.completed$);
  }

  isDataPartOfRunningCommand(data: string) {
    // If the command is expected to receive data listed in the expectedReturns array, then we should consider it as part of the command
    if (this.expectedData && this.isDataExpected(data)) {
      return true;
    }
    return (
      this.state !== Sim800CommandState.Created &&
      (data.includes(this.command) ||
        this.handleCompletedWhen(data) ||
        this.handleErrorWhen(data) ||
        (this.isInput && data.startsWith('> ')))
    );
  }

  protected execute(stream$: Sim800Client['stream$'], serial: SerialPort) {
    if (this.observer) {
      this.subscription = stream$.pipe(timeout(this.timeoutMs), takeUntil(this.completed$)).subscribe(this.observer);
    }
    // Auto advance state
    stream$
      .pipe(
        timeout(this.timeoutMs),
        takeUntil(this.completed$),
        catchError((err) => {
          this.error = err;
          this.complete(Sim800CommandState.Error);
          return '';
        }),
      )
      .subscribe((data) => {
        if (!this.expectedData && this.ack) {
          this.raw.push(data);
        } else if (this.expectedData) {
          // If we're expecting this data
          if (this.isDataExpected(data)) {
            this.raw.push(data);
          }
        }
        if (data.startsWith(this.command)) {
          this.ack = true;
          this.state = Sim800CommandState.Acknowledged;
        }
        this.handleCompletedWhen(data);
        this.handleErrorWhen(data);
      });
    if (this.isInput) {
      serial.write(`${this.command}${String.fromCharCode(26)}`);
    } else {
      if (this.arg) {
        serial.write(`${this.command}${this.arg}\n`);
      } else {
        serial.write(`${this.command}\n`);
      }
    }
    this.state = Sim800CommandState.Transmitting;
  }

  protected complete(state = Sim800CommandState.Done) {
    this.completed$.next(this.pid);
    this.completed$.complete();
    this.state = state;
    // command is completed, we can unsubscribe from the stream
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  protected setResult(data: string) {
    this.result = data;
    this.state = Sim800CommandState.Done;
    this.complete();
  }
  protected setError(error: Error) {
    this.error = error;
    this.state = Sim800CommandState.Error;
    this.complete();
  }

  private handleCompletedWhen(data: string) {
    if (this.completeWhen) {
      if (typeof this.completeWhen === 'string') {
        if (data === this.completeWhen) {
          this.setResult(data);
          return true;
        }
      } else {
        if (this.completeWhen(data)) {
          this.setResult(data);
          return true;
        }
      }
      return false;
    }
  }

  private handleErrorWhen(data: string) {
    if (this.errorWhen) {
      if (typeof this.errorWhen === 'string') {
        if (data === this.errorWhen) {
          this.setError(new Error(data));
          return true;
        }
      } else {
        if (this.errorWhen(data)) {
          this.setError(new Error(data));
          return true;
        }
      }
    }
    return false;
  }

  private isDataExpected(data: string) {
    if (this.expectedData) {
      return this.expectedData.some((expected) => {
        if (typeof expected === 'string') {
          return data.startsWith(expected);
        } else {
          return expected(data);
        }
      });
    }
    return true;
  }
}
