import { createHash, randomBytes, randomUUID } from 'node:crypto';

export function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createSessionToken(existingSessionId?: string): { sessionId: string; token: string } {
  const sessionId = existingSessionId ?? randomUUID();
  return { sessionId, token: `${sessionId}.${createOpaqueToken()}` };
}

export function parseSessionToken(token: string): { sessionId: string; tokenHash: string } | null {
  const separator = token.indexOf('.');
  if (separator <= 0 || separator === token.length - 1 || token.indexOf('.', separator + 1) !== -1) {
    return null;
  }

  const sessionId = token.slice(0, separator);
  const secret = token.slice(separator + 1);
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !/^[A-Za-z0-9_-]{43}$/.test(secret)) {
    return null;
  }

  return { sessionId, tokenHash: hashOpaqueToken(token) };
}
