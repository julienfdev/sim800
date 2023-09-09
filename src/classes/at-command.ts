import { Sim800CommandType } from '../interfaces/sim800-command-type.enum';
import { Sim800Command } from './sim800-command';

export class AtCommand extends Sim800Command {
  constructor(timeoutMs?: number) {
    super({
      command: Sim800CommandType.AT,
      completeWhen: 'OK',
      errorWhen: 'ERROR',
      timeoutMs,
    });
  }
}
