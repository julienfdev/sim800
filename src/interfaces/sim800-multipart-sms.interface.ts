export interface Sim800MultipartSmsPart {
  carrierIndex: number;
  simIndex: number;
  text: string;
}

export interface Sim800MultipartSms {
  carrierId: number;
  number: string;
  text: string;
  length: number;
  parts: Sim800MultipartSmsPart[];
}
