import { EventEmitter } from 'stream';
import { Sim800IncomingSms } from './sim800-incoming-sms.interface';
import { Sim800OutgoingSmsPart, Sim800OutgoingSmsStatus } from './sim800-outgoing-sms.interface';
import { Sim800DeliveryStatusDetail } from './sim-800-delivery.interface';

export interface Sim800EventEmitter {
  on(event: 'deviceReady', listener: () => void): EventEmitter;
  on(event: 'networkReady', listener: () => void): EventEmitter;
  on(event: 'input', listener: (data: string) => void): EventEmitter;
  on(event: 'incoming-sms', listener: (sms: Sim800IncomingSms) => void): EventEmitter;
  on(event: 'sms-sent', listener: (compositeId: number[]) => void): EventEmitter;
  on(
    event: 'delivery-report',
    listener: (
      compositeId: number[],
      status: Sim800OutgoingSmsStatus.Delivered,
      detail?: Omit<Sim800OutgoingSmsPart, 'belongsTo'>[],
    ) => void,
  ): EventEmitter;
  on(
    event: 'delivery-report',
    listener: (compositeId: number[], status: Sim800OutgoingSmsStatus, detail?: Sim800DeliveryStatusDetail) => void,
  ): EventEmitter;
  on(event: 'error', listener: (error: Error) => void): EventEmitter;
}
