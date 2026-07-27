import { db, requireAdmin } from './_db.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Use GET or POST to run migrations' });
  if (!requireAdmin(req, res)) return;
  try {
    const sql = db();

    // Create packages table
    await sql`
      CREATE TABLE IF NOT EXISTS packages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        region TEXT DEFAULT '',
        category TEXT DEFAULT 'domestic',
        duration TEXT DEFAULT '',
        price TEXT DEFAULT 'Custom quote',
        summary TEXT DEFAULT '',
        description TEXT DEFAULT '',
        image_url TEXT DEFAULT '',
        latitude FLOAT,
        longitude FLOAT,
        highlights JSONB DEFAULT '[]',
        itinerary JSONB DEFAULT '[]',
        included JSONB DEFAULT '[]',
        excluded JSONB DEFAULT '[]',
        gallery JSONB DEFAULT '[]',
        terms TEXT DEFAULT '',
        package_type TEXT DEFAULT 'domestic',
        flight_details JSONB DEFAULT '{}',
        room_details JSONB DEFAULT '{}',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Create bookings table
    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_ref TEXT UNIQUE NOT NULL DEFAULT 'BT' || to_char(now(),'YYMMDDHH24MISS') || floor(random()*900+100)::text,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT DEFAULT '',
        trip TEXT DEFAULT 'Custom journey',
        travel_date TEXT DEFAULT '',
        guests TEXT DEFAULT '2 guests',
        city TEXT DEFAULT '',
        note TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        source TEXT DEFAULT 'website',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Create reviews table (matches api/reviews.ts and api/community.ts column expectations)
    await sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        trip TEXT NOT NULL,
        rating INTEGER NOT NULL DEFAULT 5,
        booking_ref TEXT NOT NULL DEFAULT '',
        package_slug TEXT,
        text TEXT NOT NULL DEFAULT '',
        media_url TEXT,
        media_type TEXT,
        consent BOOLEAN NOT NULL DEFAULT false,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;
    // Repair any existing reviews table created with the older, mismatched schema
    // (name/location/trip/rating/body/photo/status) so it matches what
    // api/reviews.ts and api/community.ts actually query.
    await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS booking_ref TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS package_slug TEXT`;
    await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS text TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS media_url TEXT`;
    await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS media_type TEXT`;
    await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS consent BOOLEAN NOT NULL DEFAULT false`;

    // Create invoices table
    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number TEXT UNIQUE NOT NULL,
        invoice_date TEXT,
        due_date TEXT,
        booking_ref TEXT,
        customer_name TEXT NOT NULL,
        customer_address TEXT,
        phone TEXT,
        email TEXT,
        items JSONB DEFAULT '[]',
        tax_label TEXT DEFAULT 'GST',
        tax_rate NUMERIC DEFAULT 0,
        discount NUMERIC DEFAULT 0,
        subtotal NUMERIC DEFAULT 0,
        tax NUMERIC DEFAULT 0,
        total NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'Draft',
        notes TEXT,
        payment_details TEXT,
        travel_details JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Create blog posts table
    await sql`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        excerpt TEXT DEFAULT '',
        content TEXT NOT NULL,
        image_url TEXT DEFAULT '',
        author TEXT DEFAULT 'Bahadur Tours',
        category TEXT DEFAULT 'Travel Guide',
        status TEXT DEFAULT 'published',
        seo_title TEXT DEFAULT '',
        seo_desc TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Create page_views table
    await sql`
      CREATE TABLE IF NOT EXISTS page_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        visitor_hash TEXT NOT NULL,
        path TEXT DEFAULT '/',
        referrer TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Create media table
    await sql`
      CREATE TABLE IF NOT EXISTS media (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT DEFAULT 'photo',
        guest_name TEXT DEFAULT '',
        trip TEXT DEFAULT '',
        caption TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        consent BOOLEAN DEFAULT false,
        url TEXT NOT NULL,
        mime_type TEXT DEFAULT 'image/jpeg',
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Create customers table
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT DEFAULT '',
        city TEXT DEFAULT '',
        address TEXT DEFAULT '',
        note TEXT DEFAULT '',
        tags JSONB DEFAULT '[]',
        preferred_language TEXT DEFAULT 'English',
        total_bookings INTEGER DEFAULT 0,
        total_spent NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    return res.status(200).json({
      ok: true,
      message: 'All tables created/repaired successfully: packages, bookings, reviews (schema repaired), invoices, blog_posts, media, customers'
    });
  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Migration failed' });
  }
}
