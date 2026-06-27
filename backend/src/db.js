const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { calculateSlotScore } = require('./utils/scoring');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'demo.db');

function ensureDir(p) {
  const d = path.dirname(p);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

ensureDir(DB_PATH);

const db = new Database(DB_PATH);

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY,
      name TEXT,
      address TEXT,
      lat REAL,
      lng REAL,
      postal_code TEXT,
      region TEXT,
      requires_clearance INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS technicians (
      id INTEGER PRIMARY KEY,
      name TEXT,
      base_lat REAL,
      base_lng REAL,
      skills TEXT,
      clearance_level INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER,
      type TEXT,
      status TEXT,
      estimated_hours REAL,
      lat REAL,
      lng REAL,
      assigned_tech_id INTEGER,
      scheduled_start TEXT,
      scheduled_end TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY,
      technician_id INTEGER,
      order_id INTEGER,
      start_time TEXT,
      end_time TEXT
    );
    CREATE TABLE IF NOT EXISTS checklist_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER,
      description TEXT,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const row = db.prepare('SELECT COUNT(1) as c FROM customers').get();
  if (row.c === 0) seed();
}

function seed() {
  // Clear existing data
  db.exec('DELETE FROM checklist_items');
  db.exec('DELETE FROM bookings');
  db.exec('DELETE FROM orders');
  db.exec('DELETE FROM technicians');
  db.exec('DELETE FROM customers');

  // ===== KUNDER =====
  const insertCustomer = db.prepare('INSERT INTO customers (name,address,lat,lng,postal_code,region,requires_clearance) VALUES (?,?,?,?,?,?,?)');
  
  // Bergen-området
  insertCustomer.run('Bergen Energi', 'Åsane, Bergen', 60.435, 5.348, '5115', 'Vestland', 0);
  insertCustomer.run('Lyse Energi', 'Fana, Bergen', 60.350, 5.300, '5221', 'Vestland', 0);
  insertCustomer.run('Bergenshalvøens Kommunale Kraftselskap', 'Loddefjord, Bergen', 60.400, 5.250, '5124', 'Vestland', 0);
  insertCustomer.run('Vestkanten Energi', 'Arna, Bergen', 60.410, 5.360, '5215', 'Vestland', 0);
  
  // Førde-området
  insertCustomer.run('Førde Industri', 'Førde, Sogn og Fjordane', 61.450, 5.833, '6800', 'Vestland', 0);
  insertCustomer.run('Sogn og Fjordane Energi', 'Sande, Sogn og Fjordane', 61.500, 5.900, '6823', 'Vestland', 0);
  insertCustomer.run('Jølster Kraft', 'Skei, Jølster', 61.550, 6.000, '6843', 'Vestland', 0);
  
  // Tromsø-området (sensitive kunder)
  insertCustomer.run('Hemmeligholdt Kunde', 'Tromsø sentrum', 69.649, 18.956, '9008', 'Troms og Finnmark', 1);
  insertCustomer.run('Statens Hemmelige Anlegg', 'Kvaløya, Tromsø', 69.680, 18.900, '9010', 'Troms og Finnmark', 1);
  
  // Nord-Norge (større radius)
  insertCustomer.run('Finnmark Kraft', 'Hammerfest', 70.663, 23.678, '9600', 'Finnmark', 0);
  insertCustomer.run('Troms Kraft', 'Harstad', 68.798, 16.547, '9406', 'Troms og Finnmark', 0);

  // ===== TEKNIKERE =====
  const insertTech = db.prepare('INSERT INTO technicians (name,base_lat,base_lng,skills,clearance_level) VALUES (?,?,?,?,?)');
  
  // Bergen-baserte teknikere
  insertTech.run('Ola Nordmann', 60.391, 5.322, JSON.stringify(['årskontroll', 'service', 'inspection', 'trykktest']), 1);
  insertTech.run('Kari Teknisk', 60.385, 5.332, JSON.stringify(['inspection', 'årskontroll', 'vedlikehold']), 0);
  insertTech.run('Per Fiksit', 60.420, 5.350, JSON.stringify(['service', 'reparasjon', 'trykktest']), 1);
  insertTech.run('Anne Service', 60.405, 5.315, JSON.stringify(['årskontroll', 'service', 'inspection']), 0);
  
  // Førde-baserte teknikere
  insertTech.run('Lars Fjord', 61.440, 5.820, JSON.stringify(['årskontroll', 'inspection', 'service']), 0);
  insertTech.run('Marte Vest', 61.460, 5.850, JSON.stringify(['service', 'vedlikehold', 'trykktest']), 1);
  
  // Tromsø-baserte teknikere (med clearance)
  insertTech.run('Morten Polar', 69.650, 18.950, JSON.stringify(['årskontroll', 'service', 'sikkerhet']), 3);
  insertTech.run('Anne Nordlys', 69.670, 18.920, JSON.stringify(['inspection', 'vedlikehold', 'trykktest']), 2);
  insertTech.run('Knut Isfjord', 69.660, 18.940, JSON.stringify(['årskontroll', 'service', 'inspection']), 2);

  // ===== ORDRE (noen allerede planlagt) =====
  const insertOrder = db.prepare('INSERT INTO orders (customer_id,type,status,estimated_hours,lat,lng,assigned_tech_id,scheduled_start,scheduled_end,notes) VALUES (?,?,?,?,?,?,?,?,?,?)');
  
  // Åpne ordre (venter på planlegging) - 12 stk
  insertOrder.run(1, 'årskontroll', 'open', 3, 60.435, 5.348, null, null, null, 'Årlig kontroll av trykkluftsanlegg');
  insertOrder.run(2, 'service', 'open', 2, 60.350, 5.300, null, null, null, 'Service på transformator');
  insertOrder.run(4, 'inspection', 'open', 2.5, 60.410, 5.360, null, null, null, 'Rutineinspeksjon av elektrisk anlegg');
  insertOrder.run(5, 'service', 'open', 3, 61.450, 5.833, null, null, null, 'Service på kraftstasjon i Førde');
  insertOrder.run(7, 'årskontroll', 'open', 4, 61.500, 5.900, null, null, null, 'Årlig kontroll av solcelleanlegg');
  insertOrder.run(9, 'årskontroll', 'open', 4, 69.649, 18.956, null, null, null, 'Sensitiv årskontroll - krever clearance');
  insertOrder.run(10, 'service', 'open', 2.5, 69.680, 18.900, null, null, null, 'Service på hemmelig anlegg');
  insertOrder.run(11, 'inspection', 'open', 3.5, 70.663, 23.678, null, null, null, 'Årlig kontroll i Finnmark');
  insertOrder.run(12, 'trykktest', 'open', 2, 68.798, 16.547, null, null, null, 'Trykktest av rørsystem i Harstad');
  insertOrder.run(3, 'vedlikehold', 'open', 2, 60.400, 5.250, null, null, null, 'Rutinevedlikehold på Loddefjord anlegg');
  insertOrder.run(6, 'inspection', 'open', 2, 61.500, 5.900, null, null, null, 'Inspeksjon av Sogn og Fjordane anlegg');
  insertOrder.run(8, 'service', 'open', 3, 69.680, 18.900, null, null, null, 'Service på Statens anlegg');

  // Planlagte ordre (for å skape bookinger) - 6 stk
  const orderId1 = insertOrder.run(3, 'service', 'planlagt', 2, 60.400, 5.250, 2, '2026-08-10T08:00:00Z', '2026-08-10T10:00:00Z', 'Service på kraftstasjon').lastInsertRowid;
  const orderId2 = insertOrder.run(6, 'inspection', 'planlagt', 3, 61.500, 5.900, 5, '2026-08-10T10:00:00Z', '2026-08-10T13:00:00Z', 'Inspeksjon av solcelleanlegg').lastInsertRowid;
  const orderId3 = insertOrder.run(8, 'årskontroll', 'planlagt', 3, 69.680, 18.900, 7, '2026-08-11T09:00:00Z', '2026-08-11T12:00:00Z', 'Årlig kontroll - sensitiv kunde').lastInsertRowid;
  const orderId4 = insertOrder.run(1, 'trykktest', 'planlagt', 2, 60.435, 5.348, 1, '2026-08-12T13:00:00Z', '2026-08-12T15:00:00Z', 'Trykktest av rørsystem').lastInsertRowid;
  const orderId5 = insertOrder.run(2, 'vedlikehold', 'planlagt', 1.5, 60.350, 5.300, 3, '2026-08-13T08:00:00Z', '2026-08-13T09:30:00Z', 'Rutinevedlikehold').lastInsertRowid;
  const orderId6 = insertOrder.run(4, 'årskontroll', 'planlagt', 2.5, 60.410, 5.360, 4, '2026-08-14T10:00:00Z', '2026-08-14T12:30:00Z', 'Årlig kontroll på Arna anlegg').lastInsertRowid;

  // ===== BOOKINGER (kalender for teknikere) =====
  const insertBooking = db.prepare('INSERT INTO bookings (technician_id,order_id,start_time,end_time) VALUES (?,?,?,?)');
  
  // Ola Nordmann (ID 1)
  insertBooking.run(1, orderId4, '2026-08-12T13:00:00Z', '2026-08-12T15:00:00Z');
  insertBooking.run(1, 1, '2026-08-15T08:00:00Z', '2026-08-15T11:00:00Z');
  insertBooking.run(1, 5, '2026-08-18T09:00:00Z', '2026-08-18T11:00:00Z');
  
  // Kari Teknisk (ID 2)
  insertBooking.run(2, orderId1, '2026-08-10T08:00:00Z', '2026-08-10T10:00:00Z');
  insertBooking.run(2, 2, '2026-08-14T10:00:00Z', '2026-08-14T12:00:00Z');
  insertBooking.run(2, 8, '2026-08-17T13:00:00Z', '2026-08-17T15:00:00Z');
  
  // Per Fiksit (ID 3)
  insertBooking.run(3, orderId5, '2026-08-13T08:00:00Z', '2026-08-13T09:30:00Z');
  insertBooking.run(3, 1, '2026-08-16T09:00:00Z', '2026-08-16T11:00:00Z');
  insertBooking.run(3, 9, '2026-08-19T10:00:00Z', '2026-08-19T12:00:00Z');
  
  // Anne Service (ID 4)
  insertBooking.run(4, orderId6, '2026-08-14T10:00:00Z', '2026-08-14T12:30:00Z');
  insertBooking.run(4, 4, '2026-08-17T10:00:00Z', '2026-08-17T12:00:00Z');
  insertBooking.run(4, 7, '2026-08-20T08:00:00Z', '2026-08-20T10:00:00Z');
  
  // Lars Fjord (ID 5)
  insertBooking.run(5, orderId2, '2026-08-10T10:00:00Z', '2026-08-10T13:00:00Z');
  insertBooking.run(5, 2, '2026-08-17T10:00:00Z', '2026-08-17T12:00:00Z');
  insertBooking.run(5, 10, '2026-08-21T09:00:00Z', '2026-08-21T11:00:00Z');
  
  // Marte Vest (ID 6)
  insertBooking.run(6, 7, '2026-08-12T09:00:00Z', '2026-08-12T11:00:00Z');
  insertBooking.run(6, 9, '2026-08-19T10:00:00Z', '2026-08-19T13:00:00Z');
  
  // Morten Polar (ID 7)
  insertBooking.run(7, orderId3, '2026-08-11T09:00:00Z', '2026-08-11T12:00:00Z');
  insertBooking.run(7, 9, '2026-08-18T08:00:00Z', '2026-08-18T11:00:00Z');
  insertBooking.run(7, 12, '2026-08-22T09:00:00Z', '2026-08-22T12:00:00Z');
  
  // Anne Nordlys (ID 8)
  insertBooking.run(8, 11, '2026-08-12T09:00:00Z', '2026-08-12T11:00:00Z');
  insertBooking.run(8, 10, '2026-08-19T10:00:00Z', '2026-08-19T13:00:00Z');
  
  // Knut Isfjord (ID 9)
  insertBooking.run(9, 12, '2026-08-13T13:00:00Z', '2026-08-13T15:00:00Z');
  insertBooking.run(9, 8, '2026-08-20T10:00:00Z', '2026-08-20T12:00:00Z');

  // ===== SJEKKLISTER (for demo) =====
  const insertChecklist = db.prepare('INSERT INTO checklist_items (order_id,description,completed) VALUES (?,?,?)');
  
  // Sjekkliste for ordre 1 (Bergen Energi - årskontroll)
  insertChecklist.run(1, 'Sjekk trykkluftstank for korrosjon', 0);
  insertChecklist.run(1, 'Verifiser trykknivå', 0);
  insertChecklist.run(1, 'Test sikkerhetsventiler', 0);
  insertChecklist.run(1, 'Kontroller oljenivå i kompressor', 0);
  insertChecklist.run(1, 'Sjekk tilkoblinger og slanger', 0);
  
  // Sjekkliste for ordre 2 (Lyse Energi - service)
  insertChecklist.run(2, 'Mål isolasjonsmotstand', 0);
  insertChecklist.run(2, 'Sjekk tilkoblinger', 0);
  insertChecklist.run(2, 'Rengjør kjøleflater', 1);
  insertChecklist.run(2, 'Test nødstopp-funksjonalitet', 0);
  
  // Sjekkliste for ordre 5 (Førde Industri - service)
  insertChecklist.run(5, 'Visuell inspeksjon av anlegg', 0);
  insertChecklist.run(5, 'Sjekk temperaturmålinger', 0);
  insertChecklist.run(5, 'Test alarmfunksjoner', 0);
  
  // Sjekkliste for ordre 9 (Hemmeligholdt Kunde - sensitiv)
  insertChecklist.run(9, 'Sikkerhetssjekk av inngangssystem', 0);
  insertChecklist.run(9, 'Verifiser alarmfunksjonalitet', 0);
  insertChecklist.run(9, 'Kontroller overvåkningssystem', 0);
}

init();

function parseISO(s) {
  return s ? new Date(s) : null;
}

function getBookingsForTech(techId) {
  return db.prepare('SELECT * FROM bookings WHERE technician_id = ? ORDER BY start_time').all(techId).map(b => ({
    ...b,
    start: parseISO(b.start_time),
    end: parseISO(b.end_time)
  }));
}

function getChecklistForOrder(orderId) {
  return db.prepare('SELECT * FROM checklist_items WHERE order_id = ? ORDER BY id').all(orderId);
}

function createChecklistItem(orderId, description) {
  const st = db.prepare('INSERT INTO checklist_items (order_id,description,completed) VALUES (?,?,0)');
  const info = st.run(orderId, description);
  return info.lastInsertRowid;
}

function getCalendarItems(role) {
  const items = db.prepare(`
    SELECT b.id AS booking_id,
           o.id AS order_id,
           o.customer_id,
           o.type,
           o.status,
           o.assigned_tech_id AS technician_id,
           o.lat,
           o.lng,
           c.name AS customer_name,
           c.address AS customer_address,
           c.requires_clearance,
           t.name AS technician_name,
           b.start_time,
           b.end_time
    FROM bookings b
    JOIN orders o ON o.id = b.order_id
    JOIN customers c ON c.id = o.customer_id
    JOIN technicians t ON t.id = b.technician_id
    ORDER BY b.start_time
  `).all();

  return items.map(item => {
    const displayName = item.requires_clearance && role !== 'manager' && role !== 'admin'
      ? '🔒 Super secret mission'
      : `${item.customer_name} (${item.type})`;
    return {
      ...item,
      display_name: displayName,
      masked: item.requires_clearance && role !== 'manager' && role !== 'admin'
    };
  });
}

function updateChecklistItem(itemId, completed) {
  const st = db.prepare('UPDATE checklist_items SET completed = ? WHERE id = ?');
  const info = st.run(completed ? 1 : 0, itemId);
  return info.changes;
}

function updateOrderStatus(orderId, status, assignedTechId = null, scheduledStart = null, scheduledEnd = null) {
  let st;
  if (assignedTechId !== null && scheduledStart && scheduledEnd) {
    st = db.prepare('UPDATE orders SET status = ?, assigned_tech_id = ?, scheduled_start = ?, scheduled_end = ? WHERE id = ?');
    const info = st.run(status, assignedTechId, scheduledStart, scheduledEnd, orderId);
    
    // Opprett booking hvis ordre er planlagt
    if (status === 'planlagt' && assignedTechId) {
      const insertBooking = db.prepare('INSERT INTO bookings (technician_id, order_id, start_time, end_time) VALUES (?,?,?,?)');
      insertBooking.run(assignedTechId, orderId, scheduledStart, scheduledEnd);
    }
    return info.changes;
  } else {
    st = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
    const info = st.run(status, orderId);
    return info.changes;
  }
}

function updateOrderFull(orderId, updates) {
  const fields = [];
  const values = [];
  
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  
  fields.push('id = ?');
  values.push(orderId);
  
  const st = db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`);
  const info = st.run(...values);
  return info.changes;
}

function findGaps(bookings, dayStart, dayEnd, neededHours) {
  const neededMs = neededHours * 3600 * 1000;
  const intervals = bookings
    .map(b => ({ start: b.start, end: b.end }))
    .filter(i => i.end > dayStart && i.start < dayEnd)
    .sort((a,b)=>a.start-b.start);

  const gaps = [];
  let cursor = new Date(dayStart);

  for (const iv of intervals) {
    if (iv.start - cursor >= neededMs) {
      gaps.push({ start: new Date(cursor), end: new Date(cursor.getTime() + neededMs) });
    }
    if (iv.end > cursor) cursor = new Date(iv.end);
  }

  if (dayEnd - cursor >= neededMs) {
    gaps.push({ start: new Date(cursor), end: new Date(cursor.getTime() + neededMs) });
  }

  return gaps;
}

// Forbedret suggestForOrder med bedre scoring og korridor-logikk
function suggestForOrder(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return [];

  // Hent kundeinfo for å sjekke clearance
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(order.customer_id);
  
  const techs = db.prepare('SELECT * FROM technicians').all().filter(t => {
    try {
      const skills = JSON.parse(t.skills || '[]');
      // Sjekk om tekniker har nødvendig kompetanse
      const hasSkill = skills.includes(order.type);
      // Sjekk clearance hvis kunden krever det
      const hasClearance = !customer?.requires_clearance || t.clearance_level >= 2;
      return hasSkill && hasClearance;
    } catch(e){ return false }
  });

  const now = new Date();
  const horizonDays = 10; // Se 10 dager frem
  const suggestions = [];

  for (const tech of techs) {
    const bookings = getBookingsForTech(tech.id);

    for (let d = 0; d < horizonDays; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      const dayStart = new Date(day); dayStart.setHours(7, 0, 0, 0); // Start kl 07
      const dayEnd = new Date(day); dayEnd.setHours(17, 0, 0, 0);   // Slutt kl 17

      const gaps = findGaps(bookings, dayStart, dayEnd, order.estimated_hours || 2);

      for (const g of gaps) {
        // Finn forrige og neste booking for reiseberegning
        const prevBooking = bookings.find(b => b.end <= g.start);
        const nextBooking = bookings.find(b => b.start >= g.end);
        
        // Get customer location for this order
        const orderCustomer = db.prepare('SELECT lat, lng FROM customers WHERE id = ?').get(order.customer_id);
        
        const slotInfo = calculateSlotScore({
          tech,
          gap: {
            start: g.start,
            end: g.end,
            prevLat: prevBooking ? orderCustomer?.lat : tech.base_lat,
            prevLng: prevBooking ? orderCustomer?.lng : tech.base_lng,
            nextLat: nextBooking ? orderCustomer?.lat : tech.base_lat,
            nextLng: nextBooking ? orderCustomer?.lng : tech.base_lng
          },
          newJob: {
            lat: order.lat,
            lng: order.lng,
            dueDate: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
            postal: customer?.postal_code
          },
          existingBookings: bookings
        });

        suggestions.push({
          technician: tech,
          start: g.start.toISOString(),
          end: g.end.toISOString(),
          score: slotInfo.score,
          reason: slotInfo.reason,
          travelTimeMinutes: slotInfo.travelTimeMinutes,
          travelDistanceKm: slotInfo.travelDistanceKm
        });
      }
    }
  }

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 8); // Returner opp til 8 forslag
}

module.exports = {
  db,
  getCustomers: () => db.prepare('SELECT * FROM customers').all(),
  getCustomerById: (id) => db.prepare('SELECT * FROM customers WHERE id = ?').get(id),
  createCustomer: ({ name, address, lat, lng, postal_code, region, requires_clearance }) => {
    const st = db.prepare('INSERT INTO customers (name,address,lat,lng,postal_code,region,requires_clearance) VALUES (?,?,?,?,?,?,?)');
    const info = st.run(name, address, lat || null, lng || null, postal_code || null, region || null, requires_clearance ? 1 : 0);
    return info.lastInsertRowid;
  },
  getTechnicians: () => db.prepare('SELECT * FROM technicians').all(),
  getTechnicianById: (id) => db.prepare('SELECT * FROM technicians WHERE id = ?').get(id),
  getBookingsForTech,
  getChecklistForOrder,
  createChecklistItem,
  updateChecklistItem,
  updateOrderStatus,
  updateOrderFull,
  getCalendarItems,
  getOrders: () => db.prepare('SELECT * FROM orders').all(),
  getOrderById: (id) => db.prepare('SELECT * FROM orders WHERE id = ?').get(id),
  createOrder: ({ customer_id, type, estimated_hours, lat, lng, assigned_tech_id, notes }) => {
    let latv = lat, lngv = lng;
    if ((!latv || !lngv) && customer_id) {
      const c = db.prepare('SELECT lat,lng FROM customers WHERE id = ?').get(customer_id);
      if (c) { latv = latv || c.lat; lngv = lngv || c.lng }
    }
    const st = db.prepare('INSERT INTO orders (customer_id,type,status,estimated_hours,lat,lng,assigned_tech_id,notes) VALUES (?,?,?,?,?,?,?,?)');
    const info = st.run(customer_id, type, 'open', estimated_hours || 1, latv, lngv, assigned_tech_id || null, notes || null);
    return info.lastInsertRowid;
  },
  suggestForOrder,
  // Reset database for demo
  resetDemoData: () => {
    db.exec('DELETE FROM checklist_items');
    db.exec('DELETE FROM bookings');
    db.exec('DELETE FROM orders');
    db.exec('DELETE FROM technicians');
    db.exec('DELETE FROM customers');
    seed();
    return { success: true, message: 'Demo data reset' };
  }
};
