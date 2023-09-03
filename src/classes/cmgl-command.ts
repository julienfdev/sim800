import { CmglStat } from '../interfaces/sim800-command.enums';
import { Sim800CommandType } from '../interfaces/sim800-command-type.enum';
import { Sim800Command } from './sim800-command';

export class CmglCommand extends Sim800Command {
  constructor(stat: CmglStat = CmglStat.All) {
    super({
      command: Sim800CommandType.ATCMGL,
      arg: String(stat),
      expectedData: ['+CMGL:'],
      completeWhen: 'OK',
      errorWhen: 'ERROR',
    });
  }
}
