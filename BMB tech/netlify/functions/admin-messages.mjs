import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

// GET /api/admin/messages with header: Authorization: Bearer <ADMIN_TOKEN>
export default async (req) => {
  const token = process.env.ADMIN_TOKEN || '';
  const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(given), b = Buffer.from(token);
  if (!token || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const store = getStore('messages');
  const { blobs } = await store.list();
  const items = (await Promise.all(blobs.map(x => store.get(x.key, { type: 'json' })))).filter(Boolean);
  items.sort((m, n) => n.createdAt.localeCompare(m.createdAt));
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
};

export const config = { path: '/api/admin/messages' };
