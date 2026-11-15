import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

const SERVICES = ['Website design & development', 'Graphic design & branding', 'Multimedia & video editing', 'Computer & IT support', 'CCTV & security systems', 'Networking services', 'Digital marketing', 'Software & application development', 'Additional services', 'Not sure yet'];
const env = k => process.env[k] || '';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function sendMail(e) {
  if (!env('SMTP_HOST') || !env('MAIL_TO')) return false;
  const port = Number(env('SMTP_PORT') || 587);
  const mailer = nodemailer.createTransport({
    host: env('SMTP_HOST'), port, secure: port === 465,
    auth: env('SMTP_USER') ? { user: env('SMTP_USER'), pass: env('SMTP_PASS') } : undefined
  });
  await mailer.sendMail({
    from: env('MAIL_FROM') || env('SMTP_USER'),
    to: env('MAIL_TO'),
    replyTo: e.email,
    subject: `New enquiry: ${e.service} (${e.name})`,
    text: `Name: ${e.name}\nEmail: ${e.email}\nService: ${e.service}\nBudget: ${e.budget}\n\n${e.message}`,
    html: `<p><b>Name:</b> ${esc(e.name)}<br><b>Email:</b> ${esc(e.email)}<br><b>Service:</b> ${esc(e.service)}<br><b>Budget:</b> ${esc(e.budget)}</p><p>${esc(e.message).replace(/\n/g, '<br>')}</p>`
  });
  return true;
}

// Optional automatic WhatsApp alert via the WhatsApp Business Cloud API (Meta)
async function notifyWhatsApp(e) {
  const to = env('WHATSAPP_TO').replace(/\D/g, '');
  if (!env('WHATSAPP_TOKEN') || !env('WHATSAPP_PHONE_ID') || !to) return false;
  const one = v => String(v).replace(/\s+/g, ' ').slice(0, 500);
  const tpl = env('WHATSAPP_TEMPLATE');
  const body = tpl
    ? { messaging_product: 'whatsapp', to, type: 'template', template: { name: tpl, language: { code: env('WHATSAPP_TEMPLATE_LANG') || 'en' },
        components: [{ type: 'body', parameters: [e.name, e.email, e.service, e.budget, e.message].map(v => ({ type: 'text', text: one(v) })) }] } }
    : { messaging_product: 'whatsapp', to, type: 'text',
        text: { body: `New enquiry\nName: ${e.name}\nEmail: ${e.email}\nService: ${e.service}\nBudget: ${e.budget}\n\n${e.message}` } };
  const r = await fetch(`https://graph.facebook.com/v20.0/${env('WHATSAPP_PHONE_ID')}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('WHATSAPP_TOKEN')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`WhatsApp ${r.status}: ${await r.text()}`);
  return true;
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let b;
  try { b = await req.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  if (!b || typeof b !== 'object') return json({ error: 'Invalid request.' }, 400);
  if (b.website) return json({ ok: true }); // honeypot: bots fill this in

  const name = clean(b.name, 100), email = clean(b.email, 150), message = clean(b.message, 3000);
  const service = SERVICES.includes(b.service) ? b.service : 'Not specified';
  const budget = clean(b.budget, 60) || 'Not specified';
  if (name.length < 2) return json({ error: 'Please enter your name.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Please enter a valid email address.' }, 400);
  if (message.length < 10) return json({ error: 'Please tell us a bit more (at least 10 characters).' }, 400);

  const entry = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), name, email, service, budget, message };
  const tasks = [
    getStore('messages').setJSON(`${entry.createdAt}_${entry.id}`, entry).then(() => true),
    sendMail(entry),
    notifyWhatsApp(entry)
  ];
  // Serverless functions stop after responding, so wait for everything to finish first
  const results = await Promise.allSettled(tasks);
  results.forEach((r, i) => { if (r.status === 'rejected') console.error(['Save', 'Email', 'WhatsApp'][i], 'failed:', r.reason?.message || r.reason); });
  const delivered = results.some(r => r.status === 'fulfilled' && r.value === true);
  if (!delivered) return json({ error: 'We could not send your message. Please try WhatsApp instead.' }, 500);
  return json({ ok: true });
};

export const config = { path: '/api/contact' };
