// Booking alerts by email (Resend) and WhatsApp (Meta Cloud API).
// A channel without its variables is skipped, and a provider failure never fails the booking.

const TIMEOUT_MS = 6000;

const esc = (value: any) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

// Meta rejects template values that are empty or contain line breaks, tabs or long runs of spaces
const templateValue = (value: any, fallback: string) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) || fallback;

function whatsappNumber(value: any) {
  const digits = String(value || '').replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length === 10) return '91' + digits;
  return digits.length >= 11 && digits.length <= 15 ? digits : '';
}

async function post(url: string, token: string, body: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
}

function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  return post('https://api.resend.com/emails', process.env.RESEND_API_KEY as string, {
    from: process.env.RESEND_FROM_EMAIL, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}),
  });
}

function sendWhatsApp(to: string, message: any) {
  const version = process.env.WHATSAPP_API_VERSION || 'v21.0';
  return post(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, process.env.WHATSAPP_ACCESS_TOKEN as string, { messaging_product: 'whatsapp', to, ...message });
}

function bookingTemplate(booking: any) {
  return {
    type: 'template',
    template: {
      name: process.env.WHATSAPP_BOOKING_TEMPLATE,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en' },
      components: [{
        type: 'body',
        parameters: [templateValue(booking.name, 'Guest'), templateValue(booking.booking_ref, 'New booking'), templateValue(booking.trip, 'Custom journey')].map((text) => ({ type: 'text', text })),
      }],
    },
  };
}

function ownerText(b: any) {
  return [
    `New booking ${b.booking_ref}`, '', `Name: ${b.name}`, `Phone: ${b.phone}`, `Email: ${b.email || '-'}`, `Journey: ${b.trip}`,
    `Travel date: ${b.travel_date || 'Flexible'}`, `Guests: ${b.guests || '-'}`, `From: ${b.city || '-'}`, ...(b.note ? [`Notes: ${b.note}`] : []),
  ].join('\n');
}

function ownerEmail(b: any) {
  const rows = [['Reference', b.booking_ref], ['Name', b.name], ['Phone', b.phone], ['Email', b.email || '-'], ['Journey', b.trip], ['Travel date', b.travel_date || 'Flexible'], ['Guests', b.guests || '-'], ['Starting city', b.city || '-'], ['Notes', b.note || '-']];
  return `<div style="font-family:Arial,sans-serif;color:#0c2740"><h2 style="color:#0369a1;margin:0 0 12px">New booking request</h2><table style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="padding:5px 16px 5px 0;color:#577087">${esc(k)}</td><td style="padding:5px 0;font-weight:600">${esc(v)}</td></tr>`).join('')}</table></div>`;
}

// The notes field is left out on purpose: this goes to an address typed into a public form.
function customerEmail(b: any) {
  return `<div style="font-family:Arial,sans-serif;color:#0c2740"><h2 style="color:#0369a1;margin:0 0 12px">We have your trip request</h2><p>Hello ${esc(b.name)},</p><p>Thank you for choosing Bahadur Tours and Travels. Your request for <strong>${esc(b.trip)}</strong> has reached our team, and we will reply within 2 hours.</p><p>Your reference is <strong>${esc(b.booking_ref)}</strong>.</p><p>This is a request, not yet a confirmed booking. Need us sooner? WhatsApp +91 91874 40916.</p></div>`;
}

function buildAlerts(booking: any) {
  const env = process.env;
  const alerts: [string, () => Promise<void>][] = [];
  if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
    if (env.BOOKING_EMAIL) {
      alerts.push(['owner email', () => sendEmail(env.BOOKING_EMAIL as string, `New booking ${booking.booking_ref}: ${String(booking.name).replace(/\s+/g, ' ')}`, ownerEmail(booking), booking.email || undefined)]);
    }
    if (env.SEND_CUSTOMER_EMAIL === 'true' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.email || '')) {
      alerts.push(['customer email', () => sendEmail(booking.email, `We have your trip request (${booking.booking_ref})`, customerEmail(booking))]);
    }
  }
  if (env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) {
    const admin = whatsappNumber(env.WHATSAPP_ADMIN_NUMBER), customer = whatsappNumber(booking.phone), template = env.WHATSAPP_BOOKING_TEMPLATE;
    // Plain text only arrives if the owner messaged this number in the last 24 hours, so an approved template comes first
    if (admin) alerts.push(['owner WhatsApp', () => sendWhatsApp(admin, template ? bookingTemplate(booking) : { type: 'text', text: { body: ownerText(booking) } })]);
    if (template && customer && customer !== admin) alerts.push(['customer WhatsApp', () => sendWhatsApp(customer, bookingTemplate(booking))]);
  }
  return alerts;
}

// Awaited before the API replies, because Vercel freezes a function once it has responded.
export async function notifyBooking(booking: any) {
  try {
    const alerts = buildAlerts(booking);
    const results = await Promise.allSettled(alerts.map(([, send]) => send()));
    results.forEach((result, i) => {
      if (result.status === 'rejected') console.error(`Booking alert failed (${alerts[i][0]}, ${booking.booking_ref}):`, result.reason instanceof Error ? result.reason.message : result.reason);
    });
  } catch (error) {
    console.error('Booking alerts failed:', error instanceof Error ? error.message : error);
  }
}
