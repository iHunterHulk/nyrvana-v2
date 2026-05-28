import { createHmac } from 'crypto';
import { getEnvVar } from '../lib/env';

export const requireUser = (context: any) => {
  const { request, set } = context;
  const userId = request.headers.get('x-nyrvana-user-id');
  const signature = request.headers.get('x-nyrvana-signature');
  
  if (!userId || !signature) {
    set.status = 401;
    return { error: 'Missing user authentication' };
  }
  
  // Verify signature
  const expectedSignature = createHmac('sha256', getEnvVar('NYRVANA_DEV_SECRET'))
    .update(userId)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    set.status = 401;
    return { error: 'Invalid signature' };
  }
  
  // User is authenticated, continue with request
  return;
};