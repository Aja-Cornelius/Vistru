# 🏗️ Vistru — Remote Construction Supervision Platform

Nigeria's first end-to-end remote construction supervision platform — connecting clients, engineers, suppliers, and legal professionals through a single trusted system with AI-powered site monitoring and escrow-protected payments.

---

## Project Structure

```
vistru/
├── backend/              ← Node.js + Express API server
│   ├── src/
│   │   ├── server.js     ← Entry point
│   │   ├── config/
│   │   │   └── db.js     ← PostgreSQL connection pool
│   │   ├── routes/       ← All API route definitions
│   │   ├── controllers/  ← Business logic
│   │   ├── middleware/   ← Auth, upload, rate limiting
│   │   └── services/     ← Email, SMS, escrow, storage
│   ├── .env.example      ← Copy to .env and fill in values
│   └── package.json
├── frontend/
│   ├── js/
│   │   └── api.js        ← API connector (wires HTML to backend)
│   └── pages/            ← One HTML file per page/dashboard
└── database/
    ├── migrations/
    │   └── 001_full_schema.sql  ← Full PostgreSQL schema
    └── seeds/
        └── demo_data.sql        ← Demo data for development
```

---

## Quick Start

### Prerequisites
- Node.js v18+
- PostgreSQL 14+
- npm

### 1 — Database setup

```bash
# Create database and user
psql -U postgres
CREATE DATABASE vistru_db;
CREATE USER vistru_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE vistru_db TO vistru_user;
\q

# Run schema migration
psql -U vistru_user -d vistru_db -f database/migrations/001_full_schema.sql

# (Optional) Load demo data
psql -U vistru_user -d vistru_db -f database/seeds/demo_data.sql
```

### 2 — Backend setup

```bash
cd backend
npm install

# Copy env file and fill in your values
cp .env.example .env
nano .env  # or open in your editor

# Start development server
npm run dev
# → API running at http://localhost:5000
```

### 3 — Test the API

```bash
# Health check
curl http://localhost:5000/api/health

# Register a client
curl -X POST http://localhost:5000/api/auth/register/client \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@test.com","phone":"08012345678","password":"Test@2025","nationality":"Nigerian","dateOfBirth":"1990-01-01","residentialAddress":"No. 1 Test Street","idType":"nin","idNumber":"12345678901","securityQuestion":"Pet name?","securityAnswer":"Bingo"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@2025"}'
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/client` | Register a new client |
| POST | `/api/auth/register/engineer` | Register a new engineer |
| POST | `/api/auth/register/supplier` | Register a new supplier |
| POST | `/api/auth/verify-email` | Verify email with OTP |
| POST | `/api/auth/resend-otp` | Resend OTP |
| POST | `/api/auth/login` | Login (all roles) |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/refresh` | Refresh access token |
| GET  | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/project` | Create project (client) |
| GET  | `/api/project/my` | Client's own projects |
| GET  | `/api/project/:id` | Get project detail |
| GET  | `/api/project/:id/milestones` | Get milestones |
| GET  | `/api/project/:id/boqs` | Get BOQ bids |
| POST | `/api/project/:id/boqs/:boqId/award` | Award BOQ to engineer |
| POST | `/api/project/:projectId/milestones/:id/file` | Engineer files milestone |
| GET  | `/api/project/open/for-engineers` | Open projects for bidding |

### Escrow
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/escrow/fund-milestone` | Client funds milestone |
| POST | `/api/escrow/release-milestone` | Client releases to engineer |
| POST | `/api/escrow/fund-order` | Client pays for materials |
| POST | `/api/escrow/release-order` | Client releases to supplier |
| GET  | `/api/escrow/summary/:projectId` | Escrow summary |

### Engineer
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/engineer/dashboard` | Engineer dashboard |
| POST | `/api/engineer/boq` | Submit BOQ |
| POST | `/api/engineer/loan` | Apply for project loan |

### Supplier
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/supplier/dashboard` | Supplier dashboard |
| GET  | `/api/supplier/inventory` | List inventory |
| POST | `/api/supplier/inventory` | Add inventory item |
| PATCH| `/api/supplier/orders/:id/dispatch` | Mark dispatched |
| PATCH| `/api/supplier/orders/:id/delivered` | Mark delivered |

### Lawyer
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/lawyer/dashboard` | Lawyer dashboard |
| PATCH| `/api/lawyer/land/:id/verdict` | Issue land verdict |
| POST | `/api/lawyer/contract` | Draft contract |
| PATCH| `/api/lawyer/arbitration/:id/schedule` | Schedule hearing |
| PATCH| `/api/lawyer/arbitration/:id/ruling` | Issue ruling |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/admin/stats` | Platform-wide stats |
| GET  | `/api/admin/pending-reviews` | Users pending review |
| PATCH| `/api/admin/users/:id/approve` | Approve engineer/supplier |
| PATCH| `/api/admin/users/:id/suspend` | Suspend user |
| POST | `/api/admin/onboard-lawyer` | Onboard a new lawyer |
| GET  | `/api/admin/arbitrations` | All arbitration cases |
| GET  | `/api/admin/audit-log` | Full audit log |

---

## Database Tables

| Table | Description |
|-------|-------------|
| `users` | All platform users (all roles) |
| `engineer_profiles` | Engineer licence & specialisation data |
| `supplier_profiles` | Business registration & store data |
| `lawyer_profiles` | Bar registration & assignment data |
| `projects` | Construction projects |
| `documents` | All uploaded files (land docs, drawings, IDs) |
| `land_verifications` | Land title verification per project |
| `boq_submissions` | Engineer BOQ bids per project |
| `contracts` | Lawyer-drafted client-engineer agreements |
| `milestones` | Milestone breakdown per project |
| `escrow_transactions` | Every payment in/out of escrow |
| `inventory` | Supplier material listings |
| `supplier_orders` | Client material orders |
| `order_items` | Line items per supplier order |
| `cctv_cameras` | Deployed cameras per project |
| `cctv_reports` | AI-generated site monitoring reports |
| `arbitration_cases` | Dispute/arbitration cases |
| `project_loans` | Engineer milestone advance loans |
| `notifications` | In-platform alerts per user |
| `otp_store` | OTP tokens for verification |
| `audit_log` | Full action audit trail |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Node.js + Express |
| Database | PostgreSQL 14+ |
| Authentication | JWT (access + refresh tokens) |
| Password hashing | bcryptjs |
| File uploads | Multer (dev) → Cloudinary (production) |
| Email / OTP | Nodemailer → SendGrid (production) |
| SMS alerts | Termii (Nigerian) or Twilio |
| Payments / Escrow | Flutterwave (Paystack also supported) |
| Frontend | Vanilla HTML/CSS/JS (prototype) |
| Hosting (API) | Railway or Render (recommended) |
| Hosting (frontend) | Vercel or Netlify |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

- `DB_*` — PostgreSQL connection
- `JWT_SECRET` — Long random string (min 64 chars)
- `SMTP_*` — SendGrid or SMTP credentials
- `CLOUDINARY_*` — For production file storage
- `FLW_*` — Flutterwave keys for real payments
- `TERMII_API_KEY` — For SMS alerts

---

## Connecting the Prototype to the Backend

The file `frontend/js/api.js` exports a complete API connector. Add it to your HTML pages:

```html
<script src="/frontend/js/api.js"></script>
<script>
  // On login button click:
  const data = await VistruAPI.AuthAPI.login(email, password);
  // data.accessToken, data.user are now available

  // On register submit:
  const fd = VistruAPI.buildRegFormData(formFields, uploadedFiles);
  const result = await VistruAPI.AuthAPI.registerClient(fd);

  // Release milestone escrow:
  await VistruAPI.EscrowAPI.releaseMilestone(milestoneId);
</script>
```

---

## Demo Credentials (after running seed)

| Role | Email | Password |
|------|-------|----------|
| Client | adaeze@demo.vistru.ng | Vistru@2025 |
| Engineer | chidi@demo.vistru.ng | Vistru@2025 |
| Supplier | bamike@demo.vistru.ng | Vistru@2025 |
| Lawyer | lawyer@demo.vistru.ng | Vistru@2025 |
| Admin | admin@vistru.ng | Vistru@2025 |

> **Note:** Update the `pw_hash` in `demo_data.sql` with a real bcrypt hash before using. Generate one with: `node -e "console.log(require('bcryptjs').hashSync('Vistru@2025', 12))"`

---

## Next Steps

1. Replace Multer disk storage with Cloudinary for production file uploads
2. Integrate Flutterwave payment modal into the frontend for real escrow funding
3. Add SMS notifications via Termii for milestone and payment alerts
4. Build the CCTV streaming integration (RTSP → HLS for browser playback)
5. Add AI report generation pipeline (image analysis → structured JSON)
6. Implement the admin approval dashboard as a separate protected page
7. Add websocket support (Socket.io) for real-time notifications

---

*Built for Vistru Technologies Ltd — © 2025*
