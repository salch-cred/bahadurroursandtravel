import { db, requireAdmin } from './_db.js';

export default async function handler(req: any, res: any) {
  if (!requireAdmin(req, res)) return;
  try {
    const sql = db();
    // One-time repair: the live `reviews` table was created with an older schema
    // (body/location/photo) that no longer matches api/reviews.ts, api/community.ts,
    // or the review submission form on index.html (which post booking_ref, package_slug,
    // media_url, media_type, consent). Table has 0 rows, so this is a safe, lossless fix.
    await sql`ALTER TABLE reviews RENAME COLUMN body TO text`;
    await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS booking_ref TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS package_slug TEXT`;
    await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS media_url TEXT`;
    await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS media_type TEXT`;
    await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS consent BOOLEAN NOT NULL DEFAULT false`;
    await sql`ALTER TABLE reviews DROP COLUMN IF EXISTS location`;
    await sql`ALTER TABLE reviews DROP COLUMN IF EXISTS photo`;
    await sql`ALTER TABLE reviews ALTER COLUMN status SET DEFAULT 'pending'`;
    const cols = await sql`select column_name, data_type from information_schema.columns where table_name='reviews' order by ordinal_position`;
    return res.status(200).json({ ok: true, columns: cols });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Repair failed' });
  }
}
