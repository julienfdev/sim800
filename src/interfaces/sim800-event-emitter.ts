import { EventEmitter } from 'stream';

export interface Sim800EventEmitter {
  on(event: 'deviceReady', listener: () => void): EventEmitter;
  on(event: 'networkReady', listener: () => void): EventEmitter;
}
