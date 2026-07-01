const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'invoice.db');

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
      name TEXT,
      org_number TEXT,
      address TEXT,
      postal_code TEXT,
      region TEXT,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      unit TEXT,
      unit_price REAL
    );

    CREATE TABLE IF NOT EXISTS received_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anka_order_id INTEGER,
      customer_id INTEGER,
      order_type TEXT,
      estimated_hours REAL,
      technician_name TEXT,
      notes TEXT,
      completed_at TEXT,
      received_at TEXT DEFAULT CURRENT_TIMESTAMP,
      invoice_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT,
      customer_id INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoice_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      description TEXT,
      quantity REAL,
      unit_price REAL
    );
  `);
}

function dropSchema() {
  db.exec(`
    DROP TABLE IF EXISTS invoice_lines;
    DROP TABLE IF EXISTS invoices;
    DROP TABLE IF EXISTS received_orders;
    DROP TABLE IF EXISTS materials;
    DROP TABLE IF EXISTS customers;
  `);
}

// Samme 11 kunder, i samme rekkefølge, som AnKa sin opprinnelige seed - slik
// at id-ene stemmer overens 1:1 uten at man må kjøre en synk før demoen kan
// vise "Send til fakturasystem" på eksisterende ordre.
function seed() {
  dropSchema();
  createSchema();

  const insertCustomer = db.prepare(`INSERT INTO customers (id,name,org_number,address,postal_code,region,contact_person,phone,email) VALUES (?,?,?,?,?,?,?,?,?)`);
  const customers = [
    [1, 'Bergen Energi', 'NO 910 111 222 MVA', 'Åsane, Bergen', '5115', 'Vestland', 'Ikke oppgitt', 'Ikke oppgitt', null],
    [2, 'Lyse Energi', 'NO 910 111 223 MVA', 'Fana, Bergen', '5221', 'Vestland', 'Ikke oppgitt', 'Ikke oppgitt', null],
    [3, 'Bergenshalvøens Kommunale Kraftselskap', 'NO 910 111 224 MVA', 'Loddefjord, Bergen', '5124', 'Vestland', 'Ikke oppgitt', 'Ikke oppgitt', null],
    [4, 'Vestkanten Energi', 'NO 910 111 225 MVA', 'Arna, Bergen', '5215', 'Vestland', 'Ikke oppgitt', 'Ikke oppgitt', null],
    [5, 'Førde Industri', 'NO 910 111 226 MVA', 'Førde, Sogn og Fjordane', '6800', 'Vestland', 'Ikke oppgitt', 'Ikke oppgitt', null],
    [6, 'Sogn og Fjordane Energi', 'NO 910 111 227 MVA', 'Sande, Sogn og Fjordane', '6823', 'Vestland', 'Ikke oppgitt', 'Ikke oppgitt', null],
    [7, 'Jølster Kraft', 'NO 910 111 228 MVA', 'Skei, Jølster', '6843', 'Vestland', 'Ikke oppgitt', 'Ikke oppgitt', null],
    [8, 'Hemmeligholdt Kunde', 'NO 910 111 229 MVA', 'Tromsø sentrum', '9008', 'Troms og Finnmark', 'Ikke oppgitt', 'Ikke oppgitt', null],
    [9, 'Statens Hemmelige Anlegg', 'NO 910 111 230 MVA', 'Kvaløya, Tromsø', '9010', 'Troms og Finnmark', 'Ikke oppgitt', 'Ikke oppgitt', null],
    [10, 'Finnmark Kraft', 'NO 910 111 231 MVA', 'Hammerfest', '9600', 'Finnmark', 'Ikke oppgitt', 'Ikke oppgitt', null],
    [11, 'Troms Kraft', 'NO 910 111 232 MVA', 'Harstad', '9406', 'Troms og Finnmark', 'Ikke oppgitt', 'Ikke oppgitt', null]
  ];
  for (const c of customers) insertCustomer.run(...c);

  const insertMaterial = db.prepare(`INSERT INTO materials (name,unit,unit_price) VALUES (?,?,?)`);
  const materials = [
    ['Arbeidstime - tekniker', 'time', 950],
    ['Utrykning / kjøregodtgjørelse', 'stk', 650],
    ['Trykkluftslange 10m', 'stk', 420],
    ['Sikkerhetsventil', 'stk', 780],
    ['CO2-sylinder 5kg', 'stk', 1450],
    ['Detektor - røyk/varme', 'stk', 890],
    ['Utløsermekanisme', 'stk', 1650],
    ['Diverse rekvisita', 'stk', 150]
  ];
  for (const m of materials) insertMaterial.run(...m);
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

function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = db.prepare(`SELECT COUNT(*) AS n FROM invoices WHERE invoice_number LIKE ?`).get(`${year}-%`).n;
  return `${year}-${String(count + 1).padStart(4, '0')}`;
}

module.exports = {
  initDb,

  getCustomers: () => db.prepare('SELECT * FROM customers ORDER BY name').all(),
  getCustomerById: (id) => db.prepare('SELECT * FROM customers WHERE id = ?').get(id) || null,
  createCustomer: ({ name, org_number, address, postal_code, region, contact_person, phone, email }) => {
    const result = db.prepare('INSERT INTO customers (name,org_number,address,postal_code,region,contact_person,phone,email) VALUES (?,?,?,?,?,?,?,?)')
      .run(name, org_number || null, address || null, postal_code || null, region || null, contact_person || null, phone || null, email || null);
    return result.lastInsertRowid;
  },
  updateCustomer: (id, { name, org_number, address, postal_code, region, contact_person, phone, email }) => {
    db.prepare('UPDATE customers SET name=?, org_number=?, address=?, postal_code=?, region=?, contact_person=?, phone=?, email=? WHERE id=?')
      .run(name, org_number || null, address || null, postal_code || null, region || null, contact_person || null, phone || null, email || null, id);
    return 1;
  },
  deleteCustomer: (id) => db.prepare('DELETE FROM customers WHERE id = ?').run(id).changes,
  findOrCreateCustomerByName: (name, address) => {
    const existing = db.prepare('SELECT * FROM customers WHERE name = ?').get(name);
    if (existing) return existing.id;
    const result = db.prepare('INSERT INTO customers (name, address) VALUES (?, ?)').run(name, address || null);
    return result.lastInsertRowid;
  },

  getMaterials: () => db.prepare('SELECT * FROM materials ORDER BY name').all(),
  getMaterialById: (id) => db.prepare('SELECT * FROM materials WHERE id = ?').get(id) || null,
  createMaterial: ({ name, unit, unit_price }) => {
    const result = db.prepare('INSERT INTO materials (name, unit, unit_price) VALUES (?, ?, ?)').run(name, unit || 'stk', unit_price || 0);
    return result.lastInsertRowid;
  },
  updateMaterial: (id, { name, unit, unit_price }) => {
    db.prepare('UPDATE materials SET name=?, unit=?, unit_price=? WHERE id=?').run(name, unit || 'stk', unit_price || 0, id);
    return 1;
  },
  deleteMaterial: (id) => db.prepare('DELETE FROM materials WHERE id = ?').run(id).changes,

  getReceivedOrders: () => db.prepare(`
    SELECT r.*, c.name AS customer_name
    FROM received_orders r
    LEFT JOIN customers c ON c.id = r.customer_id
    ORDER BY r.received_at DESC
  `).all(),
  getReceivedOrderById: (id) => db.prepare(`
    SELECT r.*, c.name AS customer_name
    FROM received_orders r
    LEFT JOIN customers c ON c.id = r.customer_id
    WHERE r.id = ?
  `).get(id) || null,
  createReceivedOrder: ({ anka_order_id, customer_id, customer_name, customer_address, order_type, estimated_hours, technician_name, notes, completed_at }) => {
    let resolvedCustomerId = customer_id && db.prepare('SELECT id FROM customers WHERE id = ?').get(customer_id) ? customer_id : null;
    if (!resolvedCustomerId && customer_name) {
      const existing = db.prepare('SELECT id FROM customers WHERE name = ?').get(customer_name);
      resolvedCustomerId = existing ? existing.id : db.prepare('INSERT INTO customers (name, address) VALUES (?, ?)').run(customer_name, customer_address || null).lastInsertRowid;
    }
    const result = db.prepare(`
      INSERT INTO received_orders (anka_order_id, customer_id, order_type, estimated_hours, technician_name, notes, completed_at)
      VALUES (?,?,?,?,?,?,?)
    `).run(anka_order_id, resolvedCustomerId, order_type || null, estimated_hours || null, technician_name || null, notes || null, completed_at || null);
    return result.lastInsertRowid;
  },

  getInvoices: () => db.prepare(`
    SELECT i.*, c.name AS customer_name
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    ORDER BY i.id DESC
  `).all(),
  getInvoiceById: (id) => {
    const invoice = db.prepare(`
      SELECT i.*, c.name AS customer_name, c.address AS customer_address, c.postal_code, c.region,
             c.org_number, c.contact_person, c.phone, c.email
      FROM invoices i
      LEFT JOIN customers c ON c.id = i.customer_id
      WHERE i.id = ?
    `).get(id);
    if (!invoice) return null;
    const lines = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id').all(id);
    return { ...invoice, lines };
  },
  createInvoice: ({ customer_id, notes, lines, received_order_id }) => {
    const invoiceNumber = nextInvoiceNumber();
    const result = db.prepare('INSERT INTO invoices (invoice_number, customer_id, notes) VALUES (?, ?, ?)')
      .run(invoiceNumber, customer_id, notes || null);
    const invoiceId = result.lastInsertRowid;

    const insertLine = db.prepare('INSERT INTO invoice_lines (invoice_id, description, quantity, unit_price) VALUES (?, ?, ?, ?)');
    for (const line of lines) {
      if (!line.description || !line.quantity) continue;
      insertLine.run(invoiceId, line.description, line.quantity, line.unit_price || 0);
    }

    if (received_order_id) {
      db.prepare('UPDATE received_orders SET invoice_id = ? WHERE id = ?').run(invoiceId, received_order_id);
    }

    return invoiceId;
  },

  resetDemoData: () => {
    seed();
    return { success: true };
  }
};
