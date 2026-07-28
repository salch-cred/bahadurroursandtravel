import { db, requireAdmin } from './_db.js';

export default async function handler(req: any, res: any) {
  if (!requireAdmin(req, res)) return;
  const sql = db();
  try {
    /* ── GET single invoice by ID ── */
    if (req.method === 'GET' && req.query?.id) {
      const rows = await sql`select * from invoices where id=${req.query.id} limit 1`;
      if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
      return res.status(200).json({ invoice: rows[0] });
    }

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
      ]
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .slice(0, 8);

      return res.status(200).json({
        metrics: {
          bookings: bookings.length,
          pending: bookings.filter((x: any) => !['Confirmed', 'Completed', 'Cancelled', 'confirmed', 'completed', 'cancelled'].includes(x.status)).length,
          rating: approved.length ? approved.reduce((s: number, x: any) => s + Number(x.rating), 0) / approved.length : 0,
          reviewCount: approved.length,
          turnover: { h24: Number(turnover.h24), d14: Number(turnover.d14), d30: Number(turnover.d30), yearly: Number(turnover.yearly) },
          visitors: {
            daily: Number(visitors.daily),
            monthly: Number(visitors.monthly),
            viewsDaily: Number(visitors.views_daily),
            viewsMonthly: Number(visitors.views_monthly),
          },
        },
        bookings,
        invoices,
        activity,
        traffic,
        monthlyRevenue,
      });
    }

    /* ── CREATE invoice ── */
    if (req.method === 'POST' && req.body?.type === 'invoice') {
      const i = req.body.invoice || {};
      const rows = await sql`
        insert into invoices(
          invoice_number, invoice_date, due_date, booking_ref, customer_name, customer_address,
          phone, email, items, tax_label, tax_rate, discount, subtotal, tax, total, status, notes,
          payment_details, travel_details
        ) values (
          ${i.invoice_number},
          ${i.invoice_date || null},
          ${i.due_date || null},
          ${i.booking_ref || null},
          ${i.customer_name},
          ${i.customer_address || null},
          ${i.phone || null},
          ${i.email || null},
          ${JSON.stringify(i.items || [])}::jsonb,
          ${i.tax_label || 'GST'},
          ${i.tax_rate || 0},
          ${i.discount || 0},
          ${i.subtotal || 0},
          ${i.tax || 0},
          ${i.total || 0},
          ${i.status || 'Draft'},
          ${i.notes || null},
          ${i.payment_details || null},
          ${JSON.stringify(i.travel_details || {})}::jsonb
        ) returning *`;
      return res.status(201).json({ ok: true, invoice: rows[0] });
    }

    /* ── UPDATE invoice status (PATCH) ── */
    if (req.method === 'PATCH' && req.body?.type === 'invoice_status') {
      const { id, status } = req.body;
      if (!id || !status) return res.status(400).json({ error: 'id and status required' });
      const rows = await sql`update invoices set status=${status} where id=${id} returning *`;
      if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
      return res.status(200).json({ ok: true, invoice: rows[0] });
    }

    /* ── UPDATE full invoice (PUT) ── */
    if (req.method === 'PUT' && req.body?.type === 'invoice') {
      const { id, invoice: i } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });
      const rows = await sql`
        update invoices set
          invoice_number=${i.invoice_number},
          invoice_date=${i.invoice_date || null},
          due_date=${i.due_date || null},
          booking_ref=${i.booking_ref || null},
          customer_name=${i.customer_name},
          customer_address=${i.customer_address || null},
          phone=${i.phone || null},
          email=${i.email || null},
          items=${JSON.stringify(i.items || [])}::jsonb,
          tax_label=${i.tax_label || 'GST'},
          tax_rate=${i.tax_rate || 0},
          discount=${i.discount || 0},
          subtotal=${i.subtotal || 0},
          tax=${i.tax || 0},
          total=${i.total || 0},
          status=${i.status || 'Draft'},
          notes=${i.notes || null},
          payment_details=${i.payment_details || null},
          travel_details=${JSON.stringify(i.travel_details || {})}::jsonb
        where id=${id}
        returning *`;
      if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
      return res.status(200).json({ ok: true, invoice: rows[0] });
    }

    /* ── DELETE invoice ── */
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
