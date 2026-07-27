import { db } from './_db';

const digits = (value: unknown) => String(value || '').replace(/\D/g, '');
const safe = (value: unknown) => String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));

async function sendEmail(booking: any, bookingId: string) {
  if (!process.env.RESEND_API_KEY) return { skipped: true, reason: 'RESEND_API_KEY missing' };
  const owner = process.env.BOOKING_EMAIL || 'bahadurtourstravels@gmail.com';
  const from = process.env.RESEND_FROM_EMAIL || 'Bahadur Bookings <bookings@example.com>';
  const rows = Object.entries(booking).map(([key, value]) => `<tr><td style="padding:8px;border-bottom:1px solid #ddd"><b>${safe(key)}</b></td><td style="padding:8px;border-bottom:1px solid #ddd">${safe(value)}</td></tr>`).join('');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [owner], reply_to: booking.email, subject: `New booking ${bookingId}: ${booking.trip}`, html: `<h1>New Bahadur booking request</h1><p>Reference: <b>${bookingId}</b></p><table style="border-collapse:collapse">${rows}</table>` }),
  });
  if (!response.ok) throw new Error(`Resend failed: ${await response.text()}`);
  if (process.env.SEND_CUSTOMER_EMAIL === 'true') {
    const customerResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [booking.email], subject: `We received your Bahadur Tours request ${bookingId}`, html: `<h2>Thank you, ${safe(booking.name)}.</h2><p>We received your request for <b>${safe(booking.trip)}</b>. Our team will confirm availability and pricing by WhatsApp.</p><p>Reference: ${bookingId}</p>` }),
    });
    if (!customerResponse.ok) throw new Error(`Customer email failed: ${await customerResponse.text()}`);
  }
  return { sent: true };
}

async function saveBooking(booking: any, bookingId: string) {
  const sql = db();
  const rows = await sql`insert into bookings(booking_id,name,phone,email,trip,travel_date,guests,city,note,status) values(${bookingId},${booking.name},${booking.phone},${booking.email},${booking.trip},${booking.date||null},${Number(booking.guests)||null},${booking.city||null},${booking.note||null},'New request') returning *`;
  return rows[0];
}

async function whatsappRequest(payload: any) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { skipped: true, reason: 'WhatsApp credentials missing' };
  const version = process.env.WHATSAPP_API_VERSION || 'v21.0';
  const endpoint = 'https:' + '//graph.facebook.com/' + version + '/' + phoneId + '/messages';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`WhatsApp failed: ${await response.text()}`);
  return response.json();
}

async function sendWhatsApp(booking: any, bookingId: string) {
  const admin = digits(process.env.WHATSAPP_ADMIN_NUMBER || '919187440916');
  const message = `New booking ${bookingId}\nName: ${booking.name}\nPhone: ${booking.phone}\nEmail: ${booking.email}\nTrip: ${booking.trip}\nDate: ${booking.date}\nGuests: ${booking.guests}\nFrom: ${booking.city || '-'}\nNotes: ${booking.note || '-'}`;
  const adminResult = await whatsappRequest({ messaging_product: 'whatsapp', recipient_type: 'individual', to: admin, type: 'text', text: { preview_url: false, body: message } });
  let customerResult: any = { skipped: true, reason: 'Approved template not configured' };
  const template = process.env.WHATSAPP_BOOKING_TEMPLATE;
  const customer = digits(booking.phone);
  if (template && customer) {
    customerResult = await whatsappRequest({ messaging_product: 'whatsapp', to: customer, type: 'template', template: { name: template, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en' }, components: [{ type: 'body', parameters: [{ type: 'text', text: booking.name }, { type: 'text', text: bookingId }, { type: 'text', text: booking.trip }] }] } });
  }
  return { admin: adminResult, customer: customerResult };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const input = req.body || {};
  const booking = { name: String(input.name || '').trim(), phone: String(input.phone || '').trim(), email: String(input.email || '').trim(), trip: String(input.trip || '').trim(), date: String(input.date || '').trim(), guests: String(input.guests || '').trim(), city: String(input.city || '').trim(), note: String(input.note || '').trim() };
  if (!booking.name || !booking.phone || !booking.email || !booking.trip || !booking.date) return res.status(400).json({ error: 'Name, WhatsApp, email, trip and date are required' });
  if (!/^\S+@\S+\.\S+$/.test(booking.email)) return res.status(400).json({ error: 'Enter a valid email address' });
  const bookingId = `BT${Date.now().toString().slice(-8)}`;
  const [storage, email, whatsapp] = await Promise.allSettled([saveBooking(booking, bookingId), sendEmail(booking, bookingId), sendWhatsApp(booking, bookingId)]);
  const integration = {
    storage: storage.status === 'fulfilled' ? storage.value : { error: String(storage.reason) },
    email: email.status === 'fulfilled' ? email.value : { error: String(email.reason) },
    whatsapp: whatsapp.status === 'fulfilled' ? whatsapp.value : { error: String(whatsapp.reason) },
  };
  console.log('Booking received', { bookingId, booking, integration });
  const fallbackText = `Hello Bahadur Tours, my booking reference is ${bookingId}. Trip: ${booking.trip}, date: ${booking.date}, guests: ${booking.guests}.`;
  return res.status(200).json({ ok: true, bookingId, integration, whatsappUrl: 'https:' + '//wa.me/919187440916?text=' + encodeURIComponent(fallbackText) });
}
