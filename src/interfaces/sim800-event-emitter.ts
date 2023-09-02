import { EventEmitter } from 'stream';
import { Sim800IncomingSms } from './sim800-incoming-sms.interface';

export interface Sim800EventEmitter {
  on(event: 'deviceReady', listener: () => void): EventEmitter;
  on(event: 'networkReady', listener: () => void): EventEmitter;
  on(event: 'input', listener: (data: string) => void): EventEmitter;
  on(event: 'incoming-sms', listener: (sms: Sim800IncomingSms) => void): EventEmitter;
}
