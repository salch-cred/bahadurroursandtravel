// Diagnostic endpoints removed after one-time use — see git history
// (api/diagschema.ts, api/fixreviews.ts) for the reviews table schema repair
// performed on 2026-07-27.
export default function handler(req: any, res: any) {
  return res.status(410).json({ error: 'Removed' });
}
