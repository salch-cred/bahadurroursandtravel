# Bahadur Tours & Travels

A responsive liquid-glass travel booking experience built with semantic HTML, CSS and TypeScript, ready for Vercel.

## Included
- Premium homepage using supplied logo and photography
- Dedicated package discovery and booking page
- 41 searchable packages with India, pilgrimage, international, coastal/local and family filters
- Booking request flow with automatic owner email and Meta WhatsApp Cloud API notifications
- Review submission and verification-ready UX
- Mistral-powered AI concierge with server-side key protection
- Exact OpenStreetMap coordinates for every added destination and a 3D pitched MapLibre map
- Force Urbania service section
- Admin operations dashboard
- Terms, cancellation, safety and privacy page

## Run
`python3 -m http.server 4173` then open `http://localhost:4173`.

## Build TypeScript
`tsc app.ts --target ES2020 --module ES2020 --lib ES2020,DOM --outDir .`

## Production integrations
The included Vercel Functions connect Mistral, Resend email and Meta WhatsApp Cloud API without exposing keys in the browser. Follow `SETUP.md` and copy every required value from `.env.example` into Vercel Environment Variables. Add a database and authenticated admin access before treating the demo dashboard as a live operations system.

Map data is © OpenStreetMap contributors. The interface uses a Hugeicons-compatible 24px outline icon language; install `@hugeicons/react` when migrating the static shell to React.


## Destination media
Added destination photos are requested from Wikimedia Commons at runtime and link to the source licence. Google Image Search results are not copied because appearing in Google does not make an image copyright-free.



## Operations upgrade
- Live Neon-backed admin metrics with no hardcoded figures
- Real booking persistence from the public booking API
- A4 billing studio with automatic totals, invoice storage, print and Save-as-PDF layout
- Dedicated guest stories page for approved reviews, explorer photos and visitor videos
- Secure admin media manager with consent, moderation and 8 MB upload validation
- Improved scannable terms page covering refunds, privacy and guest-media permission

Run `supabase-schema.sql` and follow the Neon section in `SETUP.md` before using the dashboard with customer data.


## Version 4 visitor platform
The active backend is Neon PostgreSQL. Package CRUD, booking persistence, verified review publishing, billing records and media metadata use Neon. Visitor media files use Vercel Blob with their URLs stored in Neon.
