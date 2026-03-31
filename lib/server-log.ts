import 'server-only';

import { Logger } from 'next-axiom';

type LogLevel = 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

export type AppLogger = Pick<Logger, 'info' | 'warn' | 'error'>;

const shouldEmitInfoLogs = (): boolean => process.env.NODE_ENV !== 'development';

const writeConsoleLog = (level: LogLevel, message: string, context?: LogContext): void => {
  if (level === 'info' && !shouldEmitInfoLogs()) {
    return;
  }

  const method = level === 'info'
    ? console.info
    : level === 'warn'
      ? console.warn
      : console.error;

  if (context && Object.keys(context).length > 0) {
    method(message, context);
    return;
  }

  method(message);
};

export const getRequestLogger = (logger?: AppLogger | Logger | null): AppLogger => {
  if (logger) {
    return logger;
  }

  return {
    info: (message: string, context?: LogContext) => writeConsoleLog('info', message, context),
    warn: (message: string, context?: LogContext) => writeConsoleLog('warn', message, context),
    error: (message: string, context?: LogContext) => writeConsoleLog('error', message, context),
  };
};
