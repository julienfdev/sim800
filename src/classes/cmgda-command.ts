import { Sim800CommandType } from '../interfaces/sim800-command-type.enum';
import { Sim800Command } from './sim800-command';

export class CmgdaCommand extends Sim800Command {
  constructor(mode = '6') {
    super({
      command: Sim800CommandType.ATCMGDA,
      arg: mode,
      completeWhen: 'OK',
      errorWhen: 'ERROR',
    });
  }
}
