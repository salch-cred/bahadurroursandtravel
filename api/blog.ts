import { db, requireAdmin, clean } from './_db.js';

export default async function handler(req: any, res: any) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const sql = db();

    // ── GET /api/blog — list all posts or get by slug ──────────────────────
    if (req.method === 'GET') {
      const slug = clean(req.query?.slug, 160);
      const admin = String(req.query?.admin || '') === '1';

      if (slug) {
        const rows = await sql`SELECT * FROM blog_posts WHERE slug=${slug} LIMIT 1`;
        return rows[0] ? res.status(200).json({ post: rows[0] }) : res.status(404).json({ error: 'Post not found' });
      }

      let rows;
      if (admin) {
        if (!requireAdmin(req, res)) return;
        rows = await sql`SELECT * FROM blog_posts ORDER BY created_at DESC`;
      } else {
        rows = await sql`SELECT * FROM blog_posts WHERE status='published' ORDER BY created_at DESC`;
      }
      return res.status(200).json({ posts: rows });
    }

    // ── Admin routes ─────────────────────────────────────────────────────────
    if (!requireAdmin(req, res)) return;

    if (req.method === 'POST') {
      const b = req.body || {};
      const title = clean(b.title, 200);
      let slug = clean(b.slug, 200).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (!title) return res.status(400).json({ error: 'Title is required' });
      if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const rows = await sql`
        INSERT INTO blog_posts (slug, title, excerpt, content, image_url, author, category, status, seo_title, seo_desc)
        VALUES (
          ${slug},
          ${title},
          ${clean(b.excerpt, 500)},
          ${clean(b.content, 20000)},
          ${clean(b.image_url, 1000)},
          ${clean(b.author || 'Bahadur Tours', 100)},
          ${clean(b.category || 'Travel Guide', 100)},
          ${clean(b.status || 'draft', 30)},
          ${clean(b.seo_title, 200)},
          ${clean(b.seo_desc, 500)}
        )
        RETURNING *
      `;
      return res.status(201).json({ ok: true, post: rows[0] });
    }

    const id = clean(req.query?.id, 80);
    if (!id) return res.status(400).json({ error: 'Post ID is required' });

    if (req.method === 'PUT') {
      const b = req.body || {};
      const title = clean(b.title, 200);
      let slug = clean(b.slug, 200).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (!title) return res.status(400).json({ error: 'Title is required' });
      if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const rows = await sql`
        UPDATE blog_posts
        SET slug = ${slug},
            title = ${title},
            excerpt = ${clean(b.excerpt, 500)},
            content = ${clean(b.content, 20000)},
            image_url = ${clean(b.image_url, 1000)},
            author = ${clean(b.author, 100)},
            category = ${clean(b.category, 100)},
            status = ${clean(b.status, 30)},
            seo_title = ${clean(b.seo_title, 200)},
            seo_desc = ${clean(b.seo_desc, 500)},
            updated_at = now()
        WHERE id = ${id}::uuid
        RETURNING *
      `;
      return res.status(200).json({ ok: true, post: rows[0] });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM blog_posts WHERE id = ${id}::uuid`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Blog API error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Blog request failed' });
  }
}
