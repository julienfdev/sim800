import { Sim800CommandType } from '../interfaces/sim800-command-type.enum';
import { Sim800Command } from './sim800-command';

export class CnmiCommand extends Sim800Command {
  constructor(cnmi: `${number},${number},${number},${number},${number}`) {
    super({
      command: Sim800CommandType.ATCNMI,
      arg: cnmi,
      completeWhen: 'OK',
      errorWhen: 'ERROR',
    });
  }
}
