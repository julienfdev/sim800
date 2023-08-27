import { Sim800CommandType } from '../interfaces/sim800-command-type.enum';
import { Sim800Command } from './sim800-command';

export class PinUnlockCommand extends Sim800Command {
  constructor(pin: string) {
    super({
      command: Sim800CommandType.ATCPIN,
      arg: pin,
      completeWhen: '+CPIN: READY',
      errorWhen: 'ERROR',
    });
  }
}
