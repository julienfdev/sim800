import { SmsPduData } from 'interfaces/sim800-outgoing-sms.interface';
import { PDUParser } from 'pdu.ts';

export const generatePduData = (number: string, text: string, deliveryReport = false) =>
  PDUParser.Generate({
    encoding: '16bit',
    smsc: undefined as unknown as string,
    smsc_type: 91,
    receiver: number.replace('+', ''),
    receiver_type: 91,
    request_status: deliveryReport,
    text,
  }) as unknown as SmsPduData[]; // overriding bad TypeScript library types
