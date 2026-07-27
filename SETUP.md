# Production setup

## 1. Deploy to Vercel
1. Push this folder to GitHub.
2. In Vercel, choose **Add New → Project**, import the repository and deploy.
3. In **Project Settings → Environment Variables**, add the variables from `.env.example`.
4. Redeploy after saving variables.

Do not put the Mistral, Resend or WhatsApp keys in `app.js`, HTML, GitHub or any `VITE_` variable. The included `/api` functions keep all secrets server-side.

## 2. Mistral chatbot
1. Create an API key in the Mistral console.
2. Add `MISTRAL_API_KEY` in Vercel.
3. Keep `MISTRAL_MODEL=mistral-small-latest`, or replace it with another model enabled for the account.
4. Redeploy and test **Ask Bahadur AI** on the homepage and booking page.

## 3. Booking email
The booking API uses Resend.
1. Create a Resend account and verify the website domain.
2. Create an API key and add `RESEND_API_KEY`.
3. Set `RESEND_FROM_EMAIL` to an address on the verified domain.
4. Set `BOOKING_EMAIL=bahadurtourstravels@gmail.com`.
5. Set `SEND_CUSTOMER_EMAIL=true` to email a receipt to the traveller as well.

Every successful booking submission calls `/api/bookings` and sends the owner a structured booking email.

## 4. Automatic WhatsApp notifications
The booking API uses Meta WhatsApp Cloud API.
1. Create a Meta Business app and add the WhatsApp product.
2. Add the permanent system-user access token as `WHATSAPP_ACCESS_TOKEN`.
3. Add the sending number ID as `WHATSAPP_PHONE_NUMBER_ID`.
4. Set `WHATSAPP_ADMIN_NUMBER=919187440916` using country code and digits only.
5. Create and get approval for a template named `booking_confirmation` with three body variables in this order: customer name, booking reference, trip name.
6. Set `WHATSAPP_BOOKING_TEMPLATE=booking_confirmation` and the approved language code.
7. Redeploy.

Meta requires an approved template for business-initiated customer messages outside the 24-hour support window. The API always attempts the admin notification and sends the customer template when configured.

## 5. Test
- Submit a booking using your own email and WhatsApp number.
- Confirm the API returns a booking reference such as `BT12345678`.
- Verify the owner email, admin WhatsApp notification and customer confirmation.
- Check Vercel Function Logs for provider errors.

## Security before launch
- Enable Vercel deployment protection for preview deployments.
- Rotate any key accidentally shared in chat or committed to Git.
- Add CAPTCHA/rate limiting before paid advertising.
- Add a database and authenticated admin access before treating the dashboard as a live operations system.



## 6. Real admin data, billing and guest media (Neon)
The upgraded admin dashboard intentionally contains **no hardcoded booking or revenue numbers**. It reads actual booking, review, invoice and media records from Neon.

1. Create a Neon project.
2. Open **SQL Editor**, paste `supabase-schema.sql`, and run it once. This creates `bookings`, `reviews`, `media`, `invoices` and the public `visitor-media` storage bucket.
3. In Neon **Project Settings → API**, copy the project URL to `DATABASE_URL`.
4. Copy the **service role** key to `DATABASE_URL`. Keep this secret and add it only to Vercel Environment Variables.
5. Create a long random password for `ADMIN_API_TOKEN`. Staff enter this token when opening the admin dashboard, billing studio or media manager.
6. Set `BLOB_READ_WRITE_TOKEN=visitor-media` and redeploy.

Every successful `/api/bookings` request is then written to the `bookings` table. The dashboard calculates metrics from stored records, invoices are saved to `invoices`, reviews enter a pending moderation queue, and approved media appears on `community.html`.

### Billing and PDF
- Open `billing.html` from the admin dashboard.
- Enter customer and line-item details; tax, discount and totals calculate automatically.
- Select **Save invoice** to store the invoice in Neon.
- Select **Print / PDF**, choose A4, scale 100%, disable browser headers/footers, and print or choose **Save as PDF**.
- The dedicated print stylesheet removes controls and preserves invoice colours and spacing.

### Guest photos and visitor videos
- Open `media-manager.html`, enter the private admin token and upload approved JPEG, PNG, WebP, MP4 or WebM files up to 8 MB.
- Record the guest credit, trip, caption, consent and approval state.
- Approved items are shown automatically on `community.html`; pending items remain visible only in the admin library.

### Admin security
- Never put `DATABASE_URL` or `ADMIN_API_TOKEN` in HTML, browser JavaScript, GitHub screenshots or chat.
- Add Vercel rate limiting and stronger staff authentication before giving access to multiple employees.
- Rotate the token immediately if it is exposed.


## Version 4 — Neon is the active database
Run `neon-schema.sql`, set `DATABASE_URL`, `ADMIN_API_TOKEN`, and `BLOB_READ_WRITE_TOKEN`, then redeploy. Older Supabase references are historical and are not used by the current API files.
