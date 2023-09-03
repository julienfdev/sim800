import { Subject } from 'rxjs';
import { Sim800Client } from 'sim800.client';
import { handleSmsStreamAfterPduPart } from '../helpers/handle-sms-stream-after-pdu-part';
import { CmgsCommand } from './cmgs-command';
import { generatePduData } from '../helpers/generate-pdu-data';
import { InputCommand } from './input-command';

export class Sim800Sms {
  public result$ = new Subject<number[]>();
  result?: number[];
  error?: Error;

  constructor(
    private readonly client: Sim800Client,
    private readonly data: { number: string; text: string; deliveryReport: boolean },
  ) {}

  public async execute() {
    const compositeId: number[] = [];
    // We need to add a busy observer to prevent sending multiple sms at the same time (debatable)
    try {
      const data = generatePduData(this.data.number, this.data.text, this.data.deliveryReport);

      // We send each pdu part
      for await (const pduPart of data) {
        await this.client.send(new CmgsCommand(pduPart.tpdu_length));
        const commandResult = (await this.client.send(new InputCommand(pduPart.smsc_tpdu), { raw: true })) as string[];
        const messageReference = parseInt(commandResult[0].split(':')[1].trim(), 10);
        compositeId.push(messageReference);

        // If there is only one part, we can push the unique part as a sms
        handleSmsStreamAfterPduPart(
          data,
          this.client.smsStream$,
          this.client.outboxSpooler,
          compositeId,
          this.data.text,
          this.data.deliveryReport,
          this.data.number,
          messageReference,
        );
      }
      this.result = compositeId;
      this.result$.next(compositeId);
      this.result$.complete();
    } catch (err) {
      if (err instanceof Error) {
        this.error = err;
      }
      this.result$.error(err);
      this.result$.complete();
    } finally {
      this.client.smsQueuePing$.next();
    }
  }
}
