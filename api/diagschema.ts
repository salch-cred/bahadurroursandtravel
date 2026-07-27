import { db, requireAdmin } from './_db.js';

export default async function handler(req: any, res: any) {
  if (!requireAdmin(req, res)) return;
  try {
    const sql = db();
    const cols = await sql`select table_name, column_name, data_type from information_schema.columns where table_name in ('reviews','media','packages','bookings') order by table_name, ordinal_position`;
    return res.status(200).json({ columns: cols });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Diag failed' });
  }
}
