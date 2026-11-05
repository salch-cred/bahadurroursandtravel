# Bahadur Tours and Travels

Travel website and business panel: a static site on Vercel with TypeScript API functions and a Neon PostgreSQL database.

## Website
- Home page with scroll motion (`index.html`, `motion.js`, `home.js`)
- Package catalogue and full package pages (`booking.html`, `live-packages.js`, `package.html`, `package-detail.js`)
- Umrah, Explore Agatti, Guest stories, Travel guides and Terms
- Booking request window and AI concierge on every page (`site-ui.js`, `app.js`)

The shared look lives in `styles.css`. The navigation, footer and booking window are added by `site-ui.js`, so a change there updates every page.

## Business panel
Sign in at `admin.html` with `ADMIN_API_TOKEN`.

| Page | Purpose |
| --- | --- |
| `admin.html` | Dashboard: money, overdue payments, bookings, visitors |
| `bookings-admin.html` | Booking requests, status, WhatsApp, bill from a booking |
| `billing.html` | Invoice and quotation editor with live A4 preview, print and PDF |
| `invoices-admin.html` | All invoices and quotations, balances, record payment |
| `customers-admin.html` | Customer book and statements |
| `finance-admin.html` | Payments received and expenses |
| `reports-admin.html` | Profit and loss, GST summary, receivables by age |
| `packages-admin.html` | Everything shown on the package pages |
| `settings-admin.html` | Company, GSTIN, bank and UPI details, numbering, conditions |

Fill in **Business settings** first: GSTIN, bank and UPI details print on every invoice.

### How billing works
- Totals are always recalculated on the server, so a saved invoice cannot disagree with its lines.
- Paid amount, balance and status come from the payment ledger. Record a payment and they update on their own.
- Numbers run per Indian financial year, for example `BT/2026-27/0001`. Quotations and receipts have their own series.
- `invoice-render.js` and `invoice.css` are the single template for the preview, print and PDF.

## Run locally
`npm install`, then `npm run dev` (uses `vercel dev`, and needs the variables in `.env.example`).

## Database
Every table is created and upgraded automatically on the first API request after a deploy (`ensureSchema` in `api/_db.ts`). Older databases are upgraded in place and existing paid amounts are carried over into the payment ledger.

## Production setup
See `SETUP.md` for Vercel, AI chat and messaging, and `NEON-SETUP.md` for the database and media storage.

Map data is © OpenStreetMap contributors.
