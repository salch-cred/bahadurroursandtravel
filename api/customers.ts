import { db, requireAdmin, clean } from './_db.js';

export default async function handler(req: any, res: any) {
  try {
    const sql = db();
    if (!requireAdmin(req, res)) return;

    /* ── GET  list or single ─────────────────────────────────────── */
    if (req.method === 'GET') {
      const id    = clean(req.query?.id,  80);
      const q     = clean(req.query?.q,  200);
      const limit = Math.min(Number(req.query?.limit || 50), 200);

      if (id) {
        const rows = await sql`select * from customers where id = ${id}::uuid limit 1`;
        return rows[0]
          ? res.status(200).json({ customer: rows[0] })
          : res.status(404).json({ error: 'Customer not found' });
      }

      if (q) {
        const like = `%${q}%`;
        const rows = await sql`
          select * from customers
          where name ilike ${like}
             or phone ilike ${like}
             or email ilike ${like}
             or city ilike ${like}
          order by created_at desc
          limit ${limit}
        `;
        return res.status(200).json({ customers: rows });
      }

      const rows = await sql`select * from customers order by created_at desc limit ${limit}`;
      return res.status(200).json({ customers: rows });
    }

    /* ── POST  create ────────────────────────────────────────────── */
    if (req.method === 'POST') {
      const b = req.body || {};
      const name  = clean(b.name,  160);
      const phone = clean(b.phone,  80);
      if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

      const rows = await sql`
        insert into customers
          (name, phone, email, city, address, note, tags, preferred_language, total_bookings, total_spent)
        values
          (${name},
           ${phone},
           ${clean(b.email, 200)},
           ${clean(b.city, 160)},
           ${clean(b.address, 500)},
           ${clean(b.note, 1000)},
           ${JSON.stringify(Array.isArray(b.tags) ? b.tags : [])}::jsonb,
           ${clean(b.preferred_language, 80) || 'English'},
           0, 0)
        returning *
      `;
      return res.status(201).json({ customer: rows[0] });
    }

    /* ── PUT  update ─────────────────────────────────────────────── */
    if (req.method === 'PUT') {
      const id = clean(req.query?.id, 80);
      if (!id) return res.status(400).json({ error: 'id required' });
      const b = req.body || {};
      const rows = await sql`
        update customers set
          name               = ${clean(b.name,  160)},
          phone              = ${clean(b.phone,  80)},
          email              = ${clean(b.email, 200)},
          city               = ${clean(b.city,  160)},
          address            = ${clean(b.address, 500)},
          note               = ${clean(b.note, 1000)},
          tags               = ${JSON.stringify(Array.isArray(b.tags) ? b.tags : [])}::jsonb,
          preferred_language = ${clean(b.preferred_language, 80) || 'English'},
          updated_at         = now()
        where id = ${id}::uuid
        returning *
      `;
      return rows[0]
        ? res.status(200).json({ customer: rows[0] })
        : res.status(404).json({ error: 'Customer not found' });
    }

    /* ── DELETE ──────────────────────────────────────────────────── */
    if (req.method === 'DELETE') {
      const id = clean(req.query?.id, 80);
      if (!id) return res.status(400).json({ error: 'id required' });
      await sql`delete from customers where id = ${id}::uuid`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Customer request failed' });
  }
}
