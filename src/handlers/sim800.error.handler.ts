import { Sim800ClientConfig } from 'interfaces/sim800-client-config.interface';

export const sim800ErrorHandler = (error: Error, logger: Sim800ClientConfig['logger']) => {
  console.log('ERROR', error);
  logger?.error(error.message);
};
