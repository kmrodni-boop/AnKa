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

## Demo flow

### 1. Coordinator: create and schedule an order

- In the main UI, open the **Orders** section.
- Use the **Create Order** form to create a new order for an existing customer.
- Click **Suggest time** for the new order.
- The system returns schedule suggestions with score, travel estimate and reasoning.
- Mention: this is a lightweight matching engine using technician skills, calendar gaps, and distance.

### 2. Calendar view with role-based masking

- Scroll to the **Calendar role** selector.
- Set role to `technician` and observe the calendar.
- Sensitive customers are masked as `🔒 Super secret mission` for non-manager roles.
- Change role to `manager` or `admin` and show the full customer name.
- Mention: this is the data-access/security masking layer for sensitive sites.

### 3. Technician view and checklist

- Open a technician from the **Technicians** list.
- Select a booked order and open the checklist.
- Add a checklist item and mark it complete.
- Press **Run AI review**.
- The AI review will summarise the checklist and point out missing or open tasks.

### 4. Finish and close the loop

- Mark the order as `in_progress` and then `done`.
- Refresh the orders list.
- Mention: from order creation to execution, the demo shows a small but complete field service workflow.

## Notes

- The backend uses SQLite and in-memory demo data.
- The AI review runs locally if `OLLAMA_URL` is configured, otherwise a fallback heuristic summary is used.
- This prototype is designed for local demo use and can be extended with real authentication, routing, and production APIs.
