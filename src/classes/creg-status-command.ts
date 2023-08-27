import { Sim800CommandType } from '../interfaces/sim800-command-type.enum';
import { Sim800Command } from './sim800-command';

export class CregStatusCommand extends Sim800Command {
  constructor() {
    super({
      command: Sim800CommandType.CREG,
      completeWhen: (data) => {
        return data.startsWith('+CREG:');
      },
      errorWhen: 'ERROR',
    });
  }
}
