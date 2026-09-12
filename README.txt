FATHIMA TRADERS - PHASE 2 + 3
================================

Phase 2 added:
- Product database with seed catalogue
- Admin add/edit/hide products
- Customer database linked to enquiries
- Enquiry management
- Order management and status tracking
- Quotation records and quote numbers
- Dashboard statistics
- Basic login rate limiting and security headers
- SQLite database in data/fathima.db

Phase 3 preparation added:
- robots.txt
- sitemap.xml (replace YOUR-DOMAIN.example after choosing a domain)
- production security notes
- environment-based admin password support

LOCAL SETUP
-----------
1. npm install
2. npm install-scripts approve better-sqlite3
3. npm start
4. Website: http://localhost:3001
5. Admin: http://localhost:3001/admin
6. Default local admin password: Fathima@Admin2026

BEFORE PUBLICATION
------------------
- Set a strong ADMIN_PASSWORD environment variable.
- Replace the placeholder email/address in public/site-config.js with real business details.
- Replace YOUR-DOMAIN.example in robots.txt and sitemap.xml with the real domain.
- Deploy behind HTTPS.
- Use a persistent production database/managed database and automatic backups.
- Add a production session store instead of the in-memory session Map.
- Add a reverse proxy, firewall/WAF, rate limiting and monitoring.
- Review Terms & Conditions with a qualified legal professional.
- Connect a real business email and Google Business Profile.
