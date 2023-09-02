import { Observer } from 'rxjs';
import { Sim800CommandType } from './sim800-command-type.enum';

export type Sim800CommandInput = {
  command: Sim800CommandType | string;
  arg?: string;
  timeoutMs?: number;
  observer?: Partial<Observer<string>>;
  completeWhen?: ((data: string) => boolean) | string;
  errorWhen?: ((data: string) => boolean) | string;
};

export interface AtCommandInput {}