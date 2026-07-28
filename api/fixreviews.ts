// One-time schema repair already applied on 2026-07-27 — see git history for details.
export default function handler(req: any, res: any) {
  return res.status(410).json({ error: 'Removed' });
}
