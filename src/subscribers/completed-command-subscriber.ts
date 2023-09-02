import { Sim800Command } from 'classes';
import { LoggerLike } from 'interfaces';
import { Subject } from 'rxjs';

export const completedCommandSubscriberFactory =
  (command: Sim800Command, buffer: Sim800Command[], nextJob$: Subject<void>, logger?: LoggerLike) => (pid: number) => {
    setTimeout(() => {
      if (command.result) {
        logger?.verbose?.(`Command "${command.command}" with PID ${pid} has completed with result "${command.result}"`);
      }
      // we can remove the command from the buffer
      const commandIndex = buffer.findIndex((c) => c.pid === pid);
      if (commandIndex > -1) {
        buffer.splice(commandIndex, 1);
      }
      if (buffer.length) {
        logger?.verbose?.(`Executing next command "${buffer[0].command}" with PID ${buffer[0].pid}`);
        nextJob$.next();
      }
    }, 0);
  };
