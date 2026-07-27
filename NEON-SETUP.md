# Neon and visitor-media setup

1. Create a Neon project and copy its pooled connection string to `DATABASE_URL` in Vercel.
2. Open Neon SQL Editor and run `neon-schema.sql` once.
3. Set a long random `ADMIN_API_TOKEN` in Vercel. Staff enter it in the admin, billing, media and package manager pages.
4. In Vercel Storage create a Blob store and connect it to the project. Vercel creates `BLOB_READ_WRITE_TOKEN`.
5. Redeploy. Submit one website booking and confirm it appears in `admin.html`.

## Data flow
- Booking form → `/api/bookings` → Neon `bookings` → live admin dashboard.
- Admin package manager → `/api/packages` → Neon `packages` → booking catalogue and detailed package page.
- Visitor review/media → Vercel Blob + Neon `reviews` with pending status. Approved records appear across visitor pages.
- Admin media manager → Vercel Blob + Neon `media`.
- Billing studio → Neon `invoices`.

Never expose `DATABASE_URL`, `ADMIN_API_TOKEN` or `BLOB_READ_WRITE_TOKEN` in browser code.


## Version 5 migration
Run the complete `neon-schema.sql` again. The `if not exists` statements safely add package flight/accommodation fields, invoice travel details and anonymous page-view analytics. Set `ANALYTICS_SALT` to a private random value in Vercel for visitor hashing.
