import { Sim800Command } from './sim800-command';

export class InputCommand extends Sim800Command {
  constructor(data: string) {
    super({
      command: data,
      isInput: true,
      completeWhen: 'OK',
      errorWhen: 'ERROR',
      expectedData: ['+CMGS:'],
      timeoutMs: 60000,
    });
  }
}
