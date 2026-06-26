const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { haversineKm } = require('./utils/geo');

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
      assigned_tech_id INTEGER
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
  const insertCustomer = db.prepare('INSERT INTO customers (name,address,lat,lng,requires_clearance) VALUES (?,?,?,?,?)');
  insertCustomer.run('Bergen Energi', 'Åsane, Bergen', 60.435, 5.348, 0);
  insertCustomer.run('Førde Industri', 'Førde', 61.450, 5.833, 0);
  insertCustomer.run('Hemmeligholdt Kunde', 'Tromsø', 69.649, 18.956, 1);

  const insertTech = db.prepare('INSERT INTO technicians (name,base_lat,base_lng,skills,clearance_level) VALUES (?,?,?,?,?)');
  insertTech.run('Ola Nordmann', 60.391, 5.322, JSON.stringify(['årskontroll','service','inspection']), 1);
  insertTech.run('Kari Teknisk', 61.385, 5.332, JSON.stringify(['inspection','årskontroll']), 0);

  const insertOrder = db.prepare('INSERT INTO orders (customer_id,type,status,estimated_hours,lat,lng,assigned_tech_id) VALUES (?,?,?,?,?,?,?)');
  insertOrder.run(1, 'årskontroll', 'open', 3, 60.435, 5.348, null);
  insertOrder.run(2, 'service', 'open', 2, 61.450, 5.833, 2);

  const insertBooking = db.prepare('INSERT INTO bookings (technician_id,order_id,start_time,end_time) VALUES (?,?,?,?)');
  insertBooking.run(2, 2, '2026-08-10T08:00:00Z', '2026-08-10T10:00:00Z');
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
           c.requires_clearance,
           b.start_time,
           b.end_time
    FROM bookings b
    JOIN orders o ON o.id = b.order_id
    JOIN customers c ON c.id = o.customer_id
    ORDER BY b.start_time
  `).all();

  return items.map(item => {
    const displayName = item.requires_clearance && role !== 'manager' && role !== 'admin'
      ? '🔒 Super secret mission'
      : `${item.customer_name} (${item.type})`;
    return {
      ...item,
      display_name: displayName,
    };
  });
}

function updateChecklistItem(itemId, completed) {
  const st = db.prepare('UPDATE checklist_items SET completed = ? WHERE id = ?');
  const info = st.run(completed ? 1 : 0, itemId);
  return info.changes;
}

function updateOrderStatus(orderId, status) {
  const st = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
  const info = st.run(status, orderId);
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

function hoursBetween(a,b){ return Math.abs(b - a) / 3600000 }

module.exports = {
  db,
  getCustomers: () => db.prepare('SELECT * FROM customers').all(),
  getCustomerById: (id) => db.prepare('SELECT * FROM customers WHERE id = ?').get(id),
  createCustomer: ({ name, address, lat, lng, requires_clearance }) => {
    const st = db.prepare('INSERT INTO customers (name,address,lat,lng,requires_clearance) VALUES (?,?,?,?,?)');
    const info = st.run(name, address, lat || null, lng || null, requires_clearance ? 1 : 0);
    return info.lastInsertRowid;
  },
  getTechnicians: () => db.prepare('SELECT * FROM technicians').all(),
  getBookingsForTech,
  getChecklistForOrder,
  createChecklistItem,
  updateChecklistItem,
  updateOrderStatus,
  getCalendarItems,
  getOrders: () => db.prepare('SELECT * FROM orders').all(),
  createOrder: ({ customer_id, type, estimated_hours, lat, lng, assigned_tech_id }) => {
    // fill lat/lng from customer if not provided
    let latv = lat, lngv = lng;
    if ((!latv || !lngv) && customer_id) {
      const c = db.prepare('SELECT lat,lng FROM customers WHERE id = ?').get(customer_id);
      if (c) { latv = latv || c.lat; lngv = lngv || c.lng }
    }
    const st = db.prepare('INSERT INTO orders (customer_id,type,status,estimated_hours,lat,lng,assigned_tech_id) VALUES (?,?,?,?,?,?,?)');
    const info = st.run(customer_id, type, 'open', estimated_hours || 1, latv, lngv, assigned_tech_id || null);
    return info.lastInsertRowid;
  },
  suggestForOrder: (orderId) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) return [];

    const techs = db.prepare('SELECT * FROM technicians').all().filter(t => {
      try {
        const skills = JSON.parse(t.skills || '[]');
        return skills.includes(order.type);
      } catch(e){ return false }
    });

    const now = new Date();
    const horizonDays = 7;
    const suggestions = [];

    for (const tech of techs) {
      const bookings = getBookingsForTech(tech.id);

      for (let d=0; d<horizonDays; d++) {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
        const dayStart = new Date(day); dayStart.setHours(8,0,0,0);
        const dayEnd = new Date(day); dayEnd.setHours(16,0,0,0);

        const gaps = findGaps(bookings, dayStart, dayEnd, order.estimated_hours);

        for (const g of gaps) {
          const distanceKm = haversineKm(tech.base_lat, tech.base_lng, order.lat, order.lng);
          const travelMinutes = Math.round(distanceKm); // ~1 min per km at 60 km/h
          const daysOut = Math.round((g.start - now) / (24*3600*1000));
          const score = Math.max(0, Math.round(100 - travelMinutes - daysOut*5));

          suggestions.push({
            technician: tech,
            start: g.start.toISOString(),
            end: g.end.toISOString(),
            travelMinutes,
            score,
            reason: `~${distanceKm.toFixed(1)} km from tech base, ${daysOut} days out`
          });
        }
      }
    }

    return suggestions.sort((a,b)=>b.score-a.score).slice(0,5);
  }
};
