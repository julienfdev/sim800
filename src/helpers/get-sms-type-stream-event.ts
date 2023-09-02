import {
  Sim800OutgoingSmsPart,
  Sim800OutgoingSmsStatus,
  Sim800OutgoingSmsStreamEvent,
} from 'interfaces/sim800-outgoing-sms.interface';

export const getSmsTypeStreamEvent = (
  compositeId: number[],
  text: string,
  length: number,
  deliveryReport: boolean,
  number: string,
  status: Sim800OutgoingSmsStatus,
  parts: Sim800OutgoingSmsPart[],
): Sim800OutgoingSmsStreamEvent => {
  return {
    type: 'sms',
    data: {
      compositeId,
      text,
      length,
      deliveryReport,
      number,
      status,
      parts,
    },
  };
};
