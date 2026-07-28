import { neon } from '@neondatabase/serverless';

export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  return neon(url);
}

export function requireAdmin(req: any, res: any) {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    res.status(503).json({ error: 'ADMIN_API_TOKEN is not configured' });
    return false;
  }
  const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const headerToken = String(req.headers['x-admin-token'] || '').trim();
  const supplied = auth || headerToken;
  if (!supplied || supplied !== expected) {
    res.status(401).json({ error: 'Unauthorised' });
    return false;
  }
  return true;
}

export const clean = (value: any, max = 1000) => String(value || '').trim().slice(0, max);
