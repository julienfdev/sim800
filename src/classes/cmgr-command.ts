import { Sim800CommandType } from '../interfaces/sim800-command-type.enum';
import { Sim800Command } from './sim800-command';

export class CmgrCommand extends Sim800Command {
  constructor(index: number) {
    super({
      command: Sim800CommandType.ATCMGR,
      arg: String(index),
      completeWhen: 'OK',
      errorWhen: 'ERROR',
    });
  }
}
