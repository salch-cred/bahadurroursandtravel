import { db, requireAdmin, clean } from './_db.js';

function parseBase64(data: string) {
  return Buffer.from(data, 'base64');
}

export default async function handler(req: any, res: any) {
  const sql = db();
  const type = String(req.query?.type || '').trim();

  // ── REELS ──────────────────────────────────────────────────────
  if (type === 'reels') {
    try {
      await sql`CREATE TABLE IF NOT EXISTS reels (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), video_url TEXT NOT NULL, title TEXT, active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now())`;

      if (req.method === 'GET' && String(req.query?.admin || '') !== '1') {
        const rows = await sql`SELECT * FROM reels WHERE active = true ORDER BY created_at DESC`;
        return res.status(200).json({ reels: rows });
      }

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
        const rows = await sql`INSERT INTO reels (video_url, title, active) VALUES (${url}, ${title}, ${active}) RETURNING *`;
        return res.status(201).json({ reel: rows[0] });
      }

      const id = clean(req.query?.id, 80);
      if (!id) return res.status(400).json({ error: 'Reel ID is required' });

      if (req.method === 'PUT') {
        const active = req.body?.active === true;
        const rows = await sql`UPDATE reels SET active = ${active} WHERE id = ${id}::uuid RETURNING *`;
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

  // ── MEDIA (default) ────────────────────────────────────────────
  // GET: list all media (admin)
  if (req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    try {
      const status = clean(req.query?.status, 20);
      const rows = status && status !== 'all'
        ? await sql`select * from media where status = ${status} order by created_at desc limit 300`
        : await sql`select * from media order by created_at desc limit 300`;
      return res.status(200).json({ media: rows });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to fetch media' });
    }
  }

  // POST: upload one or more files
  if (req.method === 'POST') {
    const b = req.body || {};
    const isAdmin = (() => {
      try { return requireAdmin(req, { status: () => ({ json: () => {} }) } as any); } catch { return false; }
    })();

    if (!isAdmin && !b.consent) {
      return res.status(400).json({ error: 'Consent is required' });
    }

    const files: any[] = Array.isArray(b.files) ? b.files : (b.data ? [{ data: b.data, fileName: b.fileName, mimeType: b.mimeType }] : []);
    if (!files.length) return res.status(400).json({ error: 'No files provided' });

    const results: any[] = [];
    const errors: string[] = [];

    for (const f of files) {
      try {
        const buffer = parseBase64(String(f.data || ''));
        if (!buffer.length) { errors.push(`${f.fileName}: empty file`); continue; }
        const mimeType  = String(f.mimeType || 'image/jpeg');
        const isVideo   = mimeType.startsWith('video/');
        const dataUrl   = `data:${mimeType};base64,${f.data}`;
        const status    = isAdmin ? (b.status === 'approved' ? 'approved' : 'pending') : 'pending';

        const rows = await sql`
          insert into media (type, guest_name, trip, caption, status, consent, url, mime_type)
          values (${isVideo ? 'video' : 'photo'}, ${clean(b.guestName || b.guest_name || 'Guest', 120)}, ${clean(b.trip || '', 180)}, ${clean(b.caption || f.fileName || '', 500)}, ${status}, ${Boolean(b.consent || isAdmin)}, ${dataUrl}, ${clean(mimeType, 80)}) returning *
        `;
        results.push(rows[0]);
      } catch (e) {
        errors.push(`${f.fileName || 'file'}: ${e instanceof Error ? e.message : 'upload failed'}`);
      }
    }

    if (!results.length) return res.status(400).json({ error: errors.join('; ') || 'All uploads failed' });
    return res.status(201).json({ ok: true, uploaded: results.length, errors, items: results });
  }

  // PATCH: update status (admin only)
  if (req.method === 'PATCH') {
    if (!requireAdmin(req, res)) return;
    const id     = clean(req.query?.id, 80);
    const status = clean(req.body?.status, 20);
    if (!id || !status) return res.status(400).json({ error: 'id and status required' });
    try {
      await sql`update media set status = ${status} where id = ${id}::uuid`;
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'Update failed' });
    }
  }

  // DELETE (admin only)
  if (req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    const id = clean(req.query?.id, 80);
    if (!id) return res.status(400).json({ error: 'id required' });
    try {
      await sql`delete from media where id = ${id}::uuid`;
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'Delete failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
