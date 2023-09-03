import { Sim800OutgoingSmsStatus } from '../interfaces/sim800-outgoing-sms.interface';
import { LoggerLike } from '../interfaces';
import { Sim800DeliveryEvent } from '../interfaces/sim-800-delivery.interface';
import { Sim800Client } from '../sim800.client';

export const deliveryReportStreamSubscriberFactory =
  (client: Sim800Client, logger: LoggerLike) => (event: Sim800DeliveryEvent) => {
    // trying to find the message in the queue
    const existingSms = client.outboxSpooler.find((sms) =>
      sms.parts.some((part) => part.messageReference === event.messageReference),
    );
    if (existingSms) {
      // we know this part exists, as the first find() would have returned false otherwise
      const part = existingSms.parts.find((part) => part.messageReference === event.messageReference)!;
      part.status = event.status;
      part.detail = event.detail;
      if (event.status === Sim800OutgoingSmsStatus.Delivered) {
        part.deliveryDate = new Date();
      }
      // If this is not delivered, we can update the global message status
      if (event.status !== Sim800OutgoingSmsStatus.Delivered) {
        existingSms.status = event.status;
        logger.verbose?.(
          `SMS ${existingSms.parts.map((existingPart) => existingPart.messageReference)} is now "${
            existingSms.status
          }", details : ${existingSms.parts.map(
            (existingPart) => `- Part: ${existingPart.messageReference} - ${existingPart.detail} -`,
          )}`,
        );
        client.eventEmitter.emit(
          'delivery-report',
          existingSms.parts.map((existingPart) => existingPart.messageReference),
          existingSms.status,
          event.detail,
        );
      }
      // If all parts are delivered, we can update the global message status
      if (existingSms.parts.every((part) => part.status === Sim800OutgoingSmsStatus.Delivered)) {
        existingSms.status = Sim800OutgoingSmsStatus.Delivered;
        logger.verbose?.(
          `SMS ${existingSms.parts.map((existingPart) => existingPart.messageReference)} is now "Delivered"`,
        );
        client.eventEmitter.emit(
          'delivery-report',
          existingSms.parts.map((existingPart) => existingPart.messageReference),
          existingSms.status,
          existingSms.parts.map((existingPart) => ({
            messageReference: existingPart.messageReference,
            status: existingPart.status,
            detail: existingPart.detail,
            ...(existingPart.deliveryDate ? { deliveryDate: existingPart.deliveryDate } : {}),
          })),
        );
      }
    }
  };
