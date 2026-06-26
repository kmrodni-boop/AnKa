# ✨ Nortronik Demo – Polish & Demo-Ready Plan

**Status nå (basert på skjermbildene du delte):**  
Backend fungerer (med `/suggest` endpoint og Leaflet-kart).  
Frontend er ekstremt basic men har kjerneflyten på plass (liste over kunder/ordre/teknikere + "Suggest time" + enkel kalender).  

**Hovedproblem akkurat nå:**
- Alle forslag har **score 0** → ser ikke smart ut i demo.
- Forslagene er monotone (samme tekniker, mange dager på rad).
- UI er funksjonell, men ser "tidlig prototype" ut – ikke levende eller profesjonell nok til pitch.

**Mål:** Gjøre demoen til noe du kan vise stolt på 4–6 minutter og få "wow, dette vil vi faktisk ha"-reaksjon.

---

## 🎯 Prioritert polish-plan (start her)

### Fase 1: Kritisk – Få scoring og forslag til å se smarte ut (1–2 kvelder)

Dette er det viktigste for demoen. Score 0 ødelegger inntrykket av "smart system".

**Hva du bør fikse i `schedule.js` / backend:**

1. **Scoring-funksjonen må gi varierte, realistiske scorer**
   - Eksempel på god scoring:
     ```js
     let score = 50;
     if (sameLocationOrCorridor) score += 40;
     if (travelTimeMinutes < 30) score += 20;
     else if (travelTimeMinutes < 60) score += 10;
     else score -= (travelTimeMinutes - 60) * 0.5;

     if (slotIsEarlyInPeriod) score += 15;
     if (techAlreadyHasJobSameDay) score += 10;
     ```
   - Returner score mellom 0–100, og vis den pent (f.eks. 92, 78, 45).

2. **Varier teknikerne i forslagene**
   - Sørg for at algoritmen faktisk returnerer flere forskjellige teknikere når det er mulig.
   - Seed mer realistiske bookinger på forhånd (noen teknikere opptatt i Bergen, andre ledige i nærområdet).

3. **Legg til "reason" tekst som er menneskelig**
   - "Samme område (Åsane), 18 min reise fra forrige jobb"
   - "Innenfor korridor Førde → Bergen, 42 min total reisetid"
   - "Tidlig i perioden – god buffer"

4. **Forbedre forslags-UI (React komponent)**
   Anbefalt layout for hvert forslag (kort):
   - **Topp:** Teknikernavn + dato + klokkeslett (f.eks. "Ola Nordmann – 27. juni 06:00–08:00")
   - **Badge:** Fargekodet score (grønn >80, gul 50–80, rød <50)
   - **Detaljer:** Reisetid, avstand, reason-tekst
   - **Knapp:** "Velg dette tidspunktet" (primær handling)

   Når man klikker "Velg":
   - Kall backend for å booke / oppdatere ordre
   - Vis suksessmelding ("Ordre planlagt med Ola Nordmann")
   - Oppdater ordre-listen / status i UI (optimistic update eller refresh)

**Quick win:** Hardkod 3–4 gode forslag midlertidig mens du fikser algoritmen, så demoen ser bra ut allerede i kveld.

---

### Fase 2: Gjør UI levende og profesjonell (2–3 kvelder)

Nåværende UI er veldig "liste + knapp". Vi skal gjøre den til noe som føles som et ekte verktøy.

**Anbefalte forbedringer:**

**A. Hoveddashboard / Ordrevisning**
- Bruk **kort** i stedet for rene lister (Tailwind cards med shadow, border-radius, hover effects).
- Når du klikker på en ordre → åpne en pen **sidepanel** eller modal med:
  - Ordredetaljer
  - "Finn ledig tid"-knapp (stor og tydelig)
  - Under den: **Forslagsliste** (fra Fase 1)
  - Status-badge med farge (Under planlegging / Planlagt / I arbeid / Ferdig)

**B. Forslag-delen (viktig for demo)**
- Vis kartet rett under eller ved siden av forslagslisten.
- Når du hoverer et forslag → highlight relevant område på kartet (hvis mulig).
- Legg til "Åpne i Google Maps" lenke på hvert forslag (bruk `https://www.google.com/maps/dir/?api=1&destination=lat,lng`).

**C. Tekniker-view (mobil)**
- Gjør den mer app-lignende:
  - Stor "Start jobb" / "Fullfør jobb" knapp (med bekreftelse).
  - Interaktiv sjekkliste: Klikk på raden for å toggle checked + valgfritt kommentar.
  - Enkel "Legg til materiell" (input + legg til-knapp, vises som tags).
  - Når jobb fullføres → vis en **AI Review modal** (selv om den er mock først).

**D. Generell polish**
- Legg til **toast-notifikasjoner** (react-hot-toast eller lignende) for alle handlinger.
- Legg til **loading states** (spinnere på "Suggest time" og "Create Order").
- Bruk **fargepalett** konsekvent (f.eks. blå hovedfarge + grønn for suksess).
- Bedre tomme tilstander ("Ingen åpne ordre" med fin illustrasjon eller tekst).
- Responsive forbedringer – spesielt technician view skal føles bra på telefon.

---

### Fase 3: Demo-magi & Wow-funksjoner (2–4 kvelder)

Dette er det som skiller "en ok prototype" fra "dette er faktisk smart og gjennomtenkt".

**1. End-to-end flyt for periodiske jobber + avvik (sterkt argument)**
- Når en ordre settes til "Ferdig":
  - Vis en fin modal:  
    **"Dette er en årskontroll – vil du opprette neste års kontroll automatisk?"**
  - Samme modal eller etterfølgende:  
    **"Det ble registrert avvik. Vil du opprette en serviceordre for utbedring?"**
- Når bruker klikker Ja → opprett ny ordre i bakgrunnen med kopiert info + oppdatert navn ("Årskontroll 2027") og vis den i listen.

**2. Sikkerhetsklarering demo (viser modenhet)**
- Ha minst én kunde markert som `requires_clearance: true`.
- I Calendar View: Når rolle = "koordinator uten clearance" → vis sensitive oppdrag som **"🔒 Super secret mission"** eller **"Ikke deklarert oppdrag"**.
- Bytt rolle til "Leder / klarert" → samme kalender viser ekte kundedata.
- Dette tar 30 sekunder å vise og gir veldig sterkt inntrykk.

**3. Enkel AI-sjekk med Ollama (valgfritt men kult)**
- Når tekniker fullfører en jobb → send sjekkliste + registrert materiell til Ollama.
- Vis resultatet pent:
  - Grønn boks: "Anlegg godkjent"
  - Gul/oransje boks med advarsler: "Sylinder overdue på trykktest" + "Batteri byttet ikke ført opp i materielliste"
- Du kan starte med en **mock** av AI-svaret først, så bytte til ekte Ollama når alt annet er på plass.

**4. Bedre data-seeding**
- Lag et `seed-realistic.js` script som oppretter:
  - 2–3 teknikere med bookinger spredt over de neste 7–10 dagene
  - Noen ordre som allerede er planlagt
  - Én sensitiv kunde
- Kjør seed hver gang du starter demoen (eller ha en "Reset demo data" knapp).

---

### Fase 4: Siste finpuss før pitch (1 kveld)

- Legg til en **"Demo mode" banner** øverst med kort tekst: "Demo-versjon – all data er fiktiv".
- Lag et enkelt **demo-script** (tekstfil eller slide) med nøyaktig hva du skal klikke i hvilken rekkefølge (så du ikke glemmer noe under presentasjonen).
- Test hele flyten på telefon + PC (samme WiFi).
- Ta 2–3 screenshots/video av de beste øyeblikkene (f.eks. forslag med gode scorer + AI review + auto-opprettelse av neste ordre).

---

## 👥 Ny tilleggsfunksjon: Enkel User Management & Login Demo

Dette er en **veldig god idé** for å vise modenhet rundt tilgangskontroll – spesielt siden du allerede har tenkt på sikkerhetsklarering og masking.

**Mål for demoen:**
- Vise at systemet støtter forskjellige brukerroller og tilgangsnivåer.
- Admin ("Morten") kan se og redigere brukere/roller.
- Vanlige brukere ser begrenset brukerliste.
- Login er superenkel (fornavn + passord "demo") – kun for demo.

### Enkel implementasjon (demo-nivå)

**Backend (seed + endpoints):**
- Legg til en `users` tabell/array i seed data med felter:
  ```js
  {
    id: 1,
    firstName: "Morten",
    lastName: "Leder",
    role: "admin",
    clearanceLevel: 3,
    password: "demo"   // kun for demo
  },
  {
    id: 2,
    firstName: "Kai",
    lastName: "Koordinator",
    role: "coordinator",
    clearanceLevel: 2,
    password: "demo"
  },
  {
    id: 3,
    firstName: "Ola",
    lastName: "Tekniker",
    role: "technician",
    clearanceLevel: 1,
    password: "demo"
  }
  ```

- Enkle endpoints:
  - `POST /api/login` → returnerer user object (fake JWT eller bare user data)
  - `GET /api/users` → filtrert basert på current user role
  - `PUT /api/users/:id` → kun admin kan endre role/clearance

**Frontend:**
- Enkel login-side eller modal (input for fornavn + passord-felt med "demo" som default).
- Når innlogget → lagre `currentUser` i React state / context.
- **User list** (ny side eller i en fane):
  - Admin ser alle brukere + kan endre rolle via dropdown + "Lagre".
  - Coordinator ser kun team-medlemmer (f.eks. teknikere + andre koordinatorer).
  - Technician ser minimal liste eller ingenting.
- Koble til eksisterende masking:
  - Når du bytter bruker (via en "Bytt bruker"-knapp eller login), oppdateres kalenderen automatisk med riktig masking ("Super secret mission" for lav clearance).

### Demo-flow (supert å vise)

1. Start som "Morten" (admin) → vis full user list + mulighet til å endre roller.
2. Bytt til "Kai" (koordinator) → user list er begrenset, men kalenderen viser mer info.
3. Bytt til "Ola" (tekniker) → minimal brukeroversikt + kalender viser "🔒 Super secret mission" på sensitive oppdrag.
4. (Valgfritt) Vis at endringer i roller umiddelbart påvirker hva man ser.

Dette tar bare 1–2 minutter å demonstrere, men gir veldig sterkt inntrykk av at systemet er gjennomtenkt rundt sikkerhet og tilgangsstyring.

**Anbefalt plassering i planen:** Legg det til som **Fase 3.5** (etter auto-opprettelse av ordre, før siste finpuss). Det er en fin "enterprise touch" uten mye arbeid.

---

## 📋 Anbefalt rekkefølge akkurat nå

| Dag/kveld | Hva du gjør                                      | Effekt på demo                  | Vanskelighetsgrad |
|-----------|--------------------------------------------------|---------------------------------|-------------------|
| 1         | Fiks scoring + varierte forslag + reason-tekst   | Høyest impact                   | Medium            |
| 2         | Forbedre forslags-UI (kort + farge + knapp)      | Ser profesjonell ut             | Lett–medium       |
| 3         | "Velg tidspunkt" oppdaterer ordre + status       | End-to-end flyt føles ekte      | Medium            |
| 4         | Penere kort-layout + toast + loading states      | Ser levende og polert ut        | Lett              |
| 5         | Auto-opprett neste år + avvik modal              | "Dette tenker fremover"-wow     | Medium            |
| 5.5       | Enkel login + User list med rollebasert visning  | Viser tilgangskontroll          | Lett–medium       |
| 6         | Sikkerhetsmasking i kalender + role switch       | Viser modenhet og sikkerhet     | Lett              |
| 7         | Test hele demo-flyten + finpuss + screenshots    | Klar til pitch                  | Lett              |

---

## 💡 Ekstra tips

- **Start med Fase 1 + første del av Fase 2.** Da har du allerede noe som ser smart og brukbart ut.
- Bruk **DaisyUI** eller **shadcn/ui** komponenter hvis du vil ha finere UI raskt uten å skrive masse CSS.
- For kartet: Vurder å vise tech base + jobb-lokasjon + en stiplet linje for "korridor" (selv om det er forenklet).
- Ha en **"Reset to demo data"** knapp øverst – veldig nyttig når du tester mye.

---

Du er allerede kommet overraskende langt med backend + basic frontend.  
Nå handler det mest om **å få algoritmen til å skinne** og **løfte det visuelle** fra "prototype" til "dette er et skikkelig verktøy".

Hvis du vil, kan jeg hjelpe deg med:
- Konkret kode for en forbedret `scoring` + `suggest` funksjon
- React-komponent for pene forslags-kort
- Modal for "Opprett neste årskontroll + serviceordre"
- Eller en oppdatert versjon av `Nortronik_Demo_Plan.md` med denne polish-planen integrert

Bare si hva du vil ta fatt på først – så lager jeg det klare til å kopiere inn. 

Du har kommet til det morsomme stadiet nå. La oss gjøre denne demoen skikkelig bra! 🚀

---

*Opprettet: 2026-06-26*  
*Basert på skjermbildene du delte + tidligere plan*