import { db, requireAdmin, clean } from './_db.js';

export default async function handler(req: any, res: any) {
  if (!requireAdmin(req, res)) return;
  const sql = db();
  const type = String(req.query?.type || req.body?.type || '').trim();

  try {
    // ── CUSTOMERS ────────────────────────────────────────────────
    if (type === 'customers') {
      if (req.method === 'GET') {
        const id    = clean(req.query?.id,  80);
        const q     = clean(req.query?.q,  200);
        const limit = Math.min(Number(req.query?.limit || 50), 200);
        if (id) {
          const rows = await sql`select * from customers where id = ${id}::uuid limit 1`;
          return rows[0] ? res.status(200).json({ customer: rows[0] }) : res.status(404).json({ error: 'Customer not found' });
        }
        if (q) {
          const like = `%${q}%`;
          const rows = await sql`select * from customers where name ilike ${like} or phone ilike ${like} or email ilike ${like} or city ilike ${like} order by created_at desc limit ${limit}`;
          return res.status(200).json({ customers: rows });
        }
        const rows = await sql`select * from customers order by created_at desc limit ${limit}`;
        return res.status(200).json({ customers: rows });
      }
      if (req.method === 'POST') {
        const b = req.body || {};
        const name  = clean(b.name,  160);
        const phone = clean(b.phone,  80);
        if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });
        const rows = await sql`insert into customers (name, phone, email, city, address, note, tags, preferred_language, total_bookings, total_spent) values (${name}, ${phone}, ${clean(b.email, 200)}, ${clean(b.city, 160)}, ${clean(b.address, 500)}, ${clean(b.note, 1000)}, ${JSON.stringify(Array.isArray(b.tags) ? b.tags : [])}::jsonb, ${clean(b.preferred_language, 80) || 'English'}, 0, 0) returning *`;
        return res.status(201).json({ customer: rows[0] });
      }
      if (req.method === 'PUT') {
        const id = clean(req.query?.id, 80);
        if (!id) return res.status(400).json({ error: 'id required' });
        const b = req.body || {};
        const rows = await sql`update customers set name=${clean(b.name, 160)}, phone=${clean(b.phone, 80)}, email=${clean(b.email, 200)}, city=${clean(b.city, 160)}, address=${clean(b.address, 500)}, note=${clean(b.note, 1000)}, tags=${JSON.stringify(Array.isArray(b.tags) ? b.tags : [])}::jsonb, preferred_language=${clean(b.preferred_language, 80) || 'English'}, updated_at=now() where id=${id}::uuid returning *`;
        return rows[0] ? res.status(200).json({ customer: rows[0] }) : res.status(404).json({ error: 'Customer not found' });
      }
      if (req.method === 'DELETE') {
        const id = clean(req.query?.id, 80);
        if (!id) return res.status(400).json({ error: 'id required' });
        await sql`delete from customers where id = ${id}::uuid`;
        return res.status(200).json({ ok: true });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── MIGRATE ──────────────────────────────────────────────────
    if (type === 'migrate') {
      // Create packages table
      await sql`CREATE TABLE IF NOT EXISTS packages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, region TEXT DEFAULT '', category TEXT DEFAULT 'domestic', duration TEXT DEFAULT '', price TEXT DEFAULT 'Custom quote', package_price NUMERIC, summary TEXT DEFAULT '', description TEXT DEFAULT '', image_url TEXT DEFAULT '', latitude FLOAT, longitude FLOAT, highlights JSONB DEFAULT '[]', itinerary JSONB DEFAULT '[]', included JSONB DEFAULT '[]', excluded JSONB DEFAULT '[]', gallery JSONB DEFAULT '[]', terms TEXT DEFAULT '', package_type TEXT DEFAULT 'domestic', flight_details JSONB DEFAULT '{}', room_details JSONB DEFAULT '{}', active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`;
      await sql`ALTER TABLE packages ADD COLUMN IF NOT EXISTS package_price NUMERIC`;
      // Create bookings table
      await sql`CREATE TABLE IF NOT EXISTS bookings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_ref TEXT UNIQUE NOT NULL DEFAULT 'BT' || to_char(now(),'YYMMDDHH24MISS') || floor(random()*900+100)::text, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT DEFAULT '', trip TEXT DEFAULT 'Custom journey', travel_date TEXT DEFAULT '', guests TEXT DEFAULT '2 guests', city TEXT DEFAULT '', note TEXT DEFAULT '', status TEXT DEFAULT 'pending', source TEXT DEFAULT 'website', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`;
      // Create reviews table
      await sql`CREATE TABLE IF NOT EXISTS reviews (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trip TEXT NOT NULL, rating INTEGER NOT NULL DEFAULT 5, booking_ref TEXT NOT NULL DEFAULT '', package_slug TEXT, text TEXT NOT NULL DEFAULT '', media_url TEXT, media_type TEXT, consent BOOLEAN NOT NULL DEFAULT false, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT now())`;
      await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS booking_ref TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS package_slug TEXT`;
      await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS text TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS media_url TEXT`;
      await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS media_type TEXT`;
      await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS consent BOOLEAN NOT NULL DEFAULT false`;
      // Create invoices table
      await sql`CREATE TABLE IF NOT EXISTS invoices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_number TEXT UNIQUE NOT NULL, invoice_date TEXT, due_date TEXT, booking_ref TEXT, customer_name TEXT NOT NULL, customer_address TEXT, phone TEXT, email TEXT, items JSONB DEFAULT '[]', tax_label TEXT DEFAULT 'GST', tax_rate NUMERIC DEFAULT 0, discount NUMERIC DEFAULT 0, subtotal NUMERIC DEFAULT 0, tax NUMERIC DEFAULT 0, total NUMERIC DEFAULT 0, status TEXT DEFAULT 'Draft', notes TEXT, payment_details TEXT, travel_details JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`;
      // Create blog_posts table
      await sql`CREATE TABLE IF NOT EXISTS blog_posts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, excerpt TEXT DEFAULT '', content TEXT NOT NULL, image_url TEXT DEFAULT '', author TEXT DEFAULT 'Bahadur Tours', category TEXT DEFAULT 'Travel Guide', status TEXT DEFAULT 'published', seo_title TEXT DEFAULT '', seo_desc TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`;
      // Create page_views table
      await sql`CREATE TABLE IF NOT EXISTS page_views (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), visitor_hash TEXT NOT NULL, path TEXT DEFAULT '/', referrer TEXT, user_agent TEXT, created_at TIMESTAMPTZ DEFAULT now())`;
      // Create media table
      await sql`CREATE TABLE IF NOT EXISTS media (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), type TEXT DEFAULT 'photo', guest_name TEXT DEFAULT '', trip TEXT DEFAULT '', caption TEXT DEFAULT '', status TEXT DEFAULT 'pending', consent BOOLEAN DEFAULT false, url TEXT NOT NULL, mime_type TEXT DEFAULT 'image/jpeg', created_at TIMESTAMPTZ DEFAULT now())`;
      // Create customers table
      await sql`CREATE TABLE IF NOT EXISTS customers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT DEFAULT '', city TEXT DEFAULT '', address TEXT DEFAULT '', note TEXT DEFAULT '', tags JSONB DEFAULT '[]', preferred_language TEXT DEFAULT 'English', total_bookings INTEGER DEFAULT 0, total_spent NUMERIC DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`;
      return res.status(200).json({ ok: true, message: 'All tables created/repaired successfully' });
    }

    // ── SEED ─────────────────────────────────────────────────────
    if (type === 'seed') {
      const count = await sql`select count(*)::int as n from packages`;
      if (count[0]?.n > 0) return res.status(200).json({ ok: true, message: 'Database already seeded' });
      // Seed basic packages
      const pkgs = [
        { name: 'Island Escape', slug: 'island-escape', region: 'Lakshadweep', category: 'domestic', package_type: 'domestic', duration: '5 Days', summary: 'Discover the turquoise lagoons of Agatti Island.' },
        { name: 'Kashmir Valley in Bloom', slug: 'kashmir-valley-in-bloom', region: 'Kashmir', category: 'domestic', package_type: 'domestic', duration: '6 Days', summary: 'Lakes, alpine roads and mountain stays.' },
        { name: 'Umrah Journey', slug: 'umrah-journey', region: 'Saudi Arabia', category: 'pilgrimage', package_type: 'pilgrimage', duration: 'Flexible', summary: 'Guided support for Makkah and Madinah rituals.' },
      ];
      for (const p of pkgs) {
        await sql`insert into packages (name, slug, region, category, package_type, duration, summary) values (${p.name}, ${p.slug}, ${p.region}, ${p.category}, ${p.package_type}, ${p.duration}, ${p.summary}) on conflict do nothing`;
      }
      return res.status(200).json({ ok: true, message: 'Seeded ' + pkgs.length + ' packages' });
    }

    // ── GET single invoice by ID ──
    if (req.method === 'GET' && req.query?.id) {
      const rows = await sql`select * from invoices where id=${req.query.id} limit 1`;
      if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
      return res.status(200).json({ invoice: rows[0] });
    }

    // ── GET dashboard ──
    if (req.method === 'GET') {
      const [bookings, reviews, media, invoices, turnoverRows, visitorRows, traffic, monthlyRevenue] = await Promise.all([
        sql`select * from bookings order by created_at desc limit 500`,
        sql`select * from reviews order by created_at desc limit 200`,
        sql`select * from media order by created_at desc limit 200`,
        sql`select * from invoices order by created_at desc limit 500`,
        sql`select coalesce(sum(total) filter(where created_at>=now()-interval '24 hours'),0) as h24,coalesce(sum(total) filter(where created_at>=now()-interval '14 days'),0) as d14,coalesce(sum(total) filter(where created_at>=now()-interval '30 days'),0) as d30,coalesce(sum(total) filter(where created_at>=date_trunc('year',now())),0) as yearly from invoices where status in ('Paid','Part paid')`,
        sql`select count(distinct visitor_hash) filter(where created_at>=date_trunc('day',now())) as daily,count(distinct visitor_hash) filter(where created_at>=date_trunc('month',now())) as monthly,count(*) filter(where created_at>=date_trunc('day',now())) as views_daily,count(*) filter(where created_at>=date_trunc('month',now())) as views_monthly from page_views`,
        sql`with days as (select generate_series(current_date-13,current_date,'1 day')::date d) select d,coalesce(count(distinct visitor_hash),0)::int visitors from days left join page_views on page_views.created_at>=d and page_views.created_at<d+1 group by d order by d`,
        sql`with months as (select generate_series(date_trunc('month',current_date)-interval '11 months',date_trunc('month',current_date),'1 month') m) select m,coalesce(sum(total),0)::numeric revenue from months left join invoices on invoices.created_at>=m and invoices.created_at<m+interval '1 month' and invoices.status in ('Paid','Part paid') group by m order by m`,
      ]);
      const approved = reviews.filter((x: any) => x.status === 'approved');
      const turnover = turnoverRows[0] || {};
      const visitors = visitorRows[0] || {};
      const activity = [
        ...bookings.map((x: any) => ({ title: 'Booking received', detail: `${x.booking_id || x.booking_ref || ''} · ${x.trip}`, created_at: x.created_at })),
        ...reviews.map((x: any) => ({ title: 'Review submitted', detail: `${x.name} · ${x.status}`, created_at: x.created_at })),
        ...media.map((x: any) => ({ title: `Visitor ${x.type} uploaded`, detail: `${x.trip} · ${x.status}`, created_at: x.created_at })),
        ...invoices.map((x: any) => ({ title: 'Invoice saved', detail: `${x.invoice_number} · ${x.status}`, created_at: x.created_at })),
      ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 8);

      return res.status(200).json({
        metrics: {
          bookings: bookings.length,
          pending: bookings.filter((x: any) => !['Confirmed', 'Completed', 'Cancelled', 'confirmed', 'completed', 'cancelled'].includes(x.status)).length,
          rating: approved.length ? approved.reduce((s: number, x: any) => s + Number(x.rating), 0) / approved.length : 0,
          reviewCount: approved.length,
          turnover: { h24: Number(turnover.h24), d14: Number(turnover.d14), d30: Number(turnover.d30), yearly: Number(turnover.yearly) },
          visitors: { daily: Number(visitors.daily), monthly: Number(visitors.monthly), viewsDaily: Number(visitors.views_daily), viewsMonthly: Number(visitors.views_monthly) },
        },
        bookings, invoices, activity, traffic, monthlyRevenue,
      });
    }

    // ── CREATE invoice ──
    if (req.method === 'POST' && req.body?.type === 'invoice') {
      const i = req.body.invoice || {};
      const rows = await sql`insert into invoices(invoice_number, invoice_date, due_date, booking_ref, customer_name, customer_address, phone, email, items, tax_label, tax_rate, discount, subtotal, tax, total, status, notes, payment_details, travel_details) values (${i.invoice_number}, ${i.invoice_date || null}, ${i.due_date || null}, ${i.booking_ref || null}, ${i.customer_name}, ${i.customer_address || null}, ${i.phone || null}, ${i.email || null}, ${JSON.stringify(i.items || [])}::jsonb, ${i.tax_label || 'GST'}, ${i.tax_rate || 0}, ${i.discount || 0}, ${i.subtotal || 0}, ${i.tax || 0}, ${i.total || 0}, ${i.status || 'Draft'}, ${i.notes || null}, ${i.payment_details || null}, ${JSON.stringify(i.travel_details || {})}::jsonb) returning *`;
      return res.status(201).json({ ok: true, invoice: rows[0] });
    }

    // ── UPDATE invoice status (PATCH) ──
    if (req.method === 'PATCH' && req.body?.type === 'invoice_status') {
      const { id, status } = req.body;
      if (!id || !status) return res.status(400).json({ error: 'id and status required' });
      const rows = await sql`update invoices set status=${status} where id=${id} returning *`;
      if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
      return res.status(200).json({ ok: true, invoice: rows[0] });
    }

    // ── UPDATE full invoice (PUT) ──
    if (req.method === 'PUT' && req.body?.type === 'invoice') {
      const { id, invoice: i } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });
      const rows = await sql`update invoices set invoice_number=${i.invoice_number}, invoice_date=${i.invoice_date || null}, due_date=${i.due_date || null}, booking_ref=${i.booking_ref || null}, customer_name=${i.customer_name}, customer_address=${i.customer_address || null}, phone=${i.phone || null}, email=${i.email || null}, items=${JSON.stringify(i.items || [])}::jsonb, tax_label=${i.tax_label || 'GST'}, tax_rate=${i.tax_rate || 0}, discount=${i.discount || 0}, subtotal=${i.subtotal || 0}, tax=${i.tax || 0}, total=${i.total || 0}, status=${i.status || 'Draft'}, notes=${i.notes || null}, payment_details=${i.payment_details || null}, travel_details=${JSON.stringify(i.travel_details || {})}::jsonb where id=${id} returning *`;
      if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
      return res.status(200).json({ ok: true, invoice: rows[0] });
    }

    // ── DELETE invoice ──
    if (req.method === 'DELETE') {
      const id = String(req.query?.id || req.body?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Invoice id required' });
      const rows = await sql`delete from invoices where id=${id}::uuid returning id`;
      if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Admin request failed' });
  }
}
