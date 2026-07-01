const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { calculateSlotScore, doTimeSlotsOverlap } = require('./utils/scoring');
const { hashPassword } = require('./auth');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'demo.db');

function ensureDir(p) {
  const d = path.dirname(p);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

ensureDir(DB_PATH);

let db;

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id INTEGER,
      name TEXT,
      address TEXT,
      lat REAL,
      lng REAL,
      postal_code TEXT,
      region TEXT,
      requires_clearance INTEGER DEFAULT 0,
      contact_person TEXT,
      phone TEXT,
      email TEXT
    );

    CREATE TABLE IF NOT EXISTS technicians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      base_lat REAL,
      base_lng REAL,
      skills TEXT,
      clearance_level INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      type TEXT,
      status TEXT,
      estimated_hours REAL,
      lat REAL,
      lng REAL,
      assigned_tech_id INTEGER,
      scheduled_start TEXT,
      scheduled_end TEXT,
      notes TEXT,
      invoiced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      technician_id INTEGER,
      order_id INTEGER,
      start_time TEXT,
      end_time TEXT
    );

    CREATE TABLE IF NOT EXISTS checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      section TEXT,
      description TEXT,
      comment TEXT,
      status TEXT,
      order_index INTEGER DEFAULT 0,
      template_item_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS checklist_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      order_type TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS checklist_template_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER,
      section TEXT,
      description TEXT,
      order_index INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT,
      name TEXT,
      role TEXT,
      technician_id INTEGER,
      email TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function dropSchema() {
  db.exec(`
    DROP TABLE IF EXISTS checklist_items;
    DROP TABLE IF EXISTS checklist_template_items;
    DROP TABLE IF EXISTS checklist_templates;
    DROP TABLE IF EXISTS bookings;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS technicians;
    DROP TABLE IF EXISTS customers;
    DROP TABLE IF EXISTS users;
  `);
}

async function initDb() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  createSchema();

  const customerCount = db.prepare('SELECT COUNT(*) AS n FROM customers').get().n;
  if (customerCount === 0) {
    seed();
  }

  return Promise.resolve();
}

function slugifyUsername(name) {
  return name
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

function seed() {
  dropSchema();
  createSchema();

  // external_id = samme id som i fakturasystemets kundeliste (invoice-app),
  // slik at "Send til fakturasystem" fungerer på eksisterende demo-ordre uten
  // at man må kjøre en kunde-synk først.
  const insertCustomer = db.prepare(`INSERT INTO customers (id,external_id,name,address,lat,lng,postal_code,region,requires_clearance) VALUES (?,?,?,?,?,?,?,?,?)`);
  const customers = [
    [1, 'Bergen Energi', 'Åsane, Bergen', 60.435, 5.348, '5115', 'Vestland', 0],
    [2, 'Lyse Energi', 'Fana, Bergen', 60.350, 5.300, '5221', 'Vestland', 0],
    [3, 'Bergenshalvøens Kommunale Kraftselskap', 'Loddefjord, Bergen', 60.400, 5.250, '5124', 'Vestland', 0],
    [4, 'Vestkanten Energi', 'Arna, Bergen', 60.410, 5.360, '5215', 'Vestland', 0],
    [5, 'Førde Industri', 'Førde, Sogn og Fjordane', 61.450, 5.833, '6800', 'Vestland', 0],
    [6, 'Sogn og Fjordane Energi', 'Sande, Sogn og Fjordane', 61.500, 5.900, '6823', 'Vestland', 0],
    [7, 'Jølster Kraft', 'Skei, Jølster', 61.550, 6.000, '6843', 'Vestland', 0],
    [8, 'Hemmeligholdt Kunde', 'Tromsø sentrum', 69.649, 18.956, '9008', 'Troms og Finnmark', 1],
    [9, 'Statens Hemmelige Anlegg', 'Kvaløya, Tromsø', 69.680, 18.900, '9010', 'Troms og Finnmark', 1],
    [10, 'Finnmark Kraft', 'Hammerfest', 70.663, 23.678, '9600', 'Finnmark', 0],
    [11, 'Troms Kraft', 'Harstad', 68.798, 16.547, '9406', 'Troms og Finnmark', 0]
  ];
  for (const c of customers) {
    const [id, ...rest] = c;
    insertCustomer.run(id, id, ...rest);
  }

  const insertTech = db.prepare(`INSERT INTO technicians (id,name,base_lat,base_lng,skills,clearance_level) VALUES (?,?,?,?,?,?)`);
  const technicians = [
    [1, 'Ola Nordmann', 62.470, 6.150, JSON.stringify(['årskontroll', 'service', 'inspection', 'trykktest']), 1],
    [2, 'Kari Teknisk', 62.472, 6.155, JSON.stringify(['inspection', 'årskontroll', 'vedlikehold']), 0],
    [3, 'Lars Fjord', 61.440, 5.820, JSON.stringify(['årskontroll', 'inspection', 'service']), 0],
    [4, 'Marte Vest', 61.460, 5.850, JSON.stringify(['service', 'vedlikehold', 'trykktest']), 1],
    [5, 'Per Fiksit', 61.445, 5.825, JSON.stringify(['service', 'reparasjon', 'trykktest']), 1],
    [6, 'Anne Service', 61.455, 5.845, JSON.stringify(['årskontroll', 'service', 'inspection']), 0],
    [7, 'Morten Oslo', 60.000, 11.050, JSON.stringify(['årskontroll', 'service', 'sikkerhet']), 3],
    [8, 'Anne Akershus', 59.995, 11.045, JSON.stringify(['inspection', 'vedlikehold', 'trykktest']), 2],
    [9, 'Knut Lillestrøm', 59.985, 11.055, JSON.stringify(['årskontroll', 'service', 'inspection']), 2]
  ];
  for (const t of technicians) insertTech.run(...t);

  const insertOrder = db.prepare(`INSERT INTO orders (id,customer_id,type,status,estimated_hours,lat,lng,assigned_tech_id,scheduled_start,scheduled_end,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const orders = [
    [1, 1, 'årskontroll', 'open', 3, 60.435, 5.348, null, null, null, 'Årlig kontroll av trykkluftsanlegg'],
    [2, 2, 'service', 'open', 2, 60.350, 5.300, null, null, null, 'Service på transformator'],
    [3, 4, 'inspection', 'open', 2.5, 60.410, 5.360, null, null, null, 'Rutineinspeksjon av elektrisk anlegg'],
    [4, 5, 'service', 'open', 3, 61.450, 5.833, null, null, null, 'Service på kraftstasjon i Førde'],
    [5, 7, 'årskontroll', 'open', 4, 61.500, 5.900, null, null, null, 'Årlig kontroll av solcelleanlegg'],
    [6, 9, 'årskontroll', 'open', 4, 69.649, 18.956, null, null, null, 'Sensitiv årskontroll - krever clearance'],
    [7, 10, 'service', 'open', 2.5, 69.680, 18.900, null, null, null, 'Service på hemmelig anlegg'],
    [8, 11, 'inspection', 'open', 3.5, 70.663, 23.678, null, null, null, 'Årlig kontroll i Finnmark'],
    [9, 12, 'trykktest', 'open', 2, 68.798, 16.547, null, null, null, 'Trykktest av rørsystem i Harstad'],
    [10, 3, 'vedlikehold', 'open', 2, 60.400, 5.250, null, null, null, 'Rutinevedlikehold på Loddefjord anlegg'],
    [11, 6, 'inspection', 'open', 2, 61.500, 5.900, null, null, null, 'Inspeksjon av Sogn og Fjordane anlegg'],
    [12, 8, 'service', 'open', 3, 69.680, 18.900, null, null, null, 'Service på Statens anlegg'],
    [13, 3, 'service', 'planlagt', 2, 60.400, 5.250, 2, '2026-08-10T08:00:00Z', '2026-08-10T10:00:00Z', 'Service på kraftstasjon'],
    [14, 6, 'inspection', 'planlagt', 3, 61.500, 5.900, 5, '2026-08-10T10:00:00Z', '2026-08-10T13:00:00Z', 'Inspeksjon av solcelleanlegg'],
    [15, 8, 'årskontroll', 'planlagt', 3, 69.680, 18.900, 7, '2026-08-11T09:00:00Z', '2026-08-11T12:00:00Z', 'Årlig kontroll - sensitiv kunde'],
    [16, 1, 'trykktest', 'planlagt', 2, 60.435, 5.348, 1, '2026-08-12T13:00:00Z', '2026-08-12T15:00:00Z', 'Trykktest av rørsystem'],
    [17, 2, 'vedlikehold', 'planlagt', 1.5, 60.350, 5.300, 3, '2026-08-13T08:00:00Z', '2026-08-13T09:30:00Z', 'Rutinevedlikehold'],
    [18, 4, 'årskontroll', 'planlagt', 2.5, 60.410, 5.360, 4, '2026-08-14T10:00:00Z', '2026-08-14T12:30:00Z', 'Årlig kontroll på Arna anlegg']
  ];
  for (const o of orders) insertOrder.run(...o);

  const insertBooking = db.prepare(`INSERT INTO bookings (id,technician_id,order_id,start_time,end_time) VALUES (?,?,?,?,?)`);
  const bookings = [
    [1, 1, 16, '2026-08-12T13:00:00Z', '2026-08-12T15:00:00Z'],
    [2, 1, 1, '2026-08-15T08:00:00Z', '2026-08-15T11:00:00Z'],
    [3, 1, 4, '2026-08-18T09:00:00Z', '2026-08-18T11:00:00Z'],
    [4, 2, 13, '2026-08-10T08:00:00Z', '2026-08-10T10:00:00Z'],
    [5, 2, 2, '2026-08-14T10:00:00Z', '2026-08-14T12:00:00Z'],
    [6, 2, 7, '2026-08-17T13:00:00Z', '2026-08-17T15:00:00Z'],
    [7, 3, 17, '2026-08-13T08:00:00Z', '2026-08-13T09:30:00Z'],
    [8, 3, 1, '2026-08-16T09:00:00Z', '2026-08-16T11:00:00Z'],
    [9, 3, 6, '2026-08-19T10:00:00Z', '2026-08-19T12:00:00Z'],
    [10, 4, 18, '2026-08-14T10:00:00Z', '2026-08-14T12:30:00Z'],
    [11, 4, 3, '2026-08-17T10:00:00Z', '2026-08-17T12:00:00Z'],
    [12, 4, 5, '2026-08-20T08:00:00Z', '2026-08-20T10:00:00Z'],
    [13, 5, 14, '2026-08-10T10:00:00Z', '2026-08-10T13:00:00Z'],
    [14, 5, 2, '2026-08-17T10:00:00Z', '2026-08-17T12:00:00Z'],
    [15, 5, 7, '2026-08-21T09:00:00Z', '2026-08-21T11:00:00Z'],
    [16, 6, 5, '2026-08-12T09:00:00Z', '2026-08-12T11:00:00Z'],
    [17, 6, 6, '2026-08-19T10:00:00Z', '2026-08-19T13:00:00Z'],
    [18, 7, 15, '2026-08-11T09:00:00Z', '2026-08-11T12:00:00Z'],
    [19, 7, 6, '2026-08-18T08:00:00Z', '2026-08-18T11:00:00Z'],
    [20, 7, 12, '2026-08-22T09:00:00Z', '2026-08-22T12:00:00Z'],
    [21, 8, 8, '2026-08-12T09:00:00Z', '2026-08-12T11:00:00Z'],
    [22, 8, 7, '2026-08-19T10:00:00Z', '2026-08-19T13:00:00Z'],
    [23, 9, 12, '2026-08-13T13:00:00Z', '2026-08-13T15:00:00Z'],
    [24, 9, 8, '2026-08-20T10:00:00Z', '2026-08-20T12:00:00Z']
  ];
  for (const b of bookings) insertBooking.run(...b);

  const insertChecklist = db.prepare(`INSERT INTO checklist_items (id,order_id,section,description,comment,status,order_index) VALUES (?,?,?,?,?,?,?)`);
  const checklistItems = [
    [1, 1, null, 'Sjekk trykkluftstank for korrosjon', null, null, 0],
    [2, 1, null, 'Verifiser trykknivå', null, null, 1],
    [3, 1, null, 'Test sikkerhetsventiler', null, null, 2],
    [4, 1, null, 'Kontroller oljenivå i kompressor', null, null, 3],
    [5, 1, null, 'Sjekk tilkoblinger og slanger', null, null, 4],
    [6, 2, null, 'Mål isolasjonsmotstand', null, null, 0],
    [7, 2, null, 'Sjekk tilkoblinger', null, null, 1],
    [8, 2, null, 'Rengjør kjøleflater', null, 'godkjent', 2],
    [9, 2, null, 'Test nødstopp-funksjonalitet', null, null, 3],
    [10, 4, null, 'Visuell inspeksjon av anlegg', null, null, 0],
    [11, 4, null, 'Sjekk temperaturmålinger', null, null, 1],
    [12, 4, null, 'Test alarmfunksjoner', null, null, 2],
    [13, 6, null, 'Sikkerhetssjekk av inngangssystem', null, null, 0],
    [14, 6, null, 'Verifiser alarmfunksjonalitet', null, null, 1],
    [15, 6, null, 'Kontroller overvåkningssystem', null, null, 2]
  ];
  for (const c of checklistItems) insertChecklist.run(...c);

  // ===== SJEKKLISTE-MALER =====
  const insertTemplate = db.prepare(`INSERT INTO checklist_templates (id,name,description,order_type) VALUES (?,?,?,?)`);
  insertTemplate.run(1, 'Årskontroll slukkeanlegg', 'Standard årskontroll for CO2/gass-basert slukkeanlegg', 'årskontroll');

  const insertTemplateItem = db.prepare(`INSERT INTO checklist_template_items (template_id,section,description,order_index) VALUES (?,?,?,?)`);
  const templateItems = [
    [1, 'Sylinderbankinformasjon', 'Visuell inspeksjon av sylinder'],
    [1, 'Sylinderbankinformasjon', 'Alle utløsere kontrollert og funksjonstestet'],
    [1, 'Sylinderbankinformasjon', 'Type utløsere'],
    [1, 'Sylinderbankinformasjon', 'Antall utløsere'],
    [1, 'Sylinderbankinformasjon', 'Trykk kontrollert mot spesifikasjon'],
    [1, 'Rørsystem og dyser', 'Visuell inspeksjon av rørsystem'],
    [1, 'Rørsystem og dyser', 'Dyser kontrollert for blokkering'],
    [1, 'Rørsystem og dyser', 'Rørfester og opphengsklammer kontrollert'],
    [1, 'Styringssystem', 'Detektorer funksjonstestet'],
    [1, 'Styringssystem', 'Sentral kontrollert og loggført'],
    [1, 'Styringssystem', 'Manuell utløser testet']
  ];
  templateItems.forEach(([templateId, section, description], index) => {
    insertTemplateItem.run(templateId, section, description, index);
  });

  // ===== DEMO-BRUKERE =====
  const insertUser = db.prepare(`INSERT INTO users (username,password_hash,name,role,technician_id,email) VALUES (?,?,?,?,?,?)`);
  insertUser.run('admin', hashPassword('admin'), 'Admin', 'admin', null, 'admin@nortronik.no');
  insertUser.run('leder', hashPassword('leder123'), 'Ole Hansen', 'manager', null, 'ole@nortronik.no');
  insertUser.run('koordinator', hashPassword('koordinator123'), 'Kari Nordmann', 'coordinator', null, 'kari@nortronik.no');

  const allTechs = db.prepare('SELECT id, name FROM technicians').all();
  for (const t of allTechs) {
    const username = slugifyUsername(t.name);
    insertUser.run(username, hashPassword('tekniker123'), t.name, 'technician', t.id, `${username}@nortronik.no`);
  }
}

function parseISO(s) {
  return s ? new Date(s) : null;
}

function getBookingsForTech(techId) {
  const result = db.prepare('SELECT * FROM bookings WHERE technician_id = ? ORDER BY start_time').all(techId);
  return result.map(b => ({
    ...b,
    start: parseISO(b.start_time),
    end: parseISO(b.end_time)
  }));
}

function getChecklistForOrder(orderId) {
  return db.prepare('SELECT * FROM checklist_items WHERE order_id = ? ORDER BY order_index, id').all(orderId);
}

function createChecklistItem(orderId, description, section = null) {
  const maxIndex = db.prepare('SELECT MAX(order_index) AS m FROM checklist_items WHERE order_id = ?').get(orderId);
  const nextIndex = (maxIndex?.m ?? -1) + 1;
  const result = db.prepare('INSERT INTO checklist_items (order_id, section, description, order_index) VALUES (?, ?, ?, ?)')
    .run(orderId, section, description, nextIndex);
  return result.lastInsertRowid;
}

function updateChecklistItemDetails(itemId, { status, comment }) {
  const fields = [];
  const values = [];
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (comment !== undefined) { fields.push('comment = ?'); values.push(comment); }
  if (fields.length === 0) return 0;
  values.push(itemId);
  const result = db.prepare(`UPDATE checklist_items SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return result.changes;
}

// ===== Sjekkliste-maler =====

function listTemplates() {
  const templates = db.prepare('SELECT * FROM checklist_templates ORDER BY id').all();
  const countStmt = db.prepare('SELECT COUNT(*) AS n FROM checklist_template_items WHERE template_id = ?');
  return templates.map(t => ({ ...t, item_count: countStmt.get(t.id).n }));
}

function getTemplateById(id) {
  const template = db.prepare('SELECT * FROM checklist_templates WHERE id = ?').get(id);
  if (!template) return null;
  const items = db.prepare('SELECT * FROM checklist_template_items WHERE template_id = ? ORDER BY order_index, id').all(id);
  return { ...template, items };
}

function createTemplate({ name, description, order_type, items = [] }) {
  if (!name) throw new Error('Navn er påkrevd');
  const result = db.prepare('INSERT INTO checklist_templates (name, description, order_type) VALUES (?, ?, ?)')
    .run(name, description || null, order_type || null);
  const templateId = result.lastInsertRowid;

  const insertItem = db.prepare('INSERT INTO checklist_template_items (template_id, section, description, order_index) VALUES (?, ?, ?, ?)');
  items.forEach((item, index) => {
    if (!item.description) return;
    insertItem.run(templateId, item.section || null, item.description, index);
  });

  return templateId;
}

function updateTemplate(id, { name, description, order_type, items }) {
  const existing = db.prepare('SELECT * FROM checklist_templates WHERE id = ?').get(id);
  if (!existing) throw new Error(`Mal ${id} finnes ikke`);

  db.prepare('UPDATE checklist_templates SET name = ?, description = ?, order_type = ? WHERE id = ?')
    .run(name ?? existing.name, description ?? existing.description, order_type ?? existing.order_type, id);

  if (Array.isArray(items)) {
    db.prepare('DELETE FROM checklist_template_items WHERE template_id = ?').run(id);
    const insertItem = db.prepare('INSERT INTO checklist_template_items (template_id, section, description, order_index) VALUES (?, ?, ?, ?)');
    items.forEach((item, index) => {
      if (!item.description) return;
      insertItem.run(id, item.section || null, item.description, index);
    });
  }

  return 1;
}

function deleteTemplate(id) {
  db.prepare('DELETE FROM checklist_template_items WHERE template_id = ?').run(id);
  const result = db.prepare('DELETE FROM checklist_templates WHERE id = ?').run(id);
  return result.changes;
}

function applyTemplateToOrder(orderId, templateId) {
  const template = getTemplateById(templateId);
  if (!template) throw new Error(`Mal ${templateId} finnes ikke`);

  const maxIndex = db.prepare('SELECT MAX(order_index) AS m FROM checklist_items WHERE order_id = ?').get(orderId);
  let nextIndex = (maxIndex?.m ?? -1) + 1;

  const insertItem = db.prepare('INSERT INTO checklist_items (order_id, section, description, order_index, template_item_id) VALUES (?, ?, ?, ?, ?)');
  for (const item of template.items) {
    insertItem.run(orderId, item.section, item.description, nextIndex, item.id);
    nextIndex += 1;
  }

  return template.items.length;
}

function getCalendarItems(role) {
  const result = db.prepare(`
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

  return result.map(item => {
    const displayName = item.requires_clearance && role !== 'manager' && role !== 'admin'
      ? '🔒 Super secret mission'
      : `${item.customer_name} (${item.type})`;
    return {
      ...item,
      display_name: displayName,
      masked: !!(item.requires_clearance && role !== 'manager' && role !== 'admin')
    };
  });
}

// Valider at en booking ikke overlapper med eksisterende bookinger
function validateBooking(technicianId, startTime, endTime, excludeBookingId = null) {
  const bookings = getBookingsForTech(technicianId);
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start >= end) {
    return { valid: false, reason: 'Starttid må være før sluttid' };
  }

  for (const booking of bookings) {
    if (excludeBookingId && booking.id === excludeBookingId) continue;

    if (doTimeSlotsOverlap(booking.start, booking.end, start, end)) {
      return {
        valid: false,
        reason: `Overlapper med booking ID ${booking.id} (${booking.start_time} - ${booking.end_time})`
      };
    }
  }

  return { valid: true, reason: 'OK' };
}

function updateOrderStatus(orderId, status, assignedTechId = null, scheduledStart = null, scheduledEnd = null) {
  if (assignedTechId !== null && scheduledStart && scheduledEnd) {
    const validation = validateBooking(assignedTechId, scheduledStart, scheduledEnd);
    if (!validation.valid) {
      throw new Error(`Kan ikke opprette booking: ${validation.reason}`);
    }

    const result = db.prepare('UPDATE orders SET status = ?, assigned_tech_id = ?, scheduled_start = ?, scheduled_end = ? WHERE id = ?')
      .run(status, assignedTechId, scheduledStart, scheduledEnd, orderId);

    if (status === 'planlagt' && assignedTechId) {
      db.prepare('INSERT INTO bookings (technician_id, order_id, start_time, end_time) VALUES (?,?,?,?)')
        .run(assignedTechId, orderId, scheduledStart, scheduledEnd);
    }
    return result.changes;
  } else {
    const result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, orderId);
    return result.changes;
  }
}

function createBooking(technicianId, orderId, startTime, endTime) {
  const validation = validateBooking(technicianId, startTime, endTime);
  if (!validation.valid) {
    throw new Error(`Kan ikke opprette booking: ${validation.reason}`);
  }

  const result = db.prepare('INSERT INTO bookings (technician_id, order_id, start_time, end_time) VALUES (?,?,?,?)')
    .run(technicianId, orderId, startTime, endTime);

  db.prepare('UPDATE orders SET status = ?, assigned_tech_id = ?, scheduled_start = ?, scheduled_end = ? WHERE id = ?')
    .run('planlagt', technicianId, startTime, endTime, orderId);

  return result.lastInsertRowid;
}

function updateBooking(bookingId, updates) {
  const existingBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!existingBooking) {
    throw new Error(`Booking ID ${bookingId} finnes ikke`);
  }

  const { technician_id, start_time, end_time } = existingBooking;
  const newStartTime = updates.start_time || start_time;
  const newEndTime = updates.end_time || end_time;
  const newTechnicianId = updates.technician_id || technician_id;

  const validation = validateBooking(newTechnicianId, newStartTime, newEndTime, bookingId);
  if (!validation.valid) {
    throw new Error(`Kan ikke oppdatere booking: ${validation.reason}`);
  }

  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  values.push(bookingId);

  const result = db.prepare(`UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return result.changes;
}

function deleteBooking(bookingId) {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) {
    throw new Error(`Booking ID ${bookingId} finnes ikke`);
  }

  db.prepare('DELETE FROM bookings WHERE id = ?').run(bookingId);
  db.prepare('UPDATE orders SET status = ?, assigned_tech_id = ?, scheduled_start = ?, scheduled_end = ? WHERE id = ?')
    .run('open', null, null, null, booking.order_id);

  return 1;
}

function updateOrderFull(orderId, updates) {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  values.push(orderId);

  const result = db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return result.changes;
}

function findGaps(bookings, dayStart, dayEnd, neededHours, minBufferMinutes = 30) {
  const neededMs = neededHours * 3600 * 1000;
  const bufferMs = minBufferMinutes * 60 * 1000;

  const intervals = bookings
    .map(b => ({ start: b.start, end: b.end }))
    .filter(i => i.end > dayStart && i.start < dayEnd)
    .sort((a, b) => a.start - b.start);

  const gaps = [];
  let cursor = new Date(dayStart);

  for (const iv of intervals) {
    const availableTime = iv.start - cursor;
    if (availableTime >= neededMs + bufferMs) {
      gaps.push({
        start: new Date(cursor),
        end: new Date(cursor.getTime() + neededMs),
        nextStart: iv.start,
        hasBuffer: true
      });
    } else if (availableTime >= neededMs) {
      gaps.push({
        start: new Date(cursor),
        end: new Date(cursor.getTime() + neededMs),
        nextStart: iv.start,
        hasBuffer: false
      });
    }

    if (iv.end > cursor) cursor = new Date(iv.end);
  }

  const lastGapTime = dayEnd - cursor;
  if (lastGapTime >= neededMs + bufferMs) {
    gaps.push({
      start: new Date(cursor),
      end: new Date(cursor.getTime() + neededMs),
      hasBuffer: true
    });
  } else if (lastGapTime >= neededMs) {
    gaps.push({
      start: new Date(cursor),
      end: new Date(cursor.getTime() + neededMs),
      hasBuffer: false
    });
  }

  return gaps;
}

function suggestForOrder(orderId, options = {}) {
  const {
    horizonDays = null,
    priorityLevel = 'normal',
    workDayStartHour = 6,
    workDayEndHour = 20,
    maxSuggestions = 8
  } = options;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return [];

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(order.customer_id);

  const allTechs = db.prepare('SELECT * FROM technicians').all();
  const techs = allTechs.filter(t => {
    try {
      const skills = JSON.parse(t.skills || '[]');
      const hasSkill = skills.includes(order.type);
      const hasClearance = !customer?.requires_clearance || t.clearance_level >= 2;
      return hasSkill && hasClearance;
    } catch (e) { return false; }
  });

  const now = new Date();

  const effectiveHorizonDays = horizonDays !== null
    ? horizonDays
    : (() => {
        switch (priorityLevel) {
          case 'urgent': return 3;
          case 'high': return 5;
          case 'low': return 14;
          default: return 10;
        }
      })();

  const suggestions = [];

  for (const tech of techs) {
    const bookings = getBookingsForTech(tech.id);

    for (let d = 0; d < effectiveHorizonDays; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      const dayStart = new Date(day);
      dayStart.setHours(workDayStartHour, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(workDayEndHour, 0, 0, 0);

      const gaps = findGaps(bookings, dayStart, dayEnd, order.estimated_hours || 2);

      for (const g of gaps) {
        const prevBooking = bookings.find(b => b.end <= g.start);
        const nextBooking = bookings.find(b => b.start >= g.end);

        const orderCustomer = db.prepare('SELECT lat, lng, region FROM customers WHERE id = ?').get(order.customer_id);

        const hasConflict = bookings.some(b =>
          b.id !== order.id && doTimeSlotsOverlap(b.start, b.end, g.start, g.end)
        );

        if (hasConflict) continue;

        const slotInfo = calculateSlotScore({
          tech,
          gap: {
            start: g.start,
            end: g.end,
            prevLat: prevBooking ? orderCustomer?.lat : tech.base_lat,
            prevLng: prevBooking ? orderCustomer?.lng : tech.base_lng,
            nextLat: nextBooking ? orderCustomer?.lat : tech.base_lat,
            nextLng: nextBooking ? orderCustomer?.lng : tech.base_lng,
            nextStart: g.nextStart
          },
          newJob: {
            lat: order.lat,
            lng: order.lng,
            dueDate: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
            postal: customer?.postal_code,
            region: customer?.region,
            estimated_hours: order.estimated_hours
          },
          existingBookings: bookings,
          priorityLevel
        });

        suggestions.push({
          technician: tech,
          technicianId: tech.id,
          start: g.start.toISOString(),
          end: g.end.toISOString(),
          score: slotInfo.score,
          reason: slotInfo.reason,
          travelTimeMinutes: slotInfo.travelTimeMinutes,
          travelDistanceKm: slotInfo.travelDistanceKm,
          bufferMinutes: slotInfo.bufferMinutes || 0,
          hasBuffer: g.hasBuffer || false,
          priorityLevel
        });
      }
    }
  }

  return suggestions
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.travelTimeMinutes !== b.travelTimeMinutes) return a.travelTimeMinutes - b.travelTimeMinutes;
      return b.bufferMinutes - a.bufferMinutes;
    })
    .slice(0, maxSuggestions);
}

// ===== Brukere / autentisering =====

function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
}

function getUserById(id) {
  return db.prepare('SELECT id, username, name, role, technician_id, email, created_at FROM users WHERE id = ?').get(id) || null;
}

function listUsers() {
  return db.prepare('SELECT id, username, name, role, technician_id, email, created_at FROM users ORDER BY id').all();
}

function createUser({ username, password, name, role, technician_id, email }) {
  if (!username || !password || !role) {
    throw new Error('username, password og role er påkrevd');
  }
  const existing = getUserByUsername(username);
  if (existing) {
    throw new Error('Brukernavnet er allerede i bruk');
  }
  const result = db.prepare('INSERT INTO users (username, password_hash, name, role, technician_id, email) VALUES (?,?,?,?,?,?)')
    .run(username, hashPassword(password), name || username, role, technician_id || null, email || null);
  return result.lastInsertRowid;
}

function updateUser(id, updates) {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) {
    throw new Error(`Bruker ${id} finnes ikke`);
  }

  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'password') {
      if (!value) continue;
      fields.push('password_hash = ?');
      values.push(hashPassword(value));
    } else if (['username', 'name', 'role', 'technician_id', 'email'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (fields.length === 0) return 0;
  values.push(id);

  const result = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return result.changes;
}

function deleteUser(id) {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return result.changes;
}

// ===== Fakturasystem-integrasjon =====
// Kundedata eies av fakturasystemet (invoice-app); AnKa henter/synker og
// lagrer en lokal kopi. Felter som er AnKa-spesifikke (geokoordinater for
// planlegging, sikkerhetsklarering) røres ikke av synken.
function syncCustomersFromExternal(externalCustomers) {
  let created = 0;
  let updated = 0;
  const findByExternalId = db.prepare('SELECT id FROM customers WHERE external_id = ?');
  const insert = db.prepare(`
    INSERT INTO customers (external_id, name, address, postal_code, region, contact_person, phone, email, requires_clearance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  const update = db.prepare(`
    UPDATE customers SET name = ?, address = ?, postal_code = ?, region = ?, contact_person = ?, phone = ?, email = ?
    WHERE external_id = ?
  `);

  for (const ext of externalCustomers) {
    const existing = findByExternalId.get(ext.id);
    const fields = [ext.name, ext.address, ext.postal_code, ext.region, ext.contact_person, ext.phone, ext.email];
    if (existing) {
      update.run(...fields, ext.id);
      updated += 1;
    } else {
      insert.run(ext.id, ...fields);
      created += 1;
    }
  }

  return { created, updated };
}

function markOrderInvoiced(orderId) {
  const result = db.prepare('UPDATE orders SET invoiced_at = ? WHERE id = ?').run(new Date().toISOString(), orderId);
  return result.changes;
}

module.exports = {
  db: () => db,
  initDb,
  getCustomers: () => db.prepare('SELECT * FROM customers').all(),
  getCustomerById: (id) => db.prepare('SELECT * FROM customers WHERE id = ?').get(id) || null,
  createCustomer: ({ name, address, lat, lng, postal_code, region, requires_clearance }) => {
    const result = db.prepare('INSERT INTO customers (name,address,lat,lng,postal_code,region,requires_clearance) VALUES (?,?,?,?,?,?,?)')
      .run(name, address, lat || null, lng || null, postal_code || null, region || null, requires_clearance ? 1 : 0);
    return result.lastInsertRowid;
  },
  syncCustomersFromExternal,
  markOrderInvoiced,
  getTechnicians: () => db.prepare('SELECT * FROM technicians').all(),
  getTechnicianById: (id) => db.prepare('SELECT * FROM technicians WHERE id = ?').get(id) || null,
  getBookingsForTech,
  getChecklistForOrder,
  createChecklistItem,
  updateChecklistItemDetails,
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  applyTemplateToOrder,
  updateOrderStatus,
  updateOrderFull,
  getCalendarItems,
  getOrders: () => db.prepare('SELECT * FROM orders').all(),
  getOrderById: (id) => db.prepare('SELECT * FROM orders WHERE id = ?').get(id) || null,
  createOrder: ({ customer_id, type, estimated_hours, lat, lng, assigned_tech_id, notes }) => {
    let latv = lat, lngv = lng;
    if ((!latv || !lngv) && customer_id) {
      const c = db.prepare('SELECT lat,lng FROM customers WHERE id = ?').get(customer_id);
      if (c) { latv = latv || c.lat; lngv = lngv || c.lng; }
    }
    const result = db.prepare('INSERT INTO orders (customer_id,type,status,estimated_hours,lat,lng,assigned_tech_id,notes) VALUES (?,?,?,?,?,?,?,?)')
      .run(customer_id, type, 'open', estimated_hours || 1, latv, lngv, assigned_tech_id || null, notes || null);
    return result.lastInsertRowid;
  },
  suggestForOrder,
  validateBooking,
  createBooking,
  updateBooking,
  deleteBooking,
  getUserByUsername,
  getUserById,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  resetDemoData: () => {
    seed();
    return { success: true, message: 'Demo data reset' };
  }
};
