import { Subject } from 'rxjs';
import {
  Sim800OutgoingSms,
  Sim800OutgoingSmsStatus,
  Sim800OutgoingSmsStreamEvent,
  SmsPduData,
} from '../interfaces/sim800-outgoing-sms.interface';
import { getSmsTypeStreamEvent } from './get-sms-type-stream-event';

/**
 *
 * @param data
 * @param smsStream$
 * @param outboxSpooler
 *
 * This function is used to handle the sms stream publications after a pdu part has been sent.
 */
export const handleSmsStreamAfterPduPart = (
  data: SmsPduData[],
  smsStream$: Subject<Sim800OutgoingSmsStreamEvent>,
  outboxSpooler: Sim800OutgoingSms[],
  compositeId: number[],
  text: string,
  deliveryReport: boolean,
  number: string,
  messageReference: number,
) => {
  if (data.length === 1) {
    smsStream$.next(
      getSmsTypeStreamEvent(compositeId, text, 1, deliveryReport, number, Sim800OutgoingSmsStatus.Sent, [
        {
          messageReference,
          status: Sim800OutgoingSmsStatus.Sent,
          belongsTo: compositeId,
        },
      ]),
    );
  } else {
    // We try to find an existing sms for which some ids match some items of our compositeId
    const existingSms = outboxSpooler.find((sms) =>
      sms.parts.some((part) => compositeId.includes(part.messageReference)),
    );
    if (existingSms) {
      smsStream$.next({
        type: 'part',
        data: {
          messageReference,
          status: Sim800OutgoingSmsStatus.Sent,
          belongsTo: compositeId,
        },
      });
    } else {
      smsStream$.next(
        getSmsTypeStreamEvent(compositeId, text, 1, deliveryReport, number, Sim800OutgoingSmsStatus.Sending, [
          {
            messageReference,
            status: Sim800OutgoingSmsStatus.Sent,
            belongsTo: compositeId,
          },
        ]),
      );
    }
  }
};
