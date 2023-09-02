import { Sim800ClientConfig } from 'interfaces/sim800-client-config.interface';

export const sim800ErrorHandler = (error: Error, logger: Sim800ClientConfig['logger']) => {
  logger?.error(error.message);
};
