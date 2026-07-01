# Nortronik AnKa Demo

En fungerende prototype av et moderne arbeidsordre- og planleggingssystem for Nortronik.

Målet er å erstatte det gamle RDP-baserte systemet med en moderne webapplikasjon som gir bedre tilgjengelighet, smartere planlegging og bedre brukeropplevelse for både koordinatorer og teknikere.

## 🚀 Kom i gang lokalt

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

Åpne [http://localhost:3000](http://localhost:3000) (eller porten Vite bruker).

## Innlogging

Appen krever ekte innlogging (brukernavn/passord, JWT-sesjon). Demo-kontoer (seedes automatisk, og resettes via **"Nullstill Demo"**):

| Rolle       | Brukernavn     | Passord           |
|-------------|----------------|-------------------|
| Admin       | `admin`        | `admin`           |
| Leder       | `leder`        | `leder123`        |
| Koordinator | `koordinator`  | `koordinator123`  |
| Tekniker    | `ola.nordmann` | `tekniker123`     |

Alle teknikere i seed-dataen får en tilsvarende konto (`fornavn.etternavn` / `tekniker123`). Admin kan opprette og administrere brukere under **Brukere**-fanen.

## Demo-flow (anbefalt rekkefølge)

1. Logg inn som `koordinator` (eller `admin`).
2. Opprett en ny ordre fra hovedskjermen.
3. Åpne ordren og trykk **"Finn ledig tid"** for å se smarte planleggingsforslag.
4. Velg et tidspunkt → ordren blir planlagt.
5. Logg ut og logg inn som en tekniker (f.eks. `ola.nordmann`) for å se den mobiltilpassede tekniker-visningen.
6. Start jobben, fyll ut sjekklisten, og kjør **AI Review**.
7. Fullfør ordren.
8. Logg inn som `admin` og bruk **"👁 Forhåndsvis"** i Brukere-fanen for å se en teknikers mobilvisning uten å logge ut.
9. Sammenlign kalenderen som `koordinator` vs. `admin`/`leder` for å se sikkerhetsmaskeringen ("🔒 Super secret mission") — dette styres nå av den innloggede brukerens faktiske rolle, ikke en fri rollevelger.

## Prosjektstruktur

```
nortronik-demo/
├── backend/          # Express + SQLite + planleggingsalgoritme
├── frontend/         # Vite + React + Tailwind
├── data/             # Demo database
└── docs/             # Demo-script + planer
```

## Teknologi

- **Backend**: Node.js + Express + better-sqlite3 + JWT-autentisering
- **Frontend**: React + Vite + Tailwind
- **AI (valgfritt)**: Ollama (lokal) – faller tilbake til en enkel heuristikk hvis `OLLAMA_URL` ikke er satt
- **Database**: SQLite (fil under `data/`, ikke committet)

## Neste steg / Utvikling

Se `docs/Nortronik_Demo_Polish_Plan.md` for en prioritert liste over hva som bør forbedres før demo/pitch.

## Lisens

MIT