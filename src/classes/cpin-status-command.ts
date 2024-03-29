import { Sim800CommandType } from '../interfaces/sim800-command-type.enum';
import { Sim800Command } from './sim800-command';

export class CpinStatusCommand extends Sim800Command {
  constructor() {
    super({
      command: Sim800CommandType.ATCPINSTATUS,
      completeWhen: (data) => data.includes('+CPIN: '),
      errorWhen: 'ERROR',
    });
  }
}
