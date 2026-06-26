<<<<<<< HEAD
# Nortronik Demo

Minimal scaffold for the Nortronik demo MVP.

## Run locally

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` for the frontend (proxied to backend `/api`).

## Demo flow

1. Create an order from the main UI.
2. Use **Suggest time** to see schedule proposals.
3. Open a technician view and add checklist items.
4. Run **AI review** and complete the order.
5. Switch calendar role between `technician` and `manager` to show sensitive masking.

## Notes

- The backend stores demo data in `data/demo.db`.
- `backend/src/ai.js` supports local Ollama AI review via `OLLAMA_URL`.
- The frontend includes orders, suggestions, technician workflow, checklist, and calendar masking.

## Demo script

See `docs/demo-script.md` for a step-by-step walkthrough.
=======
# AnKa
>>>>>>> d701f490ab8b91c79a41bffa6a1c20d5be3a64e4
