# Nortronik Demo Script

This document describes a short demo flow for the Nortronik field service prototype.

## Goals

- Show the coordinator workflow for finding and booking an order.
- Show the technician view, checklist, and AI review.
- Show the calendar with sensitive customer masking.

## Setup

1. Start the backend:
   ```bash
   cd backend
   npm install
   npm start
   ```
2. Start the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Open the app in a browser: `http://localhost:3000`

## Logging in

The app requires a real login (username/password, JWT session). Seeded demo accounts (reset any time via the **"Nullstill Demo"** button):

| Role         | Username        | Password          |
|--------------|-----------------|-------------------|
| Admin        | `admin`         | `admin`           |
| Manager      | `leder`         | `leder123`        |
| Coordinator  | `koordinator`   | `koordinator123`  |
| Technician   | `ola.nordmann`  | `tekniker123`     |

Every seeded technician gets a matching account (`firstname.lastname` / `tekniker123`).

## Demo flow

### 1. Coordinator: create and schedule an order

- Log in as `koordinator` (or `admin`).
- In the main UI, open the **Orders** section.
- Use the **Create Order** form to create a new order for an existing customer.
- Open the order and click **"Finn ledig tid"** (Suggest time).
- The system returns schedule suggestions with score, travel estimate and reasoning.
- Mention: this is a lightweight matching engine using technician skills, calendar gaps, and distance.

### 2. Calendar view with role-based masking

- Log in as `koordinator` and open the calendar - sensitive customers are masked as `🔒 Super secret mission`.
- Log out and log back in as `admin` or `leder` - the same calendar now shows full customer names.
- Mention: this is enforced server-side based on the authenticated user's role, not a client-side toggle - a coordinator genuinely cannot see the unmasked name.

### 3. Technician view and checklist

- Log in as a technician (e.g. `ola.nordmann`) to see the dedicated mobile/tablet-friendly technician view.
  - Alternatively, stay logged in as `admin`/`leder` and use **"👁 Forhåndsvis"** on a technician row under the **Brukere** tab to preview their view without logging out.
- Start a job, open the checklist, add an item and mark it complete.
- Press **Run AI review**.
- The AI review will summarise the checklist and point out missing or open tasks.

### 4. Finish and close the loop

- Mark the order as `in_progress` and then `done`.
- Refresh the orders list.
- Mention: from order creation to execution, the demo shows a small but complete field service workflow.

### 5. User administration

- Log in as `admin` and open **Brukere**.
- Create a new user with a role and password, then log in as that user to show it works end-to-end.
- Mention: only `admin` can create/edit/delete accounts; `leder` can view the list; coordinators/technicians see a read-only technician overview instead.

## Notes

- The backend uses a real SQLite file database (`better-sqlite3`), not an in-memory mock.
- The AI review runs locally if `OLLAMA_URL` is configured (Ollama's `/api/generate` endpoint), otherwise a fallback heuristic summary is used.
- This prototype now has real authentication (JWT) and role-based access control on the API, though it is still tuned for local demo use rather than production hardening (e.g. no rate limiting, no password reset flow).
