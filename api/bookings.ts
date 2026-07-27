import { db, requireAdmin, clean } from './_db.js';

async function ensureTable(sql: any) {
  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_ref TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      trip TEXT DEFAULT 'Custom journey',
      travel_date TEXT DEFAULT '',
      guests TEXT DEFAULT '2 guests',
      city TEXT DEFAULT '',
      note TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      source TEXT DEFAULT 'website',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
}

export default async function handler(req: any, res: any) {
  // Allow CORS for same origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const sql = db();
    await ensureTable(sql);

    // ── POST /api/bookings — save a new customer booking ──────────────────
    if (req.method === 'POST') {
      const b = req.body || {};
      const name = clean(b.name, 200);
      const phone = clean(b.phone, 30);
      if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

      const ref = 'BT' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);

      const rows = await sql`
        INSERT INTO bookings (booking_ref, name, phone, email, trip, travel_date, guests, city, note, status, source)
        VALUES (
          ${ref},
          ${name},
          ${phone},
          ${clean(b.email, 200)},
          ${clean(b.trip || 'Custom journey', 300)},
          ${clean(b.date, 30)},
          ${clean(b.guests, 30)},
          ${clean(b.city, 100)},
          ${clean(b.note, 2000)},
          'pending',
          'website'
        )
        RETURNING *
      `;

      const booking = rows[0];

      // ── Auto-create a matching draft invoice ──────────────────────────────
      try {
        const invoiceNumber = 'INV-' + ref;
        await sql`
          INSERT INTO invoices (
            invoice_number, invoice_date, booking_ref,
            customer_name, phone, email,
            items, subtotal, tax_rate, tax, total,
            status, notes
          ) VALUES (
            ${invoiceNumber},
            ${new Date().toISOString().slice(0, 10)},
            ${ref},
            ${name},
            ${clean(b.phone, 30)},
            ${clean(b.email, 200)},
            ${JSON.stringify([{ description: clean(b.trip || 'Custom journey', 300), qty: Number(String(b.guests || '2').replace(/\D.*/,'')), unit_price: 0, total: 0 }])}::jsonb,
            0, 0, 0, 0,
            'Draft',
            ${clean(b.note, 2000)}
          )
          ON CONFLICT (invoice_number) DO NOTHING
        `;
      } catch (_) { /* invoice auto-save is best-effort */ }

      return res.status(201).json({
        ok: true,
        bookingId: ref,
        booking,
        message: `Booking ${ref} saved. Our team will contact you within 2 hours.`
      });
    }

    // ── GET /api/bookings — admin: list all bookings ───────────────────────
    if (req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      const status = clean(req.query?.status, 20);
      const search = clean(req.query?.search, 100);

      let rows;
      if (search) {
        rows = await sql`
          SELECT * FROM bookings
          WHERE name ILIKE ${'%' + search + '%'} OR phone ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'} OR trip ILIKE ${'%' + search + '%'}
          ORDER BY created_at DESC LIMIT 200
        `;
      } else if (status && status !== 'all') {
        rows = await sql`SELECT * FROM bookings WHERE status=${status} ORDER BY created_at DESC LIMIT 200`;
      } else {
        rows = await sql`SELECT * FROM bookings ORDER BY created_at DESC LIMIT 200`;
      }

      const stats = await sql`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status='pending') AS pending,
          COUNT(*) FILTER (WHERE status='confirmed') AS confirmed,
          COUNT(*) FILTER (WHERE status='cancelled') AS cancelled,
          COUNT(*) FILTER (WHERE created_at > now() - interval '30 days') AS this_month
        FROM bookings
      `;

      return res.status(200).json({ bookings: rows, stats: stats[0] });
    }

    // ── PUT /api/bookings?id=xxx — update status ───────────────────────────
    if (req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const id = clean(req.query?.id, 80);
      if (!id) return res.status(400).json({ error: 'Booking id required' });
      const { status, note } = req.body || {};
      const allowed = ['pending', 'confirmed', 'cancelled', 'completed'];
      if (status && !allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

      const rows = await sql`
        UPDATE bookings
        SET status = COALESCE(${status || null}, status),
            note = COALESCE(${note ? clean(note, 2000) : null}, note),
            updated_at = now()
        WHERE id = ${id}::uuid
        RETURNING *
      `;
      return res.status(200).json({ booking: rows[0] });
    }

    // ── DELETE /api/bookings?id=xxx ────────────────────────────────────────
    if (req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const id = clean(req.query?.id, 80);
      if (!id) return res.status(400).json({ error: 'Booking id required' });
      await sql`DELETE FROM bookings WHERE id = ${id}::uuid`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Bookings error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Booking request failed' });
  }
}
