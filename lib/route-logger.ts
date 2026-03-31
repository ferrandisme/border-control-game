import 'server-only';

import { AxiomRequest, withAxiom } from 'next-axiom';

import { type AppLogger, getRequestLogger } from '@/lib/server-log';

export type LoggedRequest = Request & {
  log: AppLogger;
};

const attachLogger = (request: Request & { log?: AppLogger }): LoggedRequest => {
  return Object.assign(request, {
    log: getRequestLogger(request.log),
  });
};

export const withRouteLogger = (
  handler: (request: LoggedRequest) => Promise<Response>,
)=> {
  if (process.env.NODE_ENV === 'development') {
    return async (request: Request) => handler(attachLogger(request));
  }

  return withAxiom(async (request: AxiomRequest) => handler(attachLogger(request)));
};
