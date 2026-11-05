import { db, requireAdmin, clean, ensureSchema } from './_db.js';

const num = (value: any) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const uuid = (value: any) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
const isoDate = (value: any, fallback: string | null = null) => {
  const text = clean(value, 30).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
};
const todayIST = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);

const DEFAULT_SETTINGS = {
  company_name: 'Bahadur Tours and Travels',
  address_line1: 'Smart City Building, Puttur Road',
  address_line2: '1358BA, Vitla, Karnataka 574243',
  phone: '+91 91874 40916',
  email: 'bahadurtourstravels@gmail.com',
  website: 'bahadurtours.com',
  gstin: '', pan: '', state: 'Karnataka', state_code: '29',
  bank_name: '', bank_account_name: '', bank_account: '', bank_ifsc: '', bank_branch: '', upi_id: '',
  invoice_prefix: 'BT', quote_prefix: 'QT', receipt_prefix: 'RCPT',
  default_sac: '998555', default_tax_mode: 'none', default_tax_rate: 0, due_days: 7,
  default_note: 'Services are subject to the confirmed itinerary and supplier terms.',
  terms: 'Services are confirmed only as stated in the final itinerary.\nAirline, hotel and cancellation rules apply to their respective services.\nQuote the invoice and booking references with every payment.',
  signatory: 'Authorised Signatory',
};

async function getSettings(sql: any) {
  const rows = await sql`select value from settings where key = 'company' limit 1`;
  return { ...DEFAULT_SETTINGS, ...(rows[0]?.value || {}) };
}

// Indian financial year label for a date, e.g. 2026-11-05 → 2026-27
function financialYear(date: string) {
  const [y, m] = date.split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

async function nextInvoiceNumber(sql: any, prefix: string, date: string) {
  const stem = `${prefix}/${financialYear(date)}/`;
  const rows = await sql`select coalesce(max(substring(invoice_number from '([0-9]+)$')::int), 0) as n from invoices where invoice_number like ${stem + '%'}`;
  return stem + String(Number(rows[0]?.n || 0) + 1).padStart(4, '0');
}

async function nextReceiptNumber(sql: any, prefix: string, date: string) {
  const stem = `${prefix}/${financialYear(date)}/`;
  const rows = await sql`select coalesce(max(substring(receipt_no from '([0-9]+)$')::int), 0) as n from payments where receipt_no like ${stem + '%'}`;
  return stem + String(Number(rows[0]?.n || 0) + 1).padStart(4, '0');
}

// Totals are always recomputed here so a saved invoice can never disagree with its lines.
function normaliseInvoice(input: any) {
  const items = (Array.isArray(input.items) ? input.items : [])
    .map((line: any) => {
      const qty = num(line.qty);
      const rate = num(line.rate ?? line.unit_price);
      return { description: clean(line.description, 400), sac: clean(line.sac, 20), qty, rate: round(rate), amount: round(qty * rate) };
    })
    .filter((line: any) => line.description || line.amount);
  const subtotal = round(items.reduce((sum: number, line: any) => sum + line.amount, 0));
  const discount = Math.min(round(Math.max(0, num(input.discount))), subtotal);
  const taxable = round(subtotal - discount);
  const tax_mode = ['cgst_sgst', 'igst'].includes(input.tax_mode) ? input.tax_mode : 'none';
  const tax_rate = tax_mode === 'none' ? 0 : Math.max(0, num(input.tax_rate));
  const tax = round(taxable * tax_rate / 100);
  return {
    doc_type: input.doc_type === 'quotation' ? 'quotation' : 'invoice',
    invoice_date: isoDate(input.invoice_date, todayIST()) as string,
    due_date: isoDate(input.due_date),
    booking_ref: clean(input.booking_ref, 80) || null,
    customer_name: clean(input.customer_name, 200),
    customer_address: clean(input.customer_address, 600) || null,
    customer_gstin: clean(input.customer_gstin, 20).toUpperCase() || null,
    place_of_supply: clean(input.place_of_supply, 80) || null,
    phone: clean(input.phone, 40) || null,
    email: clean(input.email, 200) || null,
    items, subtotal, discount, tax_mode, tax_rate, tax,
    tax_label: tax_mode === 'igst' ? 'IGST' : 'GST',
    total: round(taxable + tax),
    notes: clean(input.notes, 2000) || null,
    payment_details: clean(input.payment_details, 2000) || null,
    payment_remarks: clean(input.payment_remarks, 2000) || null,
    travel_details: input.travel_details && typeof input.travel_details === 'object' ? input.travel_details : {},
  };
}

// Paid, pending and status always come from the payment ledger.
async function refreshInvoice(sql: any, id: string, requested?: string) {
  const rows = await sql`select i.total, i.status, i.doc_type, coalesce((select sum(p.amount) from payments p where p.invoice_id = i.id), 0) as paid from invoices i where i.id = ${id}::uuid`;
  const row = rows[0];
  if (!row) return null;
  const total = num(row.total), paid = round(num(row.paid));
  let status = requested || row.status || 'Draft';
  if (status !== 'Cancelled' && row.doc_type !== 'quotation') {
    if (total > 0 && paid >= total) status = 'Paid';
    else if (paid > 0) status = 'Part paid';
    else if (status === 'Paid' || status === 'Part paid') status = 'Sent';
  }
  const updated = await sql`update invoices set paid_amount = ${paid}, pending_amount = ${Math.max(0, round(total - paid))}, status = ${status}, updated_at = now() where id = ${id}::uuid returning *`;
  return updated[0];
}

// Every billed customer is kept in the customer book; matched on phone first, then name.
async function upsertCustomer(sql: any, inv: any) {
  if (!inv.customer_name || !inv.phone) return;
  const found = await sql`select id from customers where phone = ${inv.phone} or lower(name) = lower(${inv.customer_name}) limit 1`;
  if (!found.length) {
    await sql`insert into customers (name, phone, email, address) values (${inv.customer_name}, ${inv.phone}, ${inv.email || ''}, ${inv.customer_address || ''})`;
  }
}

async function createPayment(sql: any, invoiceId: string, b: any, settings: any) {
  const paid_on = isoDate(b.paid_on, todayIST()) as string;
  const kind = b.kind === 'refund' ? 'refund' : 'receipt';
  const amount = round(Math.abs(num(b.amount))) * (kind === 'refund' ? -1 : 1);
  if (!amount) throw Object.assign(new Error('Enter an amount'), { statusCode: 400 });
  const receipt_no = await nextReceiptNumber(sql, kind === 'refund' ? 'RF' : settings.receipt_prefix, paid_on);
  const rows = await sql`insert into payments (invoice_id, receipt_no, kind, amount, paid_on, mode, reference, note) values (${invoiceId}::uuid, ${receipt_no}, ${kind}, ${amount}, ${paid_on}, ${clean(b.mode, 40) || 'UPI'}, ${clean(b.reference, 120)}, ${clean(b.note, 400)}) returning *`;
  return rows[0];
}

async function dashboard(sql: any) {
  const [bookings, reviews, media, invoices, totals, cash, visitorRows, traffic, monthly, overdue] = await Promise.all([
    sql`select * from bookings order by created_at desc limit 300`,
    sql`select id, name, trip, rating, status, created_at from reviews order by created_at desc limit 200`,
    sql`select id, type, trip, status, created_at from media order by created_at desc limit 100`,
    sql`select * from invoices order by created_at desc limit 100`,
    sql`select
        coalesce(sum(total) filter (where created_at >= date_trunc('year', now())), 0) as invoiced_year,
        coalesce(sum(total) filter (where created_at >= date_trunc('month', now())), 0) as invoiced_month,
        coalesce(sum(greatest(total - coalesce(paid_amount, 0), 0)), 0) as outstanding,
        count(*) filter (where status = 'Draft') as drafts
      from invoices where doc_type <> 'quotation' and status <> 'Cancelled'`,
    sql`select
        coalesce(sum(amount) filter (where created_at >= now() - interval '24 hours'), 0) as h24,
        coalesce(sum(amount) filter (where paid_on >= current_date - 14), 0) as d14,
        coalesce(sum(amount) filter (where paid_on >= current_date - 30), 0) as d30,
        coalesce(sum(amount) filter (where paid_on >= date_trunc('year', now())), 0) as yearly
      from payments`,
    sql`select count(distinct visitor_hash) filter (where created_at >= date_trunc('day', now())) as daily,
        count(distinct visitor_hash) filter (where created_at >= date_trunc('month', now())) as monthly,
        count(*) filter (where created_at >= date_trunc('day', now())) as views_daily,
        count(*) filter (where created_at >= date_trunc('month', now())) as views_monthly from page_views`,
    sql`with days as (select generate_series(current_date - 13, current_date, '1 day')::date d)
        select d, coalesce(count(distinct visitor_hash), 0)::int visitors from days left join page_views on page_views.created_at >= d and page_views.created_at < d + 1 group by d order by d`,
    sql`with months as (select generate_series(date_trunc('month', current_date) - interval '11 months', date_trunc('month', current_date), '1 month') m)
        select m,
          coalesce((select sum(total) from invoices i where i.created_at >= m and i.created_at < m + interval '1 month' and i.status <> 'Cancelled' and i.doc_type <> 'quotation'), 0)::numeric as invoiced,
          coalesce((select sum(amount) from payments p where p.paid_on >= m and p.paid_on < m + interval '1 month'), 0)::numeric as collected,
          coalesce((select sum(amount) from expenses e where e.spent_on >= m and e.spent_on < m + interval '1 month'), 0)::numeric as expenses
        from months order by m`,
    sql`select id, invoice_number, customer_name, phone, due_date, total, paid_amount from invoices
        where doc_type <> 'quotation' and status not in ('Draft', 'Cancelled', 'Paid') and total > coalesce(paid_amount, 0)
          and nullif(due_date::text, '')::date < current_date
        order by due_date asc limit 8`,
  ]);
  const expenseRows = await sql`select coalesce(sum(amount) filter (where spent_on >= date_trunc('month', now())), 0) as month from expenses`;
  const approved = reviews.filter((x: any) => x.status === 'approved');
  const visitors = visitorRows[0] || {};
  const activity = [
    ...bookings.slice(0, 20).map((x: any) => ({ title: 'Booking received', detail: `${x.booking_ref || ''} · ${x.name} · ${x.trip}`, created_at: x.created_at, icon: 'package' })),
    ...reviews.slice(0, 20).map((x: any) => ({ title: 'Review submitted', detail: `${x.name} · ${x.status}`, created_at: x.created_at, icon: 'star' })),
    ...media.slice(0, 20).map((x: any) => ({ title: `Guest ${x.type} uploaded`, detail: `${x.trip} · ${x.status}`, created_at: x.created_at, icon: 'image-01' })),
    ...invoices.slice(0, 20).map((x: any) => ({ title: 'Invoice updated', detail: `${x.invoice_number} · ${x.status}`, created_at: x.updated_at || x.created_at, icon: 'receipt-02' })),
  ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 10);

  return {
    metrics: {
      bookings: bookings.length,
      pending: bookings.filter((x: any) => !['confirmed', 'completed', 'cancelled'].includes(String(x.status).toLowerCase())).length,
      rating: approved.length ? approved.reduce((s: number, x: any) => s + Number(x.rating), 0) / approved.length : 0,
      reviewCount: approved.length,
      pendingReviews: reviews.filter((x: any) => x.status === 'pending').length,
      collected: { h24: num(cash[0].h24), d14: num(cash[0].d14), d30: num(cash[0].d30), yearly: num(cash[0].yearly) },
      invoicedYear: num(totals[0].invoiced_year), invoicedMonth: num(totals[0].invoiced_month),
      outstanding: num(totals[0].outstanding), drafts: num(totals[0].drafts),
      expensesMonth: num(expenseRows[0].month),
      visitors: { daily: num(visitors.daily), monthly: num(visitors.monthly), viewsDaily: num(visitors.views_daily), viewsMonthly: num(visitors.views_monthly) },
    },
    bookings: bookings.slice(0, 12), invoices: invoices.slice(0, 10), overdue, activity, traffic, monthly,
  };
}

async function reports(sql: any, from: string, to: string) {
  const [gst, aging, modes, profit, packages, expenseByCategory] = await Promise.all([
    sql`select to_char(coalesce(nullif(invoice_date::text, '')::date, created_at::date), 'YYYY-MM') as month,
        count(*)::int as invoices,
        coalesce(sum(subtotal - discount), 0) as taxable,
        coalesce(sum(tax) filter (where tax_mode = 'cgst_sgst'), 0) as cgst_sgst,
        coalesce(sum(tax) filter (where tax_mode = 'igst'), 0) as igst,
        coalesce(sum(tax), 0) as tax, coalesce(sum(total), 0) as total
      from invoices
      where doc_type <> 'quotation' and status not in ('Cancelled', 'Draft')
        and coalesce(nullif(invoice_date::text, '')::date, created_at::date) between ${from}::date and ${to}::date
      group by 1 order by 1 desc`,
    sql`select
        coalesce(sum(balance) filter (where age <= 0), 0) as current,
        coalesce(sum(balance) filter (where age between 1 and 30), 0) as d30,
        coalesce(sum(balance) filter (where age between 31 and 60), 0) as d60,
        coalesce(sum(balance) filter (where age between 61 and 90), 0) as d90,
        coalesce(sum(balance) filter (where age > 90), 0) as older
      from (select greatest(total - coalesce(paid_amount, 0), 0) as balance,
          current_date - coalesce(nullif(due_date::text, '')::date, nullif(invoice_date::text, '')::date, created_at::date) as age
        from invoices where doc_type <> 'quotation' and status not in ('Cancelled', 'Draft')) open_invoices where balance > 0`,
    sql`select mode, coalesce(sum(amount), 0) as amount, count(*)::int as count from payments where paid_on between ${from}::date and ${to}::date group by mode order by amount desc`,
    sql`with months as (select generate_series(date_trunc('month', ${from}::date), date_trunc('month', ${to}::date), '1 month') m)
        select to_char(m, 'YYYY-MM') as month,
          coalesce((select sum(subtotal - discount) from invoices i where date_trunc('month', coalesce(nullif(i.invoice_date::text, '')::date, i.created_at::date)) = m and i.doc_type <> 'quotation' and i.status not in ('Cancelled', 'Draft')), 0) as revenue,
          coalesce((select sum(amount) from payments p where date_trunc('month', p.paid_on) = m), 0) as collected,
          coalesce((select sum(amount) from expenses e where date_trunc('month', e.spent_on) = m), 0) as expenses
        from months order by m desc`,
    sql`select coalesce(nullif(travel_details->>'package_name', ''), 'Other') as package, count(*)::int as invoices, coalesce(sum(total), 0) as total
      from invoices where doc_type <> 'quotation' and status not in ('Cancelled', 'Draft')
        and coalesce(nullif(invoice_date::text, '')::date, created_at::date) between ${from}::date and ${to}::date
      group by 1 order by total desc limit 8`,
    sql`select category, coalesce(sum(amount), 0) as amount from expenses where spent_on between ${from}::date and ${to}::date group by category order by amount desc`,
  ]);
  return { from, to, gst, aging: aging[0], modes, profit, packages, expenseByCategory };
}

export default async function handler(req: any, res: any) {
  if (!requireAdmin(req, res)) return;
  const sql: any = db();
  const type = String(req.query?.type || req.body?.type || '').trim();
  const method = req.method;

  try {
    await ensureSchema(sql);

    // ── CUSTOMERS ────────────────────────────────────────────────
    if (type === 'customers') {
      if (method === 'GET') {
        const id = clean(req.query?.id, 80);
        if (id) {
          const rows = await sql`select * from customers where id = ${id}::uuid limit 1`;
          if (!rows[0]) return res.status(404).json({ error: 'Customer not found' });
          const c = rows[0];
          const invoices = await sql`select id, invoice_number, invoice_date, due_date, status, total, paid_amount, doc_type from invoices where (phone = ${c.phone} and phone <> '') or lower(customer_name) = lower(${c.name}) order by created_at desc limit 100`;
          const bookings = await sql`select booking_ref, trip, travel_date, status, created_at from bookings where phone = ${c.phone} or lower(name) = lower(${c.name}) order by created_at desc limit 50`;
          return res.status(200).json({ customer: c, invoices, bookings });
        }
        const q = clean(req.query?.q, 200);
        const limit = Math.min(Number(req.query?.limit || 200), 500);
        const like = `%${q}%`;
        const rows = await sql`
          select c.*, coalesce(s.invoices, 0) as invoice_count, coalesce(s.billed, 0) as billed, coalesce(s.paid, 0) as paid,
            (select count(*)::int from bookings b where b.phone = c.phone or lower(b.name) = lower(c.name)) as booking_count
          from customers c
          left join lateral (
            select count(*)::int as invoices, sum(i.total) as billed, sum(coalesce(i.paid_amount, 0)) as paid
            from invoices i
            where i.doc_type <> 'quotation' and i.status <> 'Cancelled'
              and ((i.phone = c.phone and c.phone <> '') or lower(i.customer_name) = lower(c.name))
          ) s on true
          where ${q} = '' or c.name ilike ${like} or c.phone ilike ${like} or c.email ilike ${like} or c.city ilike ${like}
          order by c.created_at desc limit ${limit}`;
        return res.status(200).json({ customers: rows });
      }
      if (method === 'POST') {
        const b = req.body || {};
        const name = clean(b.name, 160), phone = clean(b.phone, 80);
        if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });
        const rows = await sql`insert into customers (name, phone, email, city, address, note, tags, preferred_language) values (${name}, ${phone}, ${clean(b.email, 200)}, ${clean(b.city, 160)}, ${clean(b.address, 500)}, ${clean(b.note, 1000)}, ${JSON.stringify(Array.isArray(b.tags) ? b.tags : [])}::jsonb, ${clean(b.preferred_language, 80) || 'English'}) returning *`;
        return res.status(201).json({ customer: rows[0] });
      }
      if (method === 'PUT') {
        const id = clean(req.query?.id, 80), b = req.body || {};
        if (!id) return res.status(400).json({ error: 'id required' });
        const rows = await sql`update customers set name=${clean(b.name, 160)}, phone=${clean(b.phone, 80)}, email=${clean(b.email, 200)}, city=${clean(b.city, 160)}, address=${clean(b.address, 500)}, note=${clean(b.note, 1000)}, tags=${JSON.stringify(Array.isArray(b.tags) ? b.tags : [])}::jsonb, preferred_language=${clean(b.preferred_language, 80) || 'English'}, updated_at=now() where id=${id}::uuid returning *`;
        return rows[0] ? res.status(200).json({ customer: rows[0] }) : res.status(404).json({ error: 'Customer not found' });
      }
      if (method === 'DELETE') {
        const id = clean(req.query?.id, 80);
        if (!id) return res.status(400).json({ error: 'id required' });
        await sql`delete from customers where id = ${id}::uuid`;
        return res.status(200).json({ ok: true });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── SETTINGS ─────────────────────────────────────────────────
    if (type === 'settings') {
      if (method === 'GET') return res.status(200).json({ settings: await getSettings(sql) });
      if (method === 'PUT') {
        const merged: any = { ...(await getSettings(sql)) };
        for (const key of Object.keys(DEFAULT_SETTINGS)) {
          if (req.body?.settings?.[key] !== undefined) merged[key] = req.body.settings[key];
        }
        merged.default_tax_rate = num(merged.default_tax_rate);
        merged.due_days = Math.max(0, Math.round(num(merged.due_days)));
        await sql`insert into settings (key, value) values ('company', ${JSON.stringify(merged)}::jsonb) on conflict (key) do update set value = excluded.value, updated_at = now()`;
        return res.status(200).json({ settings: merged });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── NEXT DOCUMENT NUMBER ─────────────────────────────────────
    if (type === 'next_number') {
      const settings = await getSettings(sql);
      const prefix = req.query?.doc_type === 'quotation' ? settings.quote_prefix : settings.invoice_prefix;
      return res.status(200).json({ number: await nextInvoiceNumber(sql, prefix, isoDate(req.query?.date, todayIST()) as string) });
    }

    // ── BOOKING LOOKUP (prefills an invoice) ─────────────────────
    if (type === 'booking') {
      const ref = clean(req.query?.ref, 80);
      const rows = await sql`select * from bookings where booking_ref = ${ref} limit 1`;
      if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });
      const linked = await sql`select id, invoice_number, doc_type, status from invoices where booking_ref = ${ref} order by created_at desc limit 1`;
      return res.status(200).json({ booking: rows[0], invoice: linked[0] || null });
    }

    // ── INVOICE LIST ─────────────────────────────────────────────
    if (type === 'invoices' && method === 'GET') {
      const q = clean(req.query?.q, 120), like = `%${q}%`;
      const docType = req.query?.doc_type === 'quotation' ? 'quotation' : 'invoice';
      const rows = await sql`
        select id, invoice_number, invoice_date, due_date, booking_ref, customer_name, phone, email, doc_type, status, subtotal, discount, tax, total, paid_amount, pending_amount, travel_details->>'package_name' as package_name, created_at
        from invoices
        where doc_type = ${docType}
          and (${q} = '' or invoice_number ilike ${like} or customer_name ilike ${like} or phone ilike ${like} or coalesce(booking_ref, '') ilike ${like})
        order by created_at desc limit 500`;
      return res.status(200).json({ invoices: rows });
    }

    // ── PAYMENTS LEDGER ──────────────────────────────────────────
    if (type === 'payments') {
      if (method === 'GET') {
        const from = isoDate(req.query?.from, '2000-01-01'), to = isoDate(req.query?.to, '2100-01-01');
        const rows = await sql`select p.*, i.invoice_number, i.customer_name, i.phone from payments p join invoices i on i.id = p.invoice_id where p.paid_on between ${from}::date and ${to}::date order by p.paid_on desc, p.created_at desc limit 500`;
        return res.status(200).json({ payments: rows });
      }
      if (method === 'POST') {
        const b = req.body?.payment || {};
        if (!uuid(b.invoice_id)) return res.status(400).json({ error: 'Choose an invoice' });
        const invoiceRows = await sql`select doc_type, status from invoices where id = ${b.invoice_id}::uuid`;
        if (!invoiceRows[0]) return res.status(404).json({ error: 'Invoice not found' });
        if (invoiceRows[0].doc_type === 'quotation') return res.status(400).json({ error: 'Convert the quotation to an invoice before recording payment' });
        if (invoiceRows[0].status === 'Cancelled') return res.status(400).json({ error: 'This invoice is cancelled' });
        const payment = await createPayment(sql, b.invoice_id, b, await getSettings(sql));
        const invoice = await refreshInvoice(sql, b.invoice_id);
        return res.status(201).json({ ok: true, payment, invoice });
      }
      if (method === 'DELETE') {
        const id = clean(req.query?.id, 80);
        if (!uuid(id)) return res.status(400).json({ error: 'Payment id required' });
        const rows = await sql`delete from payments where id = ${id}::uuid returning invoice_id`;
        if (!rows[0]) return res.status(404).json({ error: 'Payment not found' });
        const invoice = await refreshInvoice(sql, rows[0].invoice_id);
        return res.status(200).json({ ok: true, invoice });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── SINGLE RECEIPT ───────────────────────────────────────────
    if (type === 'receipt' && method === 'GET') {
      const id = clean(req.query?.id, 80);
      if (!uuid(id)) return res.status(400).json({ error: 'Receipt id required' });
      const rows = await sql`select * from payments where id = ${id}::uuid limit 1`;
      if (!rows[0]) return res.status(404).json({ error: 'Receipt not found' });
      const invoice = await sql`select * from invoices where id = ${rows[0].invoice_id}::uuid limit 1`;
      return res.status(200).json({ payment: rows[0], invoice: invoice[0], settings: await getSettings(sql) });
    }

    // ── EXPENSES ─────────────────────────────────────────────────
    if (type === 'expenses') {
      if (method === 'GET') {
        const from = isoDate(req.query?.from, '2000-01-01'), to = isoDate(req.query?.to, '2100-01-01');
        const rows = await sql`select * from expenses where spent_on between ${from}::date and ${to}::date order by spent_on desc, created_at desc limit 500`;
        return res.status(200).json({ expenses: rows });
      }
      const b = req.body?.expense || {};
      if (method === 'POST' || method === 'PUT') {
        const amount = round(num(b.amount));
        if (amount <= 0) return res.status(400).json({ error: 'Enter the amount spent' });
        const spent_on = isoDate(b.spent_on, todayIST()), category = clean(b.category, 60) || 'Other';
        if (method === 'POST') {
          const rows = await sql`insert into expenses (spent_on, category, vendor, description, amount, mode, booking_ref, reference) values (${spent_on}, ${category}, ${clean(b.vendor, 160)}, ${clean(b.description, 400)}, ${amount}, ${clean(b.mode, 40) || 'UPI'}, ${clean(b.booking_ref, 80)}, ${clean(b.reference, 120)}) returning *`;
          return res.status(201).json({ ok: true, expense: rows[0] });
        }
        const id = clean(req.query?.id, 80);
        if (!uuid(id)) return res.status(400).json({ error: 'Expense id required' });
        const rows = await sql`update expenses set spent_on=${spent_on}, category=${category}, vendor=${clean(b.vendor, 160)}, description=${clean(b.description, 400)}, amount=${amount}, mode=${clean(b.mode, 40) || 'UPI'}, booking_ref=${clean(b.booking_ref, 80)}, reference=${clean(b.reference, 120)} where id=${id}::uuid returning *`;
        return rows[0] ? res.status(200).json({ ok: true, expense: rows[0] }) : res.status(404).json({ error: 'Expense not found' });
      }
      if (method === 'DELETE') {
        const id = clean(req.query?.id, 80);
        if (!uuid(id)) return res.status(400).json({ error: 'Expense id required' });
        await sql`delete from expenses where id = ${id}::uuid`;
        return res.status(200).json({ ok: true });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── REPORTS ──────────────────────────────────────────────────
    if (type === 'reports' && method === 'GET') {
      const today = todayIST();
      const fyStart = `${financialYear(today).slice(0, 4)}-04-01`;
      return res.status(200).json(await reports(sql, isoDate(req.query?.from, fyStart) as string, isoDate(req.query?.to, today) as string));
    }

    // ── MIGRATE ──────────────────────────────────────────────────
    if (type === 'migrate') return res.status(200).json({ ok: true, message: 'All tables created/repaired successfully' });

    // ── SINGLE INVOICE ───────────────────────────────────────────
    if (method === 'GET' && (type === 'invoice' || req.query?.id)) {
      const id = clean(req.query?.id, 120);
      const rows = uuid(id)
        ? await sql`select * from invoices where id = ${id}::uuid limit 1`
        : await sql`select * from invoices where invoice_number = ${id} limit 1`;
      if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
      const payments = await sql`select * from payments where invoice_id = ${rows[0].id}::uuid order by paid_on asc, created_at asc`;
      return res.status(200).json({ invoice: rows[0], payments, settings: await getSettings(sql) });
    }

    // ── DASHBOARD ────────────────────────────────────────────────
    if (method === 'GET') return res.status(200).json(await dashboard(sql));

    // ── CREATE INVOICE / QUOTATION ───────────────────────────────
    if (method === 'POST' && type === 'invoice') {
      const input = req.body.invoice || {};
      const inv = normaliseInvoice(input);
      if (!inv.customer_name) return res.status(400).json({ error: 'Customer name is required' });
      if (!inv.items.length) return res.status(400).json({ error: 'Add at least one charge' });
      const settings = await getSettings(sql);
      const prefix = inv.doc_type === 'quotation' ? settings.quote_prefix : settings.invoice_prefix;
      const invoice_number = input.auto_number || !clean(input.invoice_number, 80)
        ? await nextInvoiceNumber(sql, prefix, inv.invoice_date)
        : clean(input.invoice_number, 80);
      const status = ['Draft', 'Sent', 'Accepted', 'Cancelled'].includes(input.status) ? input.status : 'Draft';
      const rows = await sql`insert into invoices (invoice_number, doc_type, invoice_date, due_date, booking_ref, customer_name, customer_address, customer_gstin, place_of_supply, phone, email, items, tax_mode, tax_label, tax_rate, discount, subtotal, tax, total, status, notes, payment_details, payment_remarks, paid_amount, pending_amount, travel_details)
        values (${invoice_number}, ${inv.doc_type}, ${inv.invoice_date}, ${inv.due_date}, ${inv.booking_ref}, ${inv.customer_name}, ${inv.customer_address}, ${inv.customer_gstin}, ${inv.place_of_supply}, ${inv.phone}, ${inv.email}, ${JSON.stringify(inv.items)}::jsonb, ${inv.tax_mode}, ${inv.tax_label}, ${inv.tax_rate}, ${inv.discount}, ${inv.subtotal}, ${inv.tax}, ${inv.total}, ${status}, ${inv.notes}, ${inv.payment_details}, ${inv.payment_remarks}, 0, ${inv.total}, ${JSON.stringify(inv.travel_details)}::jsonb) returning *`;
      let invoice = rows[0];
      const advance = req.body.advance;
      if (advance && num(advance.amount) > 0 && inv.doc_type === 'invoice') {
        await createPayment(sql, invoice.id, advance, settings);
        invoice = await refreshInvoice(sql, invoice.id);
      }
      await upsertCustomer(sql, inv);
      const payments = await sql`select * from payments where invoice_id = ${invoice.id}::uuid order by paid_on asc, created_at asc`;
      return res.status(201).json({ ok: true, invoice, payments });
    }

    // ── UPDATE INVOICE ───────────────────────────────────────────
    if (method === 'PUT' && type === 'invoice') {
      const { id, invoice: input } = req.body;
      if (!uuid(id) || !input) return res.status(400).json({ error: 'id and invoice required' });
      const inv = normaliseInvoice(input);
      if (!inv.customer_name) return res.status(400).json({ error: 'Customer name is required' });
      if (!inv.items.length) return res.status(400).json({ error: 'Add at least one charge' });
      // Drafts made by website bookings join the proper numbered series on their first real save
      const typed = clean(input.invoice_number, 80);
      const invoice_number = /^INV-BT/.test(typed) ? await nextInvoiceNumber(sql, (await getSettings(sql)).invoice_prefix, inv.invoice_date) : typed;
      const rows = await sql`update invoices set invoice_number=${invoice_number}, doc_type=${inv.doc_type}, invoice_date=${inv.invoice_date}, due_date=${inv.due_date}, booking_ref=${inv.booking_ref}, customer_name=${inv.customer_name}, customer_address=${inv.customer_address}, customer_gstin=${inv.customer_gstin}, place_of_supply=${inv.place_of_supply}, phone=${inv.phone}, email=${inv.email}, items=${JSON.stringify(inv.items)}::jsonb, tax_mode=${inv.tax_mode}, tax_label=${inv.tax_label}, tax_rate=${inv.tax_rate}, discount=${inv.discount}, subtotal=${inv.subtotal}, tax=${inv.tax}, total=${inv.total}, notes=${inv.notes}, payment_details=${inv.payment_details}, payment_remarks=${inv.payment_remarks}, travel_details=${JSON.stringify(inv.travel_details)}::jsonb, updated_at=now() where id=${id}::uuid returning id`;
      if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
      const invoice = await refreshInvoice(sql, id, ['Draft', 'Sent', 'Accepted', 'Cancelled'].includes(input.status) ? input.status : undefined);
      await upsertCustomer(sql, inv);
      const payments = await sql`select * from payments where invoice_id = ${id}::uuid order by paid_on asc, created_at asc`;
      return res.status(200).json({ ok: true, invoice, payments });
    }

    // ── CHANGE INVOICE STATUS ────────────────────────────────────
    if (method === 'PATCH' && type === 'invoice_status') {
      const { id, status } = req.body;
      if (!uuid(id) || !['Draft', 'Sent', 'Accepted', 'Cancelled'].includes(status)) return res.status(400).json({ error: 'Valid id and status required' });
      const updated = await sql`update invoices set status = ${status}, updated_at = now() where id = ${id}::uuid returning id`;
      if (!updated.length) return res.status(404).json({ error: 'Invoice not found' });
      const invoice = status === 'Cancelled'
        ? (await sql`select * from invoices where id = ${id}::uuid`)[0]
        : await refreshInvoice(sql, id, status);
      return res.status(200).json({ ok: true, invoice });
    }

    // ── QUOTATION → INVOICE ──────────────────────────────────────
    if (method === 'POST' && type === 'convert_quotation') {
      const id = clean(req.body?.id, 80);
      if (!uuid(id)) return res.status(400).json({ error: 'Quotation id required' });
      const rows = await sql`select * from invoices where id = ${id}::uuid and doc_type = 'quotation'`;
      if (!rows[0]) return res.status(404).json({ error: 'Quotation not found' });
      const settings = await getSettings(sql);
      const today = todayIST();
      const invoice_number = await nextInvoiceNumber(sql, settings.invoice_prefix, today);
      const q = rows[0];
      const dueDate = new Date(Date.parse(today) + settings.due_days * 86400000).toISOString().slice(0, 10);
      const created = await sql`insert into invoices (invoice_number, doc_type, invoice_date, due_date, booking_ref, customer_name, customer_address, customer_gstin, place_of_supply, phone, email, items, tax_mode, tax_label, tax_rate, discount, subtotal, tax, total, status, notes, payment_details, payment_remarks, paid_amount, pending_amount, travel_details)
        values (${invoice_number}, 'invoice', ${today}, ${dueDate}, ${q.booking_ref}, ${q.customer_name}, ${q.customer_address}, ${q.customer_gstin}, ${q.place_of_supply}, ${q.phone}, ${q.email}, ${JSON.stringify(q.items)}::jsonb, ${q.tax_mode}, ${q.tax_label}, ${q.tax_rate}, ${q.discount}, ${q.subtotal}, ${q.tax}, ${q.total}, 'Draft', ${q.notes}, ${q.payment_details}, ${q.payment_remarks}, 0, ${q.total}, ${JSON.stringify(q.travel_details)}::jsonb) returning *`;
      await sql`update invoices set status = 'Accepted', updated_at = now() where id = ${id}::uuid`;
      return res.status(201).json({ ok: true, invoice: created[0] });
    }

    // ── DELETE INVOICE ───────────────────────────────────────────
    if (method === 'DELETE') {
      const id = String(req.query?.id || req.body?.id || '').trim();
      if (!uuid(id)) return res.status(400).json({ error: 'Invoice id required' });
      const paid = await sql`select count(*)::int as n from payments where invoice_id = ${id}::uuid`;
      if (paid[0].n > 0) return res.status(409).json({ error: 'This invoice has payments recorded. Cancel it instead, so your accounts stay correct.' });
      const rows = await sql`delete from invoices where id = ${id}::uuid returning id`;
      if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message });
    if (String(error?.message || '').includes('invoices_invoice_number_key')) {
      return res.status(409).json({ error: 'That invoice number is already used. Please choose another.' });
    }
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Admin request failed' });
  }
}
