const SYSTEM_PROMPT = `You are Bahadur AI, the concise travel concierge for Bahadur Tours & Travels in India. Help guests choose among Lakshadweep, Kerala, Kashmir, Goa, Umrah, Ajmer Sharif, Tirupati, Dubai, Maldives, Thailand, scuba, water sports and Force Urbania rental. Ask for destination, dates, departure city, guest count, budget and preferences one or two at a time. Never invent availability, permit approval or final pricing. Say that a human travel specialist confirms the final itinerary. When the guest clearly wants to reserve, tell them to submit the secure booking form so the team receives email and WhatsApp notifications. Keep responses under 120 words.`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.MISTRAL_API_KEY) return res.status(503).json({ error: 'Mistral is not configured' });
  const raw = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = raw.slice(-10).map((item: any) => ({
    role: item?.role === 'assistant' ? 'assistant' : 'user',
    content: String(item?.content || '').slice(0, 1600),
  })).filter((item: any) => item.content);
  if (!messages.length) return res.status(400).json({ error: 'A message is required' });
  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.MISTRAL_MODEL || 'mistral-small-latest', temperature: 0.35, max_tokens: 350, messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages] }),
    });
    const data: any = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.message || 'Mistral request failed' });
    return res.status(200).json({ reply: data?.choices?.[0]?.message?.content || 'Please share your dates and number of guests.' });
  } catch (error) {
    console.error('Mistral error', error);
    return res.status(500).json({ error: 'The travel assistant is temporarily unavailable' });
  }
}
