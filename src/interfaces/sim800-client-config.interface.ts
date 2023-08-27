export interface Sim800ClientConfig {
  port: string;
  pin?: string;
  baudRate?: number;
  delimiter?: string;
  logger?: Pick<Console, 'log' | 'warn' | 'error'> & {
    verbose?: (message: string) => void;
    debug?: (message: string) => void;
  };
}
