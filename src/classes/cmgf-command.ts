import { CmgfMode } from 'interfaces/sim800-command.enums';
import { Sim800CommandType } from '../interfaces/sim800-command-type.enum';
import { Sim800Command } from './sim800-command';

export class CmgfCommand extends Sim800Command {
  constructor(cmgfMode: CmgfMode) {
    super({
      command: Sim800CommandType.ATCMGF,
      arg: cmgfMode,
      completeWhen: 'OK',
      errorWhen: 'ERROR',
    });
  }
}
