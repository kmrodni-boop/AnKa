const alasql = require('alasql');
const fs = require('fs');
const path = require('path');
const { calculateSlotScore, doTimeSlotsOverlap } = require('./utils/scoring');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'demo.db');

function ensureDir(p) {
  const d = path.dirname(p);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

ensureDir(DB_PATH);

// Initialize alasql database
let db;
async function initDb() {
  // Check if database file exists and is valid JSON
  let dbData = null;
  if (fs.existsSync(DB_PATH)) {
    try {
      const fileContent = fs.readFileSync(DB_PATH, 'utf8');
      // Check if it's valid JSON (alasql format) or SQLite binary
      if (fileContent.trim().startsWith('{') || fileContent.trim().startsWith('[')) {
        dbData = JSON.parse(fileContent);
      } else {
        // It's a SQLite binary file or invalid, remove it and recreate
        console.log('Found non-JSON database file, recreating with alasql format');
        fs.unlinkSync(DB_PATH);
      }
    } catch (e) {
      // File exists but can't be read as JSON/UTF-8 (probably binary SQLite), remove it
      console.log('Invalid database file (probably SQLite binary), recreating...');
      try {
        fs.unlinkSync(DB_PATH);
      } catch (e2) {
        console.log('Could not remove old database file:', e2.message);
      }
    }
  }
  
  alasql.databases.demo = new alasql.Database('demo');
  db = alasql.databases.demo;
  
  if (dbData) {
    // Import data
    for (const tableName in dbData) {
      db.tables[tableName] = dbData[tableName];
    }
  } else {
    seed();
    saveDb();
  }
  
  return Promise.resolve();
}

function saveDb() {
  ensureDir(DB_PATH);
  const dbData = {};
  for (const tableName in db.tables) {
    dbData[tableName] = db.tables[tableName];
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));
}

function seed() {
  // Clear existing data
  alasql.exec('DROP TABLE IF EXISTS demo.checklist_items');
  alasql.exec('DROP TABLE IF EXISTS demo.bookings');
  alasql.exec('DROP TABLE IF EXISTS demo.orders');
  alasql.exec('DROP TABLE IF EXISTS demo.technicians');
  alasql.exec('DROP TABLE IF EXISTS demo.customers');

  // ===== KUNDER =====
  alasql.exec(`
    CREATE TABLE demo.customers (
      id INT PRIMARY KEY,
      name STRING,
      address STRING,
      lat FLOAT,
      lng FLOAT,
      postal_code STRING,
      region STRING,
      requires_clearance INT DEFAULT 0
    )
  `);

  // Bergen-området
  alasql.exec(`INSERT INTO demo.customers (id,name,address,lat,lng,postal_code,region,requires_clearance) VALUES 
    (1, 'Bergen Energi', 'Åsane, Bergen', 60.435, 5.348, '5115', 'Vestland', 0),
    (2, 'Lyse Energi', 'Fana, Bergen', 60.350, 5.300, '5221', 'Vestland', 0),
    (3, 'Bergenshalvøens Kommunale Kraftselskap', 'Loddefjord, Bergen', 60.400, 5.250, '5124', 'Vestland', 0),
    (4, 'Vestkanten Energi', 'Arna, Bergen', 60.410, 5.360, '5215', 'Vestland', 0)
  `);

  // Førde-området
  alasql.exec(`INSERT INTO demo.customers (id,name,address,lat,lng,postal_code,region,requires_clearance) VALUES 
    (5, 'Førde Industri', 'Førde, Sogn og Fjordane', 61.450, 5.833, '6800', 'Vestland', 0),
    (6, 'Sogn og Fjordane Energi', 'Sande, Sogn og Fjordane', 61.500, 5.900, '6823', 'Vestland', 0),
    (7, 'Jølster Kraft', 'Skei, Jølster', 61.550, 6.000, '6843', 'Vestland', 0)
  `);

  // Tromsø-området (sensitive kunder)
  alasql.exec(`INSERT INTO demo.customers (id,name,address,lat,lng,postal_code,region,requires_clearance) VALUES 
    (8, 'Hemmeligholdt Kunde', 'Tromsø sentrum', 69.649, 18.956, '9008', 'Troms og Finnmark', 1),
    (9, 'Statens Hemmelige Anlegg', 'Kvaløya, Tromsø', 69.680, 18.900, '9010', 'Troms og Finnmark', 1)
  `);

  // Nord-Norge (større radius)
  alasql.exec(`INSERT INTO demo.customers (id,name,address,lat,lng,postal_code,region,requires_clearance) VALUES 
    (10, 'Finnmark Kraft', 'Hammerfest', 70.663, 23.678, '9600', 'Finnmark', 0),
    (11, 'Troms Kraft', 'Harstad', 68.798, 16.547, '9406', 'Troms og Finnmark', 0)
  `);

  // ===== TEKNIKERE =====
  alasql.exec(`
    CREATE TABLE demo.technicians (
      id INT PRIMARY KEY,
      name STRING,
      base_lat FLOAT,
      base_lng FLOAT,
      skills STRING,
      clearance_level INT DEFAULT 0
    )
  `);

  // Ålesund-baserte teknikere (2 stk)
  alasql.exec(`INSERT INTO demo.technicians (id,name,base_lat,base_lng,skills,clearance_level) VALUES 
    (1, 'Ola Nordmann', 62.470, 6.150, '${JSON.stringify(['årskontroll', 'service', 'inspection', 'trykktest'])}', 1),
    (2, 'Kari Teknisk', 62.472, 6.155, '${JSON.stringify(['inspection', 'årskontroll', 'vedlikehold'])}', 0)
  `);

  // Førde-baserte teknikere (4 stk)
  alasql.exec(`INSERT INTO demo.technicians (id,name,base_lat,base_lng,skills,clearance_level) VALUES 
    (3, 'Lars Fjord', 61.440, 5.820, '${JSON.stringify(['årskontroll', 'inspection', 'service'])}', 0),
    (4, 'Marte Vest', 61.460, 5.850, '${JSON.stringify(['service', 'vedlikehold', 'trykktest'])}', 1),
    (5, 'Per Fiksit', 61.445, 5.825, '${JSON.stringify(['service', 'reparasjon', 'trykktest'])}', 1),
    (6, 'Anne Service', 61.455, 5.845, '${JSON.stringify(['årskontroll', 'service', 'inspection'])}', 0)
  `);

  // Lillestrøm-baserte teknikere (3 stk)
  alasql.exec(`INSERT INTO demo.technicians (id,name,base_lat,base_lng,skills,clearance_level) VALUES 
    (7, 'Morten Oslo', 60.000, 11.050, '${JSON.stringify(['årskontroll', 'service', 'sikkerhet'])}', 3),
    (8, 'Anne Akershus', 59.995, 11.045, '${JSON.stringify(['inspection', 'vedlikehold', 'trykktest'])}', 2),
    (9, 'Knut Lillestrøm', 59.985, 11.055, '${JSON.stringify(['årskontroll', 'service', 'inspection'])}', 2)
  `);

  // ===== ORDRE =====
  alasql.exec(`
    CREATE TABLE demo.orders (
      id INT PRIMARY KEY,
      customer_id INT,
      type STRING,
      status STRING,
      estimated_hours FLOAT,
      lat FLOAT,
      lng FLOAT,
      assigned_tech_id INT,
      scheduled_start STRING,
      scheduled_end STRING,
      notes STRING
    )
  `);

  // Åpne ordre (venter på planlegging) - 12 stk
  alasql.exec(`INSERT INTO demo.orders (id,customer_id,type,status,estimated_hours,lat,lng,assigned_tech_id,scheduled_start,scheduled_end,notes) VALUES 
    (1, 1, 'årskontroll', 'open', 3, 60.435, 5.348, null, null, null, 'Årlig kontroll av trykkluftsanlegg'),
    (2, 2, 'service', 'open', 2, 60.350, 5.300, null, null, null, 'Service på transformator'),
    (3, 4, 'inspection', 'open', 2.5, 60.410, 5.360, null, null, null, 'Rutineinspeksjon av elektrisk anlegg'),
    (4, 5, 'service', 'open', 3, 61.450, 5.833, null, null, null, 'Service på kraftstasjon i Førde'),
    (5, 7, 'årskontroll', 'open', 4, 61.500, 5.900, null, null, null, 'Årlig kontroll av solcelleanlegg'),
    (6, 9, 'årskontroll', 'open', 4, 69.649, 18.956, null, null, null, 'Sensitiv årskontroll - krever clearance'),
    (7, 10, 'service', 'open', 2.5, 69.680, 18.900, null, null, null, 'Service på hemmelig anlegg'),
    (8, 11, 'inspection', 'open', 3.5, 70.663, 23.678, null, null, null, 'Årlig kontroll i Finnmark'),
    (9, 12, 'trykktest', 'open', 2, 68.798, 16.547, null, null, null, 'Trykktest av rørsystem i Harstad'),
    (10, 3, 'vedlikehold', 'open', 2, 60.400, 5.250, null, null, null, 'Rutinevedlikehold på Loddefjord anlegg'),
    (11, 6, 'inspection', 'open', 2, 61.500, 5.900, null, null, null, 'Inspeksjon av Sogn og Fjordane anlegg'),
    (12, 8, 'service', 'open', 3, 69.680, 18.900, null, null, null, 'Service på Statens anlegg')
  `);

  // Planlagte ordre (for å skape bookinger) - 6 stk
  alasql.exec(`INSERT INTO demo.orders (id,customer_id,type,status,estimated_hours,lat,lng,assigned_tech_id,scheduled_start,scheduled_end,notes) VALUES 
    (13, 3, 'service', 'planlagt', 2, 60.400, 5.250, 2, '2026-08-10T08:00:00Z', '2026-08-10T10:00:00Z', 'Service på kraftstasjon'),
    (14, 6, 'inspection', 'planlagt', 3, 61.500, 5.900, 5, '2026-08-10T10:00:00Z', '2026-08-10T13:00:00Z', 'Inspeksjon av solcelleanlegg'),
    (15, 8, 'årskontroll', 'planlagt', 3, 69.680, 18.900, 7, '2026-08-11T09:00:00Z', '2026-08-11T12:00:00Z', 'Årlig kontroll - sensitiv kunde'),
    (16, 1, 'trykktest', 'planlagt', 2, 60.435, 5.348, 1, '2026-08-12T13:00:00Z', '2026-08-12T15:00:00Z', 'Trykktest av rørsystem'),
    (17, 2, 'vedlikehold', 'planlagt', 1.5, 60.350, 5.300, 3, '2026-08-13T08:00:00Z', '2026-08-13T09:30:00Z', 'Rutinevedlikehold'),
    (18, 4, 'årskontroll', 'planlagt', 2.5, 60.410, 5.360, 4, '2026-08-14T10:00:00Z', '2026-08-14T12:30:00Z', 'Årlig kontroll på Arna anlegg')
  `);

  // ===== BOOKINGER (kalender for teknikere) =====
  alasql.exec(`
    CREATE TABLE demo.bookings (
      id INT PRIMARY KEY,
      technician_id INT,
      order_id INT,
      start_time STRING,
      end_time STRING
    )
  `);

  // Ola Nordmann (ID 1)
  alasql.exec(`INSERT INTO demo.bookings (id,technician_id,order_id,start_time,end_time) VALUES 
    (1, 1, 16, '2026-08-12T13:00:00Z', '2026-08-12T15:00:00Z'),
    (2, 1, 1, '2026-08-15T08:00:00Z', '2026-08-15T11:00:00Z'),
    (3, 1, 4, '2026-08-18T09:00:00Z', '2026-08-18T11:00:00Z')
  `);

  // Kari Teknisk (ID 2)
  alasql.exec(`INSERT INTO demo.bookings (id,technician_id,order_id,start_time,end_time) VALUES 
    (4, 2, 13, '2026-08-10T08:00:00Z', '2026-08-10T10:00:00Z'),
    (5, 2, 2, '2026-08-14T10:00:00Z', '2026-08-14T12:00:00Z'),
    (6, 2, 7, '2026-08-17T13:00:00Z', '2026-08-17T15:00:00Z')
  `);

  // Per Fiksit (ID 3)
  alasql.exec(`INSERT INTO demo.bookings (id,technician_id,order_id,start_time,end_time) VALUES 
    (7, 3, 17, '2026-08-13T08:00:00Z', '2026-08-13T09:30:00Z'),
    (8, 3, 1, '2026-08-16T09:00:00Z', '2026-08-16T11:00:00Z'),
    (9, 3, 6, '2026-08-19T10:00:00Z', '2026-08-19T12:00:00Z')
  `);

  // Anne Service (ID 4)
  alasql.exec(`INSERT INTO demo.bookings (id,technician_id,order_id,start_time,end_time) VALUES 
    (10, 4, 18, '2026-08-14T10:00:00Z', '2026-08-14T12:30:00Z'),
    (11, 4, 3, '2026-08-17T10:00:00Z', '2026-08-17T12:00:00Z'),
    (12, 4, 5, '2026-08-20T08:00:00Z', '2026-08-20T10:00:00Z')
  `);

  // Lars Fjord (ID 5)
  alasql.exec(`INSERT INTO demo.bookings (id,technician_id,order_id,start_time,end_time) VALUES 
    (13, 5, 14, '2026-08-10T10:00:00Z', '2026-08-10T13:00:00Z'),
    (14, 5, 2, '2026-08-17T10:00:00Z', '2026-08-17T12:00:00Z'),
    (15, 5, 7, '2026-08-21T09:00:00Z', '2026-08-21T11:00:00Z')
  `);

  // Marte Vest (ID 6)
  alasql.exec(`INSERT INTO demo.bookings (id,technician_id,order_id,start_time,end_time) VALUES 
    (16, 6, 5, '2026-08-12T09:00:00Z', '2026-08-12T11:00:00Z'),
    (17, 6, 6, '2026-08-19T10:00:00Z', '2026-08-19T13:00:00Z')
  `);

  // Morten Polar (ID 7)
  alasql.exec(`INSERT INTO demo.bookings (id,technician_id,order_id,start_time,end_time) VALUES 
    (18, 7, 15, '2026-08-11T09:00:00Z', '2026-08-11T12:00:00Z'),
    (19, 7, 6, '2026-08-18T08:00:00Z', '2026-08-18T11:00:00Z'),
    (20, 7, 12, '2026-08-22T09:00:00Z', '2026-08-22T12:00:00Z')
  `);

  // Anne Nordlys (ID 8)
  alasql.exec(`INSERT INTO demo.bookings (id,technician_id,order_id,start_time,end_time) VALUES 
    (21, 8, 8, '2026-08-12T09:00:00Z', '2026-08-12T11:00:00Z'),
    (22, 8, 7, '2026-08-19T10:00:00Z', '2026-08-19T13:00:00Z')
  `);

  // Knut Isfjord (ID 9)
  alasql.exec(`INSERT INTO demo.bookings (id,technician_id,order_id,start_time,end_time) VALUES 
    (23, 9, 12, '2026-08-13T13:00:00Z', '2026-08-13T15:00:00Z'),
    (24, 9, 8, '2026-08-20T10:00:00Z', '2026-08-20T12:00:00Z')
  `);

  // ===== SJEKKLISTER (for demo) =====
  alasql.exec(`
    CREATE TABLE demo.checklist_items (
      id INT PRIMARY KEY,
      order_id INT,
      description STRING,
      completed INT DEFAULT 0
    )
  `);

  // Sjekkliste for ordre 1 (Bergen Energi - årskontroll)
  alasql.exec(`INSERT INTO demo.checklist_items (id,order_id,description,completed) VALUES 
    (1, 1, 'Sjekk trykkluftstank for korrosjon', 0),
    (2, 1, 'Verifiser trykknivå', 0),
    (3, 1, 'Test sikkerhetsventiler', 0),
    (4, 1, 'Kontroller oljenivå i kompressor', 0),
    (5, 1, 'Sjekk tilkoblinger og slanger', 0)
  `);

  // Sjekkliste for ordre 2 (Lyse Energi - service)
  alasql.exec(`INSERT INTO demo.checklist_items (id,order_id,description,completed) VALUES 
    (6, 2, 'Mål isolasjonsmotstand', 0),
    (7, 2, 'Sjekk tilkoblinger', 0),
    (8, 2, 'Rengjør kjøleflater', 1),
    (9, 2, 'Test nødstopp-funksjonalitet', 0)
  `);

  // Sjekkliste for ordre 5 (Førde Industri - service)
  alasql.exec(`INSERT INTO demo.checklist_items (id,order_id,description,completed) VALUES 
    (10, 4, 'Visuell inspeksjon av anlegg', 0),
    (11, 4, 'Sjekk temperaturmålinger', 0),
    (12, 4, 'Test alarmfunksjoner', 0)
  `);

  // Sjekkliste for ordre 9 (Hemmeligholdt Kunde - sensitiv)
  alasql.exec(`INSERT INTO demo.checklist_items (id,order_id,description,completed) VALUES 
    (13, 6, 'Sikkerhetssjekk av inngangssystem', 0),
    (14, 6, 'Verifiser alarmfunksjonalitet', 0),
    (15, 6, 'Kontroller overvåkningssystem', 0)
  `);
}

// Initialize the database
initDb().then(() => {
  console.log('Database initialized');
}).catch(err => {
  console.error('Error initializing database:', err);
});

function parseISO(s) {
  return s ? new Date(s) : null;
}

function getBookingsForTech(techId) {
  const result = alasql.exec('SELECT * FROM demo.bookings WHERE technician_id = ? ORDER BY start_time', [techId]);
  return result.map(b => ({
    ...b,
    start: parseISO(b.start_time),
    end: parseISO(b.end_time)
  }));
}

function getChecklistForOrder(orderId) {
  return alasql.exec('SELECT * FROM demo.checklist_items WHERE order_id = ? ORDER BY id', [orderId]);
}

function createChecklistItem(orderId, description) {
  const result = alasql.exec('SELECT MAX(id) as maxId FROM demo.checklist_items');
  const nextId = (result[0]?.maxId || 0) + 1;
  alasql.exec('INSERT INTO demo.checklist_items (id,order_id,description,completed) VALUES (?,?,?,0)', [nextId, orderId, description]);
  saveDb();
  return nextId;
}

function getCalendarItems(role) {
  const result = alasql.exec(`
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
    FROM demo.bookings b
    JOIN demo.orders o ON o.id = b.order_id
    JOIN demo.customers c ON c.id = o.customer_id
    JOIN demo.technicians t ON t.id = b.technician_id
    ORDER BY b.start_time
  `);

  return result.map(item => {
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
  alasql.exec('UPDATE demo.checklist_items SET completed = ? WHERE id = ?', [completed ? 1 : 0, itemId]);
  saveDb();
  return 1;
}

// Valider at en booking ikke overlapper med eksisterende bookinger
function validateBooking(technicianId, startTime, endTime, excludeBookingId = null) {
  const bookings = getBookingsForTech(technicianId);
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  // Sjekk om start er før end
  if (start >= end) {
    return { valid: false, reason: 'Starttid må være før sluttid' };
  }
  
  // Sjekk overlap med eksisterende bookinger
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

// Forbedret updateOrderStatus med validering
function updateOrderStatus(orderId, status, assignedTechId = null, scheduledStart = null, scheduledEnd = null) {
  if (assignedTechId !== null && scheduledStart && scheduledEnd) {
    // Valider booking før opprettelse
    const validation = validateBooking(assignedTechId, scheduledStart, scheduledEnd);
    if (!validation.valid) {
      throw new Error(`Kan ikke opprette booking: ${validation.reason}`);
    }
    
    alasql.exec('UPDATE demo.orders SET status = ?, assigned_tech_id = ?, scheduled_start = ?, scheduled_end = ? WHERE id = ?', 
      [status, assignedTechId, scheduledStart, scheduledEnd, orderId]);
    
    // Opprett booking hvis ordre er planlagt
    if (status === 'planlagt' && assignedTechId) {
      const result = alasql.exec('SELECT MAX(id) as maxId FROM demo.bookings');
      const nextId = (result[0]?.maxId || 0) + 1;
      alasql.exec('INSERT INTO demo.bookings (id,technician_id, order_id, start_time, end_time) VALUES (?,?,?,?,?)', 
        [nextId, assignedTechId, orderId, scheduledStart, scheduledEnd]);
    }
    saveDb();
    return 1;
  } else {
    alasql.exec('UPDATE demo.orders SET status = ? WHERE id = ?', [status, orderId]);
    saveDb();
    return 1;
  }
}

// Opprett booking direkte (med validering)
function createBooking(technicianId, orderId, startTime, endTime) {
  const validation = validateBooking(technicianId, startTime, endTime);
  if (!validation.valid) {
    throw new Error(`Kan ikke opprette booking: ${validation.reason}`);
  }
  
  const result = alasql.exec('SELECT MAX(id) as maxId FROM demo.bookings');
  const nextId = (result[0]?.maxId || 0) + 1;
  
  alasql.exec('INSERT INTO demo.bookings (id,technician_id, order_id, start_time, end_time) VALUES (?,?,?,?,?)', 
    [nextId, technicianId, orderId, startTime, endTime]);
  
  // Oppdater ordre status
  alasql.exec('UPDATE demo.orders SET status = ?, assigned_tech_id = ?, scheduled_start = ?, scheduled_end = ? WHERE id = ?', 
    ['planlagt', technicianId, startTime, endTime, orderId]);
  
  saveDb();
  return nextId;
}

// Oppdater booking (med validering)
function updateBooking(bookingId, updates) {
  const existingBooking = alasql.exec('SELECT * FROM demo.bookings WHERE id = ?', [bookingId]);
  if (!existingBooking[0]) {
    throw new Error(`Booking ID ${bookingId} finnes ikke`);
  }
  
  const { technician_id, start_time, end_time } = existingBooking[0];
  const newStartTime = updates.start_time || start_time;
  const newEndTime = updates.end_time || end_time;
  const newTechnicianId = updates.technician_id || technician_id;
  
  // Valider ny booking
  const validation = validateBooking(newTechnicianId, newStartTime, newEndTime, bookingId);
  if (!validation.valid) {
    throw new Error(`Kan ikke oppdatere booking: ${validation.reason}`);
  }
  
  // Bygg SQL update
  const fields = [];
  const values = [];
  
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  
  values.push(bookingId);
  
  alasql.exec(`UPDATE demo.bookings SET ${fields.join(', ')} WHERE id = ?`, values);
  saveDb();
  return 1;
}

// Slett booking
function deleteBooking(bookingId) {
  const booking = alasql.exec('SELECT * FROM demo.bookings WHERE id = ?', [bookingId]);
  if (!booking[0]) {
    throw new Error(`Booking ID ${bookingId} finnes ikke`);
  }
  
  const { order_id } = booking[0];
  
  // Slett booking
  alasql.exec('DELETE FROM demo.bookings WHERE id = ?', [bookingId]);
  
  // Oppdater ordre status tilbake til 'open'
  alasql.exec('UPDATE demo.orders SET status = ?, assigned_tech_id = ?, scheduled_start = ?, scheduled_end = ? WHERE id = ?', 
    ['open', null, null, null, order_id]);
  
  saveDb();
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
  
  alasql.exec(`UPDATE demo.orders SET ${fields.join(', ')} WHERE id = ?`, values);
  saveDb();
  return 1;
}

function findGaps(bookings, dayStart, dayEnd, neededHours, minBufferMinutes = 30) {
  const neededMs = neededHours * 3600 * 1000;
  const bufferMs = minBufferMinutes * 60 * 1000;
  
  // Filter bookings som overlapper med perioden
  const intervals = bookings
    .map(b => ({ start: b.start, end: b.end }))
    .filter(i => i.end > dayStart && i.start < dayEnd)
    .sort((a,b) => a.start - b.start);

  const gaps = [];
  let cursor = new Date(dayStart);

  for (const iv of intervals) {
    // Sjekk om det er plass til jobb + buffer
    const availableTime = iv.start - cursor;
    if (availableTime >= neededMs + bufferMs) {
      gaps.push({ 
        start: new Date(cursor), 
        end: new Date(cursor.getTime() + neededMs),
        nextStart: iv.start,
        hasBuffer: true
      });
    } else if (availableTime >= neededMs) {
      // Plass til jobb, men ikke full buffer
      gaps.push({ 
        start: new Date(cursor), 
        end: new Date(cursor.getTime() + neededMs),
        nextStart: iv.start,
        hasBuffer: false
      });
    }
    
    // Oppdater cursor til slutten av current booking
    if (iv.end > cursor) cursor = new Date(iv.end);
  }

  // Sjekk siste gap
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

// Forbedret suggestForOrder med bedre scoring, korridor-logikk og dynamisk horisont
function suggestForOrder(orderId, options = {}) {
  const {
    horizonDays = null, // null = auto (basert på prioritet)
    priorityLevel = 'normal', // 'low', 'normal', 'high', 'urgent'
    workDayStartHour = 6, // Fleksibel starttid (default 06:00)
    workDayEndHour = 20,   // Fleksibel sluttid (default 20:00)
    maxSuggestions = 8
  } = options;

  const orderResult = alasql.exec('SELECT * FROM demo.orders WHERE id = ?', [orderId]);
  const order = orderResult[0];
  if (!order) return [];

  // Hent kundeinfo for å sjekke clearance og region
  const customerResult = alasql.exec('SELECT * FROM demo.customers WHERE id = ?', [order.customer_id]);
  const customer = customerResult[0];
  
  const techsResult = alasql.exec('SELECT * FROM demo.technicians');
  const techs = techsResult.filter(t => {
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
  
  // Dynamisk horisont basert på prioritet
  const effectiveHorizonDays = horizonDays !== null 
    ? horizonDays 
    : (() => {
        switch(priorityLevel) {
          case 'urgent': return 3;  // 3 dager for hastejobber
          case 'high': return 5;    // 5 dager for høye prioriteringer
          case 'low': return 14;    // 14 dager for lave prioriteringer
          default: return 10;      // 10 dager for normal
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
        // Finn forrige og neste booking for reiseberegning
        const prevBooking = bookings.find(b => b.end <= g.start);
        const nextBooking = bookings.find(b => b.start >= g.end);
        
        // Get customer location for this order
        const orderCustomerResult = alasql.exec('SELECT lat, lng, region FROM demo.customers WHERE id = ?', [order.customer_id]);
        const orderCustomer = orderCustomerResult[0];
        
        // Valider at gapet ikke overlapper med eksisterende bookinger
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
      // Primær sortering: score (høyest først)
      if (b.score !== a.score) return b.score - a.score;
      // Sekundær: reisetid (lavest først)
      if (a.travelTimeMinutes !== b.travelTimeMinutes) 
        return a.travelTimeMinutes - b.travelTimeMinutes;
      // Tersier: buffer (størst først)
      return b.bufferMinutes - a.bufferMinutes;
    })
    .slice(0, maxSuggestions);
}

module.exports = {
  db,
  initDb,
  getCustomers: () => alasql.exec('SELECT * FROM demo.customers'),
  getCustomerById: (id) => {
    const result = alasql.exec('SELECT * FROM demo.customers WHERE id = ?', [id]);
    return result[0] || null;
  },
  createCustomer: ({ name, address, lat, lng, postal_code, region, requires_clearance }) => {
    const result = alasql.exec('SELECT MAX(id) as maxId FROM demo.customers');
    const nextId = (result[0]?.maxId || 0) + 1;
    alasql.exec('INSERT INTO demo.customers (id,name,address,lat,lng,postal_code,region,requires_clearance) VALUES (?,?,?,?,?,?,?,?)', 
      [nextId, name, address, lat || null, lng || null, postal_code || null, region || null, requires_clearance ? 1 : 0]);
    saveDb();
    return nextId;
  },
  getTechnicians: () => alasql.exec('SELECT * FROM demo.technicians'),
  getTechnicianById: (id) => {
    const result = alasql.exec('SELECT * FROM demo.technicians WHERE id = ?', [id]);
    return result[0] || null;
  },
  getBookingsForTech,
  getChecklistForOrder,
  createChecklistItem,
  updateChecklistItem,
  updateOrderStatus,
  updateOrderFull,
  getCalendarItems,
  getOrders: () => alasql.exec('SELECT * FROM demo.orders'),
  getOrderById: (id) => {
    const result = alasql.exec('SELECT * FROM demo.orders WHERE id = ?', [id]);
    return result[0] || null;
  },
  createOrder: ({ customer_id, type, estimated_hours, lat, lng, assigned_tech_id, notes }) => {
    let latv = lat, lngv = lng;
    if ((!latv || !lngv) && customer_id) {
      const c = alasql.exec('SELECT lat,lng FROM demo.customers WHERE id = ?', [customer_id]);
      if (c[0]) { latv = latv || c[0].lat; lngv = lngv || c[0].lng }
    }
    const result = alasql.exec('SELECT MAX(id) as maxId FROM demo.orders');
    const nextId = (result[0]?.maxId || 0) + 1;
    alasql.exec('INSERT INTO demo.orders (id,customer_id,type,status,estimated_hours,lat,lng,assigned_tech_id,notes) VALUES (?,?,?,?,?,?,?,?,?)', 
      [nextId, customer_id, type, 'open', estimated_hours || 1, latv, lngv, assigned_tech_id || null, notes || null]);
    saveDb();
    return nextId;
  },
  suggestForOrder,
  validateBooking,
  createBooking,
  updateBooking,
  deleteBooking,
  // Reset database for demo
  resetDemoData: () => {
    alasql.exec('DROP TABLE IF EXISTS demo.checklist_items');
    alasql.exec('DROP TABLE IF EXISTS demo.bookings');
    alasql.exec('DROP TABLE IF EXISTS demo.orders');
    alasql.exec('DROP TABLE IF EXISTS demo.technicians');
    alasql.exec('DROP TABLE IF EXISTS demo.customers');
    seed();
    saveDb();
    return { success: true, message: 'Demo data reset' };
  }
};
