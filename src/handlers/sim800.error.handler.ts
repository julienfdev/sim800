export const sim800ErrorHandler = (
  error: Error,
  logger: Pick<Console, 'log' | 'warn' | 'error'>,
) => {
  logger.error(error.message);
};
