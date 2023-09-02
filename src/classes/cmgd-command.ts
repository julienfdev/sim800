import { Sim800CommandType } from '../interfaces/sim800-command-type.enum';
import { Sim800Command } from './sim800-command';

export class CmgdCommand extends Sim800Command {
  constructor(simIndex: number) {
    super({
      command: Sim800CommandType.ATCMGD,
      arg: String(simIndex),
      completeWhen: 'OK',
      errorWhen: 'ERROR',
    });
  }
}
