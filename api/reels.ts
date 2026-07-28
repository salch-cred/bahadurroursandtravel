import { db, requireAdmin, clean } from './_db.js';

export default async function handler(req: any, res: any) {
  try {
    const sql = db();

    // Self-healing: create reels table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS reels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_url TEXT NOT NULL,
        title TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Public GET: Fetch all active reels
    if (req.method === 'GET' && String(req.query?.admin || '') !== '1') {
      const rows = await sql`SELECT * FROM reels WHERE active = true ORDER BY created_at DESC`;
      return res.status(200).json({ reels: rows });
    }

    // Admin protected routes
    if (!requireAdmin(req, res)) return;

    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM reels ORDER BY created_at DESC`;
      return res.status(200).json({ reels: rows });
    }

    if (req.method === 'POST') {
      const url = clean(req.body?.video_url, 1000);
      const title = clean(req.body?.title, 200);
      const active = req.body?.active !== false;
      
      if (!url) return res.status(400).json({ error: 'video_url is required' });

      const rows = await sql`
        INSERT INTO reels (video_url, title, active) 
        VALUES (${url}, ${title}, ${active}) 
        RETURNING *
      `;
      return res.status(201).json({ reel: rows[0] });
    }

    const id = clean(req.query?.id, 80);
    if (!id) return res.status(400).json({ error: 'Reel ID is required' });

    if (req.method === 'PUT') {
      const active = req.body?.active === true;
      const rows = await sql`
        UPDATE reels 
        SET active = ${active} 
        WHERE id = ${id}::uuid 
        RETURNING *
      `;
      return res.status(200).json({ reel: rows[0] });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM reels WHERE id = ${id}::uuid`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Reels request failed' });
  }
}
