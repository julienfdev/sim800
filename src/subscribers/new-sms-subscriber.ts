import { LoggerLike } from 'interfaces';
import { CmgrCommand } from '../classes/cmgr-command';
import { Sim800Client } from '../sim800.client';
import { Deliver, parse } from 'node-pdu';
import { CmgdCommand } from '../classes/cmgd-command';

export const newSmsSubscriberFactory = (client: Sim800Client, logger: LoggerLike) => async (data: string) => {
  try {
    if (data.startsWith('+CMTI: "')) {
      // extract the storage from the +CMTI "XX" message
      const simIndex = parseInt(data.split(',')[1], 10);
      const result = (await client.send(new CmgrCommand(simIndex), { raw: true })) as string[];
      const sms = parse(result[1]);
      if (sms instanceof Deliver) {
        if (sms.getParts().every((part) => part.header === null)) {
          logger.verbose?.('incoming SMS is single part, emitting');
          client.eventEmitter.emit('incoming-sms', {
            number: sms.address.phone,
            text: sms.data.getText(),
            date: new Date(),
          });
        } else {
          // SMS is Multipart, should be only 1 part per sms though
          sms.getParts().forEach((part) => {
            if (part.header) {
              // we try to find an existing incoming SMS
              const header = part.header.toJSON();
              const existingRef = client.incomingSms.find((sms) => (sms.carrierId = header.POINTER || -1));
              if (existingRef) {
                existingRef.parts.push({
                  carrierIndex: header.CURRENT!,
                  simIndex,
                  text: part.text,
                });
                existingRef.text += part.text;
                // Complete detection
                if (existingRef.parts.length === existingRef.length) {
                  // EMIT INCOMING SMS, DELETE PARTS AND SPLICE THE BUFFER
                  client.eventEmitter.emit(
                    'incoming-sms',
                    { number: existingRef.number, text: existingRef.text, date: new Date() },
                    new Date(),
                  );
                  if (!client.preventWipe) {
                    existingRef.parts.forEach((part) => client.send(new CmgdCommand(part.simIndex)));
                  }
                  // deleting from buffer
                  client.incomingSms.splice(
                    client.incomingSms.findIndex((sms) => existingRef.carrierId === sms.carrierId),
                  );
                }
              } else {
                client.incomingSms.push({
                  carrierId: header.POINTER!,
                  length: header.SEGMENTS!,
                  number: sms.address.phone!,
                  text: part.text,
                  parts: [{ carrierIndex: header.CURRENT!, simIndex, text: part.text }],
                });
              }
            }
          });
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Incoming SMS Error: ${error.message}`);
    }
  }
};
