import { Sim800CommandType } from '../interfaces/sim800-command-type.enum';
import { Sim800Command } from './sim800-command';

export class CmgsCommand extends Sim800Command {
  constructor(length: number) {
    super({
      command: Sim800CommandType.ATCMGS,
      arg: String(length),
      completeWhen: (data) => data.startsWith('AT+CMGS'),
      errorWhen: 'ERROR',
    });
  }
}
