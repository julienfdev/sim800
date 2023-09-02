export type LoggerLike = Pick<Console, 'log' | 'warn' | 'error'> & {
  verbose?: (message: string) => void;
  debug?: (message: string) => void;
};

export interface Sim800ClientConfig {
  port: string;
  pin?: string;
  baudRate?: number;
  delimiter?: string;
  logger?: LoggerLike;
  preventWipe?: boolean;
}
