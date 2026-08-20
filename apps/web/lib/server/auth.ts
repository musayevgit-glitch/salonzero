import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt, type JwtPayload } from './jwt';

export function getTokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get('token')?.value ?? null;
}

export function verifyRequest(req: NextRequest): JwtPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    return verifyJwt(token);
  } catch {
    return null;
  }
}

export function unauthorized(message = 'Authentication required.'): NextResponse {
  return NextResponse.json({ message }, { status: 401 });
}

export function forbidden(message = 'Forbidden.'): NextResponse {
  return NextResponse.json({ message }, { status: 403 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ message }, { status: 400 });
}

export function notFound(message = 'Not found.'): NextResponse {
  return NextResponse.json({ message }, { status: 404 });
}

export function conflict(message: string): NextResponse {
  return NextResponse.json({ message }, { status: 409 });
}
