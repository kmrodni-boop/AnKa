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

Åpne [http://localhost:5173](http://localhost:5173) (eller porten Vite bruker).

## Demo-flow (anbefalt rekkefølge)

1. Logg inn / velg rolle (koordinator / tekniker / admin)
2. Opprett en ny ordre fra hovedskjermen
3. Trykk **"Suggest time"** og se smarte planleggingsforslag
4. Velg et tidspunkt → ordren blir planlagt
5. Åpne **Technician view** og fullfør en jobb (sjekkliste + materiell)
6. Se AI Review av sjekklisten (via Ollama)
7. Fullfør ordren og se automatisk opprettelse av neste årskontroll + avviksordre
8. Bytt rolle i kalenderen for å se sikkerhetsmasking ("Super secret mission")

## Prosjektstruktur

```
nortronik-demo/
├── backend/          # Express + SQLite + planleggingsalgoritme
├── frontend/         # Vite + React + Tailwind
├── data/             # Demo database
└── docs/             # Demo-script + planer
```

## Teknologi

- **Backend**: Node.js + Express + better-sqlite3
- **Frontend**: React + Vite + Tailwind + DaisyUI
- **Kart**: Leaflet
- **AI (valgfritt)**: Ollama (lokal)
- **Database**: SQLite (enkel fil for demo)

## Neste steg / Utvikling

Se `docs/Nortronik_Demo_Polish_Plan.md` for en prioritert liste over hva som bør forbedres før demo/pitch.

## Lisens

MIT