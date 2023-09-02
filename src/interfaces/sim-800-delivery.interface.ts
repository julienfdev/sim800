import { Sim800OutgoingSmsStatus } from './sim800-outgoing-sms.interface';

export enum Sim800DeliveryStatusDetail {
  Delivered = 'Short message received by the SME.',
  Unknown = 'Short message forwarded by the SC to the SME but the SC is unable to confirm delivery',
  Replaced = 'Short message replaced by the SC',
  Congestion = 'Congestion',
  SmeBusy = 'SME busy',
  NoResponse = 'No response from the SME',
  ServiceRejected = 'Service rejected',
  QualityOfServiceNotAvailable = 'Quality of service not available',
  ErrorInSme = 'Error in SME',
  RemoteProcedureError = 'Remote procedure error',
  IncompatibleDestination = 'Incompatible destination',
  ConnectionRejectedBySme = 'Connection rejected by SME',
  NotObtainable = 'Not obtainable',
  NoInterworkingAvailable = 'No interworking available',
  SMValidityPeriodExpired = 'SM validity period expired',
  SMDeletedByOriginatingSME = 'SM deleted by originating SME',
  SMDeletedBySCAdministration = 'SM deleted by SC administration',
  SMDoesNotExist = 'SM does not exist',
  PermanentCongestion = 'Permanent congestion',
  PernanentBusy = 'Permanent Busy',
  PermanentNoResponse = 'Permanent No response from the SME',
  PermanentServiceRejected = 'Permanent Service rejected',
  PermanentQualityOfServiceNotAvailable = 'Permanent Quality of service not available',
  PermanentErrorInSme = 'Permanent Error in SME',
}

export const Sim800DeliveryRawStatusMap: Record<number, Sim800DeliveryStatusDetail> = {
  [0]: Sim800DeliveryStatusDetail.Delivered,
  [1]: Sim800DeliveryStatusDetail.Unknown,
  [2]: Sim800DeliveryStatusDetail.Replaced,
  [32]: Sim800DeliveryStatusDetail.Congestion,
  [33]: Sim800DeliveryStatusDetail.SmeBusy,
  [34]: Sim800DeliveryStatusDetail.NoResponse,
  [35]: Sim800DeliveryStatusDetail.ServiceRejected,
  [36]: Sim800DeliveryStatusDetail.QualityOfServiceNotAvailable,
  [37]: Sim800DeliveryStatusDetail.ErrorInSme,
  [64]: Sim800DeliveryStatusDetail.RemoteProcedureError,
  [65]: Sim800DeliveryStatusDetail.IncompatibleDestination,
  [66]: Sim800DeliveryStatusDetail.ConnectionRejectedBySme,
  [67]: Sim800DeliveryStatusDetail.NotObtainable,
  [68]: Sim800DeliveryStatusDetail.PermanentQualityOfServiceNotAvailable,
  [69]: Sim800DeliveryStatusDetail.NoInterworkingAvailable,
  [70]: Sim800DeliveryStatusDetail.SMValidityPeriodExpired,
  [71]: Sim800DeliveryStatusDetail.SMDeletedByOriginatingSME,
  [72]: Sim800DeliveryStatusDetail.SMDeletedBySCAdministration,
  [73]: Sim800DeliveryStatusDetail.SMDoesNotExist,
  [96]: Sim800DeliveryStatusDetail.PermanentCongestion,
  [97]: Sim800DeliveryStatusDetail.PernanentBusy,
  [98]: Sim800DeliveryStatusDetail.PermanentNoResponse,
  [99]: Sim800DeliveryStatusDetail.PermanentServiceRejected,
  [100]: Sim800DeliveryStatusDetail.PermanentQualityOfServiceNotAvailable,
  [101]: Sim800DeliveryStatusDetail.PermanentErrorInSme,
};

export const Sim800DeliveryStatusMap: Record<Sim800DeliveryStatusDetail, Sim800OutgoingSmsStatus> = {
  [Sim800DeliveryStatusDetail.Delivered]: Sim800OutgoingSmsStatus.Delivered,
  [Sim800DeliveryStatusDetail.Unknown]: Sim800OutgoingSmsStatus.DeliveryUnknown,
  [Sim800DeliveryStatusDetail.Replaced]: Sim800OutgoingSmsStatus.DeliveryFailure,
  [Sim800DeliveryStatusDetail.Congestion]: Sim800OutgoingSmsStatus.DeliveryDelayed,
  [Sim800DeliveryStatusDetail.SmeBusy]: Sim800OutgoingSmsStatus.DeliveryDelayed,
  [Sim800DeliveryStatusDetail.NoResponse]: Sim800OutgoingSmsStatus.DeliveryDelayed,
  [Sim800DeliveryStatusDetail.ServiceRejected]: Sim800OutgoingSmsStatus.DeliveryDelayed,
  [Sim800DeliveryStatusDetail.QualityOfServiceNotAvailable]: Sim800OutgoingSmsStatus.DeliveryDelayed,
  [Sim800DeliveryStatusDetail.ErrorInSme]: Sim800OutgoingSmsStatus.DeliveryDelayed,
  [Sim800DeliveryStatusDetail.RemoteProcedureError]: Sim800OutgoingSmsStatus.DeliveryFailure,
  [Sim800DeliveryStatusDetail.IncompatibleDestination]: Sim800OutgoingSmsStatus.DeliveryFailure,
  [Sim800DeliveryStatusDetail.ConnectionRejectedBySme]: Sim800OutgoingSmsStatus.DeliveryFailure,
  [Sim800DeliveryStatusDetail.NotObtainable]: Sim800OutgoingSmsStatus.DeliveryFailure,
  [Sim800DeliveryStatusDetail.PermanentQualityOfServiceNotAvailable]: Sim800OutgoingSmsStatus.DeliveryFailure,
  [Sim800DeliveryStatusDetail.NoInterworkingAvailable]: Sim800OutgoingSmsStatus.DeliveryFailure,
  [Sim800DeliveryStatusDetail.SMValidityPeriodExpired]: Sim800OutgoingSmsStatus.DeliveryFailure,
  [Sim800DeliveryStatusDetail.SMDeletedByOriginatingSME]: Sim800OutgoingSmsStatus.DeliveryFailure,
  [Sim800DeliveryStatusDetail.SMDeletedBySCAdministration]: Sim800OutgoingSmsStatus.DeliveryFailure,
  [Sim800DeliveryStatusDetail.SMDoesNotExist]: Sim800OutgoingSmsStatus.DeliveryFailure,
  [Sim800DeliveryStatusDetail.PermanentCongestion]: Sim800OutgoingSmsStatus.DeliveryFailure,
  [Sim800DeliveryStatusDetail.PernanentBusy]: Sim800OutgoingSmsStatus.DeliveryFailure,
  [Sim800DeliveryStatusDetail.PermanentNoResponse]: Sim800OutgoingSmsStatus.DeliveryFailure,
  [Sim800DeliveryStatusDetail.PermanentServiceRejected]: Sim800OutgoingSmsStatus.DeliveryFailure,
  [Sim800DeliveryStatusDetail.PermanentErrorInSme]: Sim800OutgoingSmsStatus.DeliveryFailure,
};

export interface Sim800DeliveryEvent {
  messageReference: number;
  status: Sim800OutgoingSmsStatus;
  detail: Sim800DeliveryStatusDetail;
  date: Date;
}