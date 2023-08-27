import { Sim800EventHandlers } from 'interfaces/sim800.event-handlers.interface';
import { ReadlineParser, SerialPort } from 'serialport';

export const attachSerialListeners = (serial: SerialPort, parser: ReadlineParser, handlers: Sim800EventHandlers) => {
  serial.addListener('error', handlers.error);
  serial.on('open', handlers.open);
  parser.addListener('data', handlers.data);
};
