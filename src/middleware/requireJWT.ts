import { verifyAccessToken } from '../lib/jwt';

export const requireJWT = (ctx: any) => {
  const authHeader = ctx.request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.set.status = 401;
    return { error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.substring(7);
  const payload = verifyAccessToken(token);

  if (!payload) {
    ctx.set.status = 401;
    return { error: 'Invalid or expired token' };
  }

  // Mutate the parsed headers object that handlers receive via ctx.headers
  ctx.headers['x-nyrvana-user-id'] = payload.userId;
  ctx.headers['x-nyrvana-role'] = payload.role;
  return;
};
