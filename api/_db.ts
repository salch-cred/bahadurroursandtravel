import { neon } from '@neondatabase/serverless';

export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  return neon(url);
}

export function requireAdmin(req: any, res: any) {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    res.status(503).json({ error: 'ADMIN_API_TOKEN is not configured' });
    return false;
  }
  const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const headerToken = String(req.headers['x-admin-token'] || '').trim();
  const supplied = auth || headerToken;
  if (!supplied || supplied !== expected) {
    res.status(401).json({ error: 'Unauthorised' });
    return false;
  }
  return true;
}

export const clean = (value: any, max = 1000) => String(value || '').trim().slice(0, max);

// Creates and repairs every table on the first request of each serverless instance,
// so a fresh deploy upgrades the database without anyone running SQL by hand.
let schemaReady: Promise<void> | null = null;

export function ensureSchema(sql: any) {
  if (!schemaReady) schemaReady = migrate(sql).catch((error) => { schemaReady = null; throw error; });
  return schemaReady;
}

async function migrate(sql: any) {
  await sql`CREATE TABLE IF NOT EXISTS packages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, region TEXT DEFAULT '', category TEXT DEFAULT 'domestic', duration TEXT DEFAULT '', price TEXT DEFAULT 'Custom quote', package_price NUMERIC, summary TEXT DEFAULT '', description TEXT DEFAULT '', image_url TEXT DEFAULT '', latitude FLOAT, longitude FLOAT, highlights JSONB DEFAULT '[]', itinerary JSONB DEFAULT '[]', included JSONB DEFAULT '[]', excluded JSONB DEFAULT '[]', gallery JSONB DEFAULT '[]', terms TEXT DEFAULT '', package_type TEXT DEFAULT 'domestic', flight_details JSONB DEFAULT '{}', room_details JSONB DEFAULT '{}', active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`;
  await sql`ALTER TABLE packages ADD COLUMN IF NOT EXISTS package_price NUMERIC`;
  await sql`ALTER TABLE packages ADD COLUMN IF NOT EXISTS faqs JSONB DEFAULT '[]'`;

  await sql`CREATE TABLE IF NOT EXISTS bookings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_ref TEXT UNIQUE, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT DEFAULT '', trip TEXT DEFAULT 'Custom journey', travel_date TEXT DEFAULT '', guests TEXT DEFAULT '2 guests', city TEXT DEFAULT '', note TEXT DEFAULT '', status TEXT DEFAULT 'pending', source TEXT DEFAULT 'website', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`;
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_ref TEXT`;
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website'`;
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()`;
  // Databases built from the older neon-schema.sql used booking_id and typed guests/date columns.
  await sql`DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='booking_id') THEN
      ALTER TABLE bookings ALTER COLUMN booking_id DROP NOT NULL;
      UPDATE bookings SET booking_ref = booking_id WHERE booking_ref IS NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='guests' AND data_type <> 'text') THEN
      ALTER TABLE bookings ALTER COLUMN guests TYPE TEXT USING guests::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='travel_date' AND data_type <> 'text') THEN
      ALTER TABLE bookings ALTER COLUMN travel_date TYPE TEXT USING travel_date::text;
    END IF;
  END $$`;

  await sql`CREATE TABLE IF NOT EXISTS reviews (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trip TEXT NOT NULL, rating INTEGER NOT NULL DEFAULT 5, booking_ref TEXT NOT NULL DEFAULT '', package_slug TEXT, text TEXT NOT NULL DEFAULT '', media_url TEXT, media_type TEXT, consent BOOLEAN NOT NULL DEFAULT false, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS blog_posts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, excerpt TEXT DEFAULT '', content TEXT NOT NULL, image_url TEXT DEFAULT '', author TEXT DEFAULT 'Bahadur Tours', category TEXT DEFAULT 'Travel Guide', status TEXT DEFAULT 'published', seo_title TEXT DEFAULT '', seo_desc TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS page_views (id BIGSERIAL PRIMARY KEY, visitor_hash TEXT NOT NULL, path TEXT DEFAULT '/', referrer TEXT, user_agent TEXT, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS media (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), type TEXT DEFAULT 'photo', guest_name TEXT DEFAULT '', trip TEXT DEFAULT '', caption TEXT DEFAULT '', status TEXT DEFAULT 'pending', consent BOOLEAN DEFAULT false, url TEXT NOT NULL, mime_type TEXT DEFAULT 'image/jpeg', created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS customers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT DEFAULT '', city TEXT DEFAULT '', address TEXT DEFAULT '', note TEXT DEFAULT '', tags JSONB DEFAULT '[]', preferred_language TEXT DEFAULT 'English', total_bookings INTEGER DEFAULT 0, total_spent NUMERIC DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`;

  await sql`CREATE TABLE IF NOT EXISTS invoices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_number TEXT UNIQUE NOT NULL, invoice_date TEXT, due_date TEXT, booking_ref TEXT, customer_name TEXT NOT NULL, customer_address TEXT, phone TEXT, email TEXT, items JSONB DEFAULT '[]', tax_label TEXT DEFAULT 'GST', tax_rate NUMERIC DEFAULT 0, discount NUMERIC DEFAULT 0, subtotal NUMERIC DEFAULT 0, tax NUMERIC DEFAULT 0, total NUMERIC DEFAULT 0, status TEXT DEFAULT 'Draft', notes TEXT, payment_details TEXT, pending_amount NUMERIC DEFAULT 0, multi_customers TEXT, kids_names TEXT, payment_remarks TEXT, travel_details JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pending_amount NUMERIC DEFAULT 0`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS multi_customers TEXT`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS kids_names TEXT`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_remarks TEXT`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS travel_details JSONB DEFAULT '{}'`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'invoice'`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_mode TEXT DEFAULT 'none'`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_gstin TEXT`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS place_of_supply TEXT`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC`;

  await sql`CREATE TABLE IF NOT EXISTS payments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, receipt_no TEXT UNIQUE NOT NULL, kind TEXT NOT NULL DEFAULT 'receipt', amount NUMERIC NOT NULL, paid_on DATE NOT NULL DEFAULT CURRENT_DATE, mode TEXT NOT NULL DEFAULT 'UPI', reference TEXT DEFAULT '', note TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE INDEX IF NOT EXISTS payments_invoice_idx ON payments(invoice_id)`;
  await sql`CREATE INDEX IF NOT EXISTS payments_date_idx ON payments(paid_on DESC)`;
  await sql`CREATE TABLE IF NOT EXISTS expenses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), spent_on DATE NOT NULL DEFAULT CURRENT_DATE, category TEXT NOT NULL DEFAULT 'Other', vendor TEXT DEFAULT '', description TEXT DEFAULT '', amount NUMERIC NOT NULL, mode TEXT DEFAULT 'UPI', booking_ref TEXT DEFAULT '', reference TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses(spent_on DESC)`;
  await sql`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT now())`;

  // Invoices from before the payment ledger only carried a status: give them an opening
  // ledger entry once, so paid and pending figures stay correct afterwards.
  await sql`INSERT INTO payments (invoice_id, receipt_no, amount, paid_on, mode, note)
    SELECT id, 'MIG-' || substr(id::text, 1, 8),
      CASE WHEN status = 'Paid' THEN total ELSE GREATEST(total - COALESCE(pending_amount, 0), 0) END,
      COALESCE(NULLIF(invoice_date::text, '')::date, created_at::date), 'Opening balance', 'Carried over from the previous billing system'
    FROM invoices
    WHERE paid_amount IS NULL AND status IN ('Paid', 'Part paid') AND total > 0
      AND (status = 'Paid' OR COALESCE(pending_amount, 0) > 0)
    ON CONFLICT (receipt_no) DO NOTHING`;
  await sql`UPDATE invoices i SET paid_amount = COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) WHERE paid_amount IS NULL`;
  await sql`UPDATE invoices SET pending_amount = GREATEST(total - paid_amount, 0) WHERE status NOT IN ('Cancelled')`;
}
