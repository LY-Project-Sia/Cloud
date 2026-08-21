# Astra Pickleball Center — full-stack starter

This is an original implementation inspired by the public information and page structure of the referenced Astra Pickleball site.

## Run
1. Install Node.js 18+.
2. Run `npm install`.
3. Run `npm start`.
4. Open http://localhost:3000
5. Admin: http://localhost:3000/admin.html

## Included
- Responsive public homepage
- Court booking UI for 8 courts and hourly slots
- Entrance-pass request flow with proof upload
- Events page + admin event management
- FAQ section
- Inquiry/contact form + admin inbox
- Booking status management
- Editable site settings
- SQLite persistence

## Production hardening still needed
- Admin authentication/roles
- Real payment gateway / GCash / bank reconciliation
- Email notifications and QR generation
- Double-booking transaction/locking rules
- Cloud file storage
- Rate limiting, CSRF protection, validation and audit logs
- Production image assets, exact brand assets, analytics and SEO
