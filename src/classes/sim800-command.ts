import { AsyncSubject, catchError, lastValueFrom, takeUntil, timeout } from 'rxjs';
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
  protected ack: boolean = false;
  result: string | null = null;
  raw: string[] = []; // the raw stream of input received during the command handling
  error: Error | null = null;
  protected observer: Sim800CommandInput['observer'];
  protected timeoutMs: number;

  constructor(input: Sim800CommandInput) {
    this.pid = Math.floor(Math.random() * 1000000);
    this.command = input.command;
    this.arg = input.arg;
    this.timeoutMs = input.timeoutMs || 5000;
    this.completeWhen = input.completeWhen;
    this.errorWhen = input.errorWhen;
    this.observer = input.observer;
    if (!this.observer && !this.completeWhen) {
      throw new Error(`Either observer or completeWhen must be provided for "${this.command}" command`);
    }
  }

  async send(stream$: Sim800Client['stream$'], serial: SerialPort) {
    this.execute(stream$, serial);
    await lastValueFrom(this.completed$);
  }

  isDataPartOfRunningCommand(data: string) {
    return (
      this.state !== Sim800CommandState.Created &&
      (data.startsWith(this.command) || this.handleCompletedWhen(data) || this.handleErrorWhen(data))
    );
  }

  protected execute(stream$: Sim800Client['stream$'], serial: SerialPort) {
    if (this.observer) {
      stream$.pipe(timeout(this.timeoutMs), takeUntil(this.completed$)).subscribe(this.observer);
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
        if (this.ack) {
          this.raw.push(data);
        }
        if (data.startsWith(this.command)) {
          this.ack = true;
          this.state = Sim800CommandState.Acknowledged;
        }
        this.handleCompletedWhen(data);
        this.handleErrorWhen(data);
      });
    if (this.arg) {
      serial.write(`${this.command}${this.arg}\n`);
    } else {
      serial.write(`${this.command}\n`);
    }
    this.state = Sim800CommandState.Transmitting;
  }

  protected complete(state = Sim800CommandState.Done) {
    this.completed$.next(this.pid);
    this.completed$.complete();
    this.state = state;
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
}
