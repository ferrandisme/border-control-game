import { NextResponse } from 'next/server';
import { withAxiom } from 'next-axiom';

const baseMiddleware = () => {
  return NextResponse.next();
};

export const middleware = process.env.NODE_ENV === 'development'
  ? baseMiddleware
  : withAxiom(baseMiddleware);
