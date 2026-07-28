import { put } from '@vercel/blob';

// Vercel processes multipart natively — no sizeLimit needed
export const config = { api: { bodyParser: false } };

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'Media storage not configured' });

  try {
    // Vercel makes the raw stream available in req
    // Use the content-type and filename from the multipart data
    const contentType = req.headers['content-type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Expected multipart/form-data' });
    }

    // Parse multipart using built-in formidable on Vercel
    const { IncomingForm } = await import('formidable');
    const form = new IncomingForm({ maxFileSize: 6 * 1024 * 1024 }); // 6MB formidable limit

    const [, files] = await new Promise<[any, any]>((resolve, reject) => {
      form.parse(req, (err: any, fields: any, files: any) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const fileEntry = files?.file;
    const file = Array.isArray(fileEntry) ? fileEntry[0] : fileEntry;
    if (!file) return res.status(400).json({ error: 'No file received' });

    const mimeType = file.mimetype || 'application/octet-stream';
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 
                     'video/mp4', 'video/webm', 'video/quicktime', 'video/mov', 'video/avi'];
    if (!allowed.includes(mimeType)) return res.status(400).json({ error: 'Unsupported file type' });

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) return res.status(400).json({ error: 'File must be under 5 MB' });

    const fs = await import('fs');
    const buffer = fs.readFileSync(file.filepath);

    const ext = mimeType.startsWith('video/') ? 'video' : 'image';
    const safeName = (file.originalFilename || 'upload').replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 80);
    const blob = await put(`reviews/${ext}/${Date.now()}-${safeName}`, buffer, {
      access: 'public',
      contentType: mimeType,
    });

    // Clean up temp file
    try { fs.unlinkSync(file.filepath); } catch {}

    return res.status(200).json({ url: blob.url, mimeType, type: ext });
  } catch (err: any) {
    console.error('upload-media error', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
