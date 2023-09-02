import { Report, parse } from 'node-pdu';
import { LoggerLike } from '../interfaces';
import { Sim800DeliveryRawStatusMap, Sim800DeliveryStatusMap } from '../interfaces/sim-800-delivery.interface';
import { Sim800Client } from '../sim800.client';

export const deliveryReportInputSubscriberFactory = (client: Sim800Client, logger: LoggerLike) => (data: string) => {
  if (data.includes('+CDS:')) {
    client.receivingDeliveryReport = true;
    // This is the start of a delivery report, we need to monitor the next line
  } else if (client.receivingDeliveryReport) {
    client.receivingDeliveryReport = false;
    // This is the end of a delivery report, we need to parse the data
    const result = parse(data);

    if (result instanceof Report) {
      logger.debug?.(`Delivery report received for messageReference ${result.reference}`);
      client.deliveryReportStream$.next({
        date: new Date(result.dateTime.getIsoString()),
        messageReference: result.reference,
        status: Sim800DeliveryStatusMap[Sim800DeliveryRawStatusMap[result.status]],
        detail: Sim800DeliveryRawStatusMap[result.status],
      });
    }
  }
};
