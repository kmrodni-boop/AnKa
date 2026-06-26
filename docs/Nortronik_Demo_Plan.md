# 🚀 Plan for demo av Nortronik Arbeidsordre- og Planleggingssystem

**Basert på samtalen din med Copilot (juni 2026)**  
**Målgruppe:** Deg (Kai Marius Alm) som arkitekt/tenker + eventuell intern pitch for ledelse/utviklerressurser  
**Fokus:** Rask, imponerende MVP som kan kjøres lokalt i VS Code på Linux – viser kjerneverdi og business case

---

## 1. Oppsummering av samtalen – hva dere egentlig har designet

Dere har i praksis designet et **moderne, skreddersydd feltservice-system** som erstatter to gamle systemer (ELA via RDP + deler av Visma-kvalitetskontroll). 

**Kjerneidéen:**
- Én web-applikasjon (browser + mobil/PWA) med Azure Entra ID autentisering
- Skreddersydd for Nortronik sine behov: registrering av arbeidsordre, smart planlegging, utførelse, rapportering og kvalitetssikring
- **Backend-algoritme** som er det virkelige konkurransefortrinnet: "Finn ledig tid" som matcher jobbtype, tekniker-kompetanse, kalender-hull, lokasjon (koordinater + reisetid) og forretningsregler
- Sanntids samarbeid med låsing av ordre (soft lock)
- Rollebasert tilgang + **sikkerhetsklarering** (sensitive kunder maskeres i kalender som "🔒 Super secret mission" for ikke-godkjente)
- Automatisert livssyklus for periodiske jobber (årskontroll → auto opprett neste år + serviceordre for avvik)
- Valgfri **lokal AI** (Ollama) for sjekkliste-kontroll og avviksdeteksjon
- Geografisk intelligens: Korridor-søk + dynamisk radius (større i Nord-Norge/Finnmark, hub-logikk Tromsø)

**Business case (sterkt argument):**
- Koordinator bruker i dag mye tid på manuell kalender-sjekk og koordinering → systemet kan spare 50%+ av den tiden (potensielt 100 000+ kr/år i spart arbeidstid)
- Mindre feil, bedre beslutningsgrunnlag, mindre stress
- Dere eier koden selv → raske endringer, ingen vendor lock-in, kan bli "best in class" i bransjen
- API-kostnader for kart (Azure Maps/Google) er lave (~500–2000 kr/år ved deres volum)

**Demo-strategi (din egen idé – veldig smart):**
Bygg en fungerende prototype på din egen PC (fake data, ingen ekte kundedata). Vis den fra egen PC + tekniker-visning på telefon/nettbrett på samme WiFi. Dette er nok til å demonstrere verdi og få intern gehør ("Dette vil vi ha – hva trenger du?").

---

## 2. Mål for demo-MVP (hold det stramt!)

**Hva skal demoen vise på 4–6 minutter?**
En komplett, realistisk historie:
1. Koordinator finner/oppretter ordre for en kunde
2. Trykker "Finn ledig tid" → får smarte forslag (med begrunnelse, score, reisetid)
3. Velger tidspunkt → ordre låses og oppdateres
4. Tekniker (mobil-simulering) åpner ordre, fyller sjekkliste + materiell
5. Fullfører → systemet kjører enkel validering + (valgfritt) lokal AI-sjekk som finner avvik
6. Fullfør ordre → systemet spør automatisk om å opprette neste årskontroll + serviceordre for avvik
7. Vis kalender med sikkerhetsmasking ("Super secret mission" for ikke-klarert bruker)
8. Bytt til "sjef"-bruker → ser alt + clearance-innstillinger

**Ikke bygg i demo:**
- Full Azure AD / ekte autentisering
- Ekte SharePoint / Visma integrasjon (mock det)
- Avansert ruteoptimalisering (OR-tools)
- Offline-modus (kan legges til senere)
- Perfekt UI / alle edge cases

**Fokus:** Flyt, beslutningsstøtte, automatisering og "wow – dette skjønner hvordan vi jobber".

---

## 3. Anbefalt Tech Stack for demo (enkel + skalerbar)

| Lag          | Teknologi                          | Hvorfor                                                                 | Alternativ                  |
|--------------|------------------------------------|-------------------------------------------------------------------------|-----------------------------|
| **Backend**  | Node.js + Express + better-sqlite3 | Rask prototyping, enkelt å kjøre i VS Code, god JS/TS støtte           | .NET 8 Minimal API         |
| **Database** | SQLite (én fil)                    | Null installasjon, perfekt for demo, kan migreres til Azure SQL/PostgreSQL | -                          |
| **Frontend** | Vite + React 18 + Tailwind + DaisyUI | Moderne, mobilvennlig, rask UI-utvikling, du kan gjenbruke komponenter | Vanilla HTML + htmx        |
| **Kart**     | Leaflet.js + haversine             | Gratis, fin visning, enkel avstandsberegning                            | Azure Maps senere          |
| **AI (valgfritt)** | Ollama (mistral / llama3.1)   | Lokal, gratis, kjører på din RTX 5050, enkelt HTTP API                 | -                          |
| **PDF**      | jsPDF eller browser print          | Enkelt for demo                                                         | Backend template senere    |
| **Dev**      | VS Code + Thunder Client + SQLite Viewer | Alt du trenger                                                            | -                          |

**Hvorfor Node.js fremfor .NET i demo-fasen?**  
Raskere å komme i gang med full-stack JS, mindre "ceremoni", du har allerede erfaring med HTML/JS UIs fra Perchance-prosjektene dine. Du kan alltid flytte logikken til .NET senere når dere går til produksjon på Azure.

---

## 4. Prosjektstruktur (klar til å kopiere inn i VS Code)

```
nortronik-demo/
├── backend/
│   ├── src/
│   │   ├── server.js                 # Express app + middleware
│   │   ├── db.js                     # SQLite init + seed
│   │   ├── routes/
│   │   │   ├── customers.js
│   │   │   ├── orders.js
│   │   │   ├── schedule.js           # <-- Kjerne: finn ledig tid algoritme
│   │   │   └── ai.js                 # Ollama checklist review
│   │   └── utils/
│   │       ├── geo.js                # haversine + corridor logic
│   │       ├── scoring.js
│   │       └── masking.js            # security clearance logic
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── CustomerList.jsx
│   │   │   ├── OrderDetail.jsx
│   │   │   ├── ScheduleSuggestions.jsx
│   │   │   ├── TechnicianView.jsx    # Mobil-vennlig layout
│   │   │   ├── CalendarView.jsx
│   │   └── ChecklistReview.jsx
│   └── pages/
│       ├── CoordinatorDashboard.jsx
│       └── LoginDemo.jsx         # Fake role switcher
├── data/
│   └── seed-data.json                # Fake kunder, teknikere, bookinger, ordre
├── docs/
│   └── Nortronik_Demo_Plan.md        # Denne filen
├── package.json
├── vite.config.js
└── README.md                         # "npm run dev" instruksjoner + demo-script
```

---

## 5. Database-modell (forenklet for MVP)

**customers**
- id, name, address, lat, lng, postal_code, region, requires_clearance (boolean), allowed_technician_ids (JSON), notes

**technicians**
- id, name, base_lat, base_lng, skills (JSON array), clearance_level, base_postal

**orders**
- id, customer_id, type (årskontroll / service / ...), status, due_date, estimated_hours, location_address, lat, lng, assigned_tech_id, scheduled_start, scheduled_end, notes_coordinator, notes_tech, created_from_order_id (for auto-opprettede)

**bookings** (teknikeres kalender)
- id, technician_id, order_id, start_time, end_time

**checklist_items**, **materials**, **deviations** (knyttet til order_id)

**users** (demo only)
- id, name, role (koordinator/tekniker/leder), clearance_level

Seed 6–8 kunder (én sensitiv), 4–5 teknikere med ulike skills/lokasjoner, 12–15 bookinger fordelt over august 2026, noen eksisterende ordre.

---

## 6. Kjernealgoritme – /api/schedule/suggest (pseudokode + logikk)

```js
// POST /api/schedule/suggest
async function suggestAvailableTimes({ orderId, jobType, estimatedHours, lat, lng, postal, dueDate }) {
  const order = getOrder(orderId);
  const candidates = [];

  const technicians = getTechniciansWithSkill(jobType); // filter på kompetanse

  for (const tech of technicians) {
    if (order.customer.requires_clearance && !techHasClearance(tech, order.customer)) continue;

    const bookings = getBookingsForTechnician(tech.id, dueDate); // innen frist
    const gaps = findGaps(bookings, estimatedHours); // ledige slots som er store nok

    for (const gap of gaps) {
      const travelTo = calculateTravelTime(gap.prevJob, {lat, lng}); // haversine + corridor
      const travelFrom = calculateTravelTime({lat, lng}, gap.nextJob);

      const score = calculateScore({
        sameArea: isSameAreaOrCorridor(gap, {lat, lng, postal}),
        travelTime: travelTo + travelFrom,
        earlyInPeriod: gap.start < dueDate,
        regionBonus: getRegionRadiusBonus(postal) // Finnmark → større radius + Tromsø hub
      });

      candidates.push({
        technician: tech,
        start: gap.start,
        end: gap.start + estimatedHours,
        score,
        reason: generateReason(sameArea, travelTime, ...),
        travelTimeMinutes: travelTo
      });
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
```

**Utvidelser du allerede har tenkt på (legg til etterhvert):**
- Korridor-logikk: Sjekk om ny jobb ligger innenfor buffer rundt linjen base → eksisterende booking
- Dynamisk radius: if (postal >= 8000 || region === "Finnmark") radius = 400km else 30–50km. Utvid til hub (Tromsø)
- Scoring: +50 same area/corridor, -travelTime*2, +early slot, etc.

**For demo:** Implementer haversine + enkel gap-finding + corridor-approksimasjon. Hardkod noen realistiske bookinger så det ser smart ut.

---

## 7. Demo-scenario (copy-paste til presentasjon)

**Tittel:** "Fra manuell kalenderjakt til smart beslutningsstøtte på 5 minutter"

**Flyt:**
1. Logg inn som koordinator (Kai)
2. Finn kunde → se historikk + åpne ordre
3. Opprett ny årskontroll (3t, adresse i Bergen/Åsane)
4. Trykk "Finn ledig tid" → se forslag med score + reason
5. Velg forslag → ordre oppdateres + låses
6. Bytt til tekniker-visning → fyll sjekkliste + fullfør
7. AI-sjekk viser avvik
8. Fullfør ordre → prompt om neste årskontroll + serviceordre for avvik
9. Vis kalender med masking ("Super secret mission")
10. Bytt til leder-bruker → ser alt

---

## 8. Implementeringsplan (realistisk for deg)

| Fase | Hva | Estimert tid | Prioritet |
|------|-----|--------------|---------|
| 0    | Setup (Node + Vite + SQLite + seed) | 1–2 kvelder | Høy |
| 1    | Customer list + detail + opprett ordre (enkel form) | 2–3 kvelder | Høy |
| 2    | Ordre-detail + status flyt + låsing (soft) | 2 kvelder | Høy |
| 3    | Schedule/suggest algoritme + UI for forslag | 3–4 kvelder | Høy |
| 4    | Tekniker-view (mobil) + checklist | 2–3 kvelder | Høy |
| 5    | AI-sjekk + auto-opprett neste ordre/avvik | 2–3 kvelder | Medium |
| 6    | Corridor + dynamic radius + security masking i kalender | 2 kvelder | Medium |
| 7    | Polering, demo-script, README, test på telefon | 1–2 kvelder | Høy |

**Totalt for en solid demo:** 12–18 kvelder (spredt over 3–5 uker).  
Start med Fase 0–4 – det alene er nok til en imponerende demo.

---

## 9. Potensielle fallgruver & tips

- Scope creep: Hold MVP stramt – bare det som viser "Finn ledig tid" + flyt + AI-sjekk.
- Data consistency: Bruk transaksjoner i SQLite for statusendringer.
- "Real-time": Start med polling (fetch every 5s), senere Socket.io hvis ønskelig.
- Maps kostnad: Bruk mock + Leaflet for demo. Kommenter hvor Azure Maps skal inn.
- Sikkerhet i demo: Fake det, men vis logikken (middleware that checks clearance).
- Din rolle: Du er arkitekten – beskriv logikken, la AI/utvikler implementere detaljer senere.

---

## 10. Neste steg etter demo

Hvis positiv respons:
- Migrer til Azure (App Service + Azure SQL + Entra ID)
- Utvid med ekte geokoding/routing + caching
- SharePoint document library integration
- Full RBAC + audit logging
- Regelbasert algoritme først (billigere og mer kontrollerbart) – AI senere hvis data grunnlag er der

Dette prosjektet har potensial til å vise at du tenker som en systemarkitekt som løser reelle problemer med smart, enkel teknologi – akkurat det som kan føre til ny rolle eller ressurser.

Lykke til – dette blir et morsomt og verdifullt prosjekt! 
Hvis du vil ha hjelp til å generere starter-kode for en spesifikk del, bare si ifra.

---

*Fil opprettet: 2026-06-26*