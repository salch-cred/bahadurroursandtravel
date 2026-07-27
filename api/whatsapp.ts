import { SYSTEM_PROMPT } from './chat';

// Helper to send WhatsApp messages using Meta Cloud API
async function sendWhatsAppMessage(to: string, text: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return;

  await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: text }
    })
  });
}

export default async function handler(req: any, res: any) {
  // ── GET: Webhook Verification for Meta ──────────────────────────────────
  if (req.method === 'GET') {
    const mode = req.query?.['hub.mode'];
    const token = req.query?.['hub.verify_token'];
    const challenge = req.query?.['hub.challenge'];
    
    // You set WHATSAPP_VERIFY_TOKEN in Vercel to match what you put in Meta Dashboard
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'bahadur_tours_verify';

    if (mode === 'subscribe' && token === verifyToken) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Verification failed' });
  }

  // ── POST: Receive message from WhatsApp ─────────────────────────────────
  if (req.method === 'POST') {
    try {
      const body = req.body;
      if (body.object !== 'whatsapp_business_account') return res.status(404).end();

      const entry = body.entry?.[0];
      const change = entry?.changes?.[0]?.value;
      if (!change?.messages?.[0]) return res.status(200).end(); // Not a message event

      const message = change.messages[0];
      const from = message.from; // Customer's phone number
      const text = message.text?.body;

      if (!text) return res.status(200).end();

      // Get Mistral API key
      if (!process.env.MISTRAL_API_KEY) {
        await sendWhatsAppMessage(from, 'Our AI assistant is temporarily unavailable. A human agent will be with you shortly.');
        return res.status(200).end();
      }

      // Query Mistral AI
      const mistralRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
          temperature: 0.3,
          max_tokens: 400,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT + '\n\nIMPORTANT: You are speaking directly to a user on WhatsApp.' },
            { role: 'user', content: text }
          ]
        }),
      });

      const data: any = await mistralRes.json();
      const reply = data?.choices?.[0]?.message?.content || 'I apologize, but I cannot process your request right now. Please call us directly.';

      // Send reply back to customer via WhatsApp
      await sendWhatsAppMessage(from, reply);

      return res.status(200).end();
    } catch (error) {
      console.error('WhatsApp webhook error:', error);
      return res.status(500).end();
    }
  }

  return res.status(405).end();
}
