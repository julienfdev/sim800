import { Sim800Client } from 'sim800.client';
import { Sim800OutgoingSmsStatus, Sim800OutgoingSmsStreamEvent } from '../interfaces/sim800-outgoing-sms.interface';

export const smsStreamSubscriberFactory = (client: Sim800Client) => (sms: Sim800OutgoingSmsStreamEvent) => {
  if (sms.type === 'part') {
    const existingSms = client.outboxSpooler.find((outboxSms) =>
      outboxSms.parts.some((part) => sms.data.belongsTo.some((id) => part.belongsTo.includes(id))),
    );
    if (existingSms) {
      existingSms.parts.push(sms.data);
    }
    if (
      existingSms &&
      existingSms?.parts.length === existingSms.length &&
      existingSms.parts.every((part) => part.status === Sim800OutgoingSmsStatus.Sent)
    ) {
      existingSms.status = Sim800OutgoingSmsStatus.Sent;
    }
  } else {
    client.outboxSpooler.push(sms.data);
  }
};
