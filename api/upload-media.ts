import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export const config = { api: { bodyParser: true } };

/**
 * This endpoint handles the two-phase client-side Vercel Blob upload:
 * 1. generateClientTokenFromReadWriteToken  — browser asks for a one-time signed URL
 * 2. onUploadCompleted                      — Vercel calls us back after the file lands in Blob
 *
 * Because the browser talks directly to Blob storage, we never hit Vercel's 4.5 MB
 * serverless body limit regardless of file size.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Media storage not configured' });
  }

  // Admin check for token generation phase
  const token =
    String(req.headers['x-admin-token'] || '').trim() ||
    String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();

  try {
    const body: HandleUploadBody = req.body;

    const jsonResponse = await handleUpload({
      body,
      request: req,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Validate admin token before issuing upload token
        // Token can come from the request header OR the clientPayload (for client-side uploads)
        const expected = process.env.ADMIN_API_TOKEN;
        if (expected) {
          let clientToken = '';
          try {
            const parsed = JSON.parse(clientPayload || '{}');
            clientToken = parsed.adminToken || '';
          } catch {}
          const effectiveToken = token || clientToken;
          if (!effectiveToken || effectiveToken !== expected) {
            throw new Error('Unauthorised');
          }
        }

        // Allow only safe media types
        const ext = pathname.split('.').pop()?.toLowerCase() || '';
        const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
        const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
        const allowed = [...videoExts, ...imageExts];

        if (!allowed.includes(ext)) {
          throw new Error(`File type .${ext} is not allowed`);
        }

        return {
          allowedContentTypes: [
            'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
            'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
          ],
          // No maximumSizeInBytes set — use Blob defaults (no cap on our side)
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Called by Vercel after file is uploaded to Blob
        console.log('Blob upload completed:', blob.url);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (err: any) {
    console.error('upload-media error', err);
    return res.status(400).json({ error: err.message || 'Upload failed' });
  }
}
