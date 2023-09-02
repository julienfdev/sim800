import { Sim800DeliveryStatusDetail } from './sim-800-delivery.interface';

export interface SmsPduData {
  tpdu_length: number;
  smsc_tpdu: string;
}

export enum Sim800OutgoingSmsStatus {
  Pending = 'Pending',
  Sending = 'Sending',
  Sent = 'Sent',
  Error = 'Error',
  Delivered = 'Delivered',
  DeliveryFailure = 'DeliveryFailure',
  DeliveryDelayed = 'DeliveryDelayed',
  DeliveryUnknown = 'DeliveryUnknown',
}

export interface Sim800OutgoingSmsPart {
  messageReference: number;
  status: Sim800OutgoingSmsStatus;
  belongsTo: number[];
  detail?: Sim800DeliveryStatusDetail;
}

export interface Sim800OutgoingSms {
  compositeId: number[];
  number: string;
  text: string;
  length: number;
  deliveryReport: boolean;
  status: Sim800OutgoingSmsStatus;
  parts: Sim800OutgoingSmsPart[];
}

export type Sim800OutgoingSmsStreamEvent =
  | {
      type: 'part';
      data: Sim800OutgoingSmsPart;
    }
  | {
      type: 'sms';
      data: Sim800OutgoingSms;
    };
