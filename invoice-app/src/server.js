const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { esc, nok, layout } = require('./views');

async function startServer() {
  await db.initDb();
  console.log('Faktura-database initialisert');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ===== API (brukes av AnKa) =====

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.get('/api/customers', (req, res) => {
    res.json(db.getCustomers());
  });

  app.post('/api/received-orders', (req, res) => {
    try {
      const id = db.createReceivedOrder(req.body);
      res.json({ id });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // ===== Forsiden =====

  app.get('/', (req, res) => {
    const customers = db.getCustomers();
    const materials = db.getMaterials();
    const received = db.getReceivedOrders();
    const invoices = db.getInvoices();
    const unbilled = received.filter(r => !r.invoice_id);

    res.send(layout('Forsiden', `
      <div class="panel">
        <p>Velkommen til FakturaPro 2000 - din komplette løsning for fakturering!</p>
        <table class="grid">
          <tr><th>Kunder</th><td>${customers.length}</td></tr>
          <tr><th>Varer/tjenester i katalog</th><td>${materials.length}</td></tr>
          <tr><th>Mottatt fra AnKa, ikke fakturert</th><td>${unbilled.length}</td></tr>
          <tr><th>Fakturaer opprettet</th><td>${invoices.length}</td></tr>
        </table>
      </div>
      ${unbilled.length > 0 ? `
      <div class="panel">
        <h2>⚠ Ordre som venter på fakturering</h2>
        <table class="grid">
          <tr><th>Fra AnKa-ordre</th><th>Kunde</th><th>Type</th><th>Mottatt</th><th></th></tr>
          ${unbilled.slice(0, 5).map(r => `
            <tr>
              <td>#${esc(r.anka_order_id)}</td>
              <td>${esc(r.customer_name || 'Ukjent')}</td>
              <td>${esc(r.order_type)}</td>
              <td>${esc(new Date(r.received_at).toLocaleDateString('nb-NO'))}</td>
              <td><a href="/fakturaer/ny?fra_ordre=${r.id}" class="btn btn-primary">Lag faktura</a></td>
            </tr>
          `).join('')}
        </table>
      </div>` : ''}
    `, { activeNav: 'home' }));
  });

  // ===== Kunder =====

  app.get('/kunder', (req, res) => {
    const customers = db.getCustomers();
    res.send(layout('Kunder', `
      <div class="panel">
        <a href="/kunder/ny" class="btn btn-primary">+ Ny kunde</a>
      </div>
      <div class="panel">
        <table class="grid">
          <tr><th>Navn</th><th>Org.nr</th><th>Adresse</th><th>Kontakt</th><th></th></tr>
          ${customers.map(c => `
            <tr>
              <td>${esc(c.name)}</td>
              <td>${esc(c.org_number)}</td>
              <td>${esc(c.address)} ${esc(c.postal_code)} ${esc(c.region)}</td>
              <td>${esc(c.contact_person)}</td>
              <td><a href="/kunder/${c.id}/rediger">Rediger</a></td>
            </tr>
          `).join('')}
        </table>
      </div>
    `, { activeNav: 'customers' }));
  });

  const customerForm = (customer = {}) => `
    <form method="post" action="${customer.id ? `/kunder/${customer.id}` : '/kunder'}">
      <label>Kundenavn</label>
      <input type="text" name="name" value="${esc(customer.name)}" required>
      <label>Org.nr (valgfritt)</label>
      <input type="text" name="org_number" value="${esc(customer.org_number)}">
      <label>Adresse</label>
      <input type="text" name="address" value="${esc(customer.address)}">
      <label>Postnr</label>
      <input type="text" name="postal_code" value="${esc(customer.postal_code)}">
      <label>Region</label>
      <input type="text" name="region" value="${esc(customer.region)}">
      <label>Kontaktperson</label>
      <input type="text" name="contact_person" value="${esc(customer.contact_person)}">
      <label>Telefon</label>
      <input type="tel" name="phone" value="${esc(customer.phone)}">
      <label>E-post</label>
      <input type="email" name="email" value="${esc(customer.email)}">
      <p><button type="submit" class="btn btn-primary">Lagre</button>
      ${customer.id ? `<a href="/kunder" class="btn">Avbryt</a>` : ''}</p>
    </form>
  `;

  app.get('/kunder/ny', (req, res) => {
    res.send(layout('Ny kunde', `<div class="panel">${customerForm()}</div>`, { activeNav: 'customers' }));
  });

  app.post('/kunder', (req, res) => {
    db.createCustomer(req.body);
    res.redirect('/kunder');
  });

  app.get('/kunder/:id/rediger', (req, res) => {
    const customer = db.getCustomerById(parseInt(req.params.id, 10));
    if (!customer) return res.status(404).send('Kunde finnes ikke');
    res.send(layout('Rediger kunde', `<div class="panel">${customerForm(customer)}</div>`, { activeNav: 'customers' }));
  });

  app.post('/kunder/:id', (req, res) => {
    db.updateCustomer(parseInt(req.params.id, 10), req.body);
    res.redirect('/kunder');
  });

  // ===== Varer/tjenester =====

  app.get('/varer', (req, res) => {
    const materials = db.getMaterials();
    res.send(layout('Varer/Tjenester', `
      <div class="panel">
        <a href="/varer/ny" class="btn btn-primary">+ Ny vare/tjeneste</a>
      </div>
      <div class="panel">
        <table class="grid">
          <tr><th>Navn</th><th>Enhet</th><th>Pris (eks. mva)</th><th></th></tr>
          ${materials.map(m => `
            <tr>
              <td>${esc(m.name)}</td>
              <td>${esc(m.unit)}</td>
              <td>${nok(m.unit_price)} kr</td>
              <td><a href="/varer/${m.id}/rediger">Rediger</a></td>
            </tr>
          `).join('')}
        </table>
      </div>
    `, { activeNav: 'materials' }));
  });

  const materialForm = (material = {}) => `
    <form method="post" action="${material.id ? `/varer/${material.id}` : '/varer'}">
      <label>Navn</label>
      <input type="text" name="name" value="${esc(material.name)}" required>
      <label>Enhet</label>
      <input type="text" name="unit" value="${esc(material.unit || 'stk')}">
      <label>Pris (eks. mva)</label>
      <input type="number" step="0.01" name="unit_price" value="${material.unit_price ?? 0}">
      <p><button type="submit" class="btn btn-primary">Lagre</button>
      ${material.id ? `<a href="/varer" class="btn">Avbryt</a>` : ''}</p>
    </form>
  `;

  app.get('/varer/ny', (req, res) => {
    res.send(layout('Ny vare/tjeneste', `<div class="panel">${materialForm()}</div>`, { activeNav: 'materials' }));
  });

  app.post('/varer', (req, res) => {
    db.createMaterial(req.body);
    res.redirect('/varer');
  });

  app.get('/varer/:id/rediger', (req, res) => {
    const material = db.getMaterialById(parseInt(req.params.id, 10));
    if (!material) return res.status(404).send('Vare finnes ikke');
    res.send(layout('Rediger vare', `<div class="panel">${materialForm(material)}</div>`, { activeNav: 'materials' }));
  });

  app.post('/varer/:id', (req, res) => {
    db.updateMaterial(parseInt(req.params.id, 10), req.body);
    res.redirect('/varer');
  });

  // ===== Mottatt fra AnKa =====

  app.get('/mottatt', (req, res) => {
    const received = db.getReceivedOrders();
    res.send(layout('Mottatt fra AnKa', `
      <div class="panel">
        <p class="muted">Dette er ordre AnKa har sendt hit via API etter at de er markert fullført. Trykk "Lag faktura" for å fakturere.</p>
        <table class="grid">
          <tr><th>AnKa-ordre</th><th>Kunde</th><th>Type</th><th>Timer</th><th>Tekniker</th><th>Mottatt</th><th></th></tr>
          ${received.map(r => `
            <tr>
              <td>#${esc(r.anka_order_id)}</td>
              <td>${esc(r.customer_name || 'Ukjent')}</td>
              <td>${esc(r.order_type)}</td>
              <td>${esc(r.estimated_hours)}</td>
              <td>${esc(r.technician_name)}</td>
              <td>${esc(new Date(r.received_at).toLocaleString('nb-NO'))}</td>
              <td>${r.invoice_id
                ? `<a href="/fakturaer/${r.invoice_id}">Se faktura</a>`
                : `<a href="/fakturaer/ny?fra_ordre=${r.id}" class="btn btn-primary">Lag faktura</a>`}</td>
            </tr>
          `).join('')}
          ${received.length === 0 ? '<tr><td colspan="7" class="muted">Ingen ordre mottatt ennå.</td></tr>' : ''}
        </table>
      </div>
    `, { activeNav: 'received' }));
  });

  // ===== Fakturaer =====

  app.get('/fakturaer', (req, res) => {
    const invoices = db.getInvoices();
    res.send(layout('Fakturaer', `
      <div class="panel">
        <a href="/fakturaer/ny" class="btn btn-primary">+ Ny faktura (uten AnKa-ordre)</a>
      </div>
      <div class="panel">
        <table class="grid">
          <tr><th>Fakturanr</th><th>Kunde</th><th>Opprettet</th><th></th></tr>
          ${invoices.map(i => `
            <tr>
              <td>${esc(i.invoice_number)}</td>
              <td>${esc(i.customer_name)}</td>
              <td>${esc(new Date(i.created_at).toLocaleDateString('nb-NO'))}</td>
              <td><a href="/fakturaer/${i.id}">Vis</a></td>
            </tr>
          `).join('')}
          ${invoices.length === 0 ? '<tr><td colspan="4" class="muted">Ingen fakturaer opprettet ennå.</td></tr>' : ''}
        </table>
      </div>
    `, { activeNav: 'invoices' }));
  });

  app.get('/fakturaer/ny', (req, res) => {
    const receivedOrderId = req.query.fra_ordre ? parseInt(req.query.fra_ordre, 10) : null;
    const receivedOrder = receivedOrderId ? db.getReceivedOrderById(receivedOrderId) : null;
    const customers = db.getCustomers();
    const materials = db.getMaterials();

    const laborLine = receivedOrder && receivedOrder.estimated_hours
      ? `<tr>
           <td><input type="text" name="line_desc_0" value="Arbeidstid - ${esc(receivedOrder.order_type)} (AnKa-ordre #${esc(receivedOrder.anka_order_id)})"></td>
           <td><input type="number" step="0.5" name="line_qty_0" value="${receivedOrder.estimated_hours}"></td>
           <td><input type="number" step="0.01" name="line_price_0" value="950"></td>
         </tr>`
      : `<tr>
           <td><input type="text" name="line_desc_0" value=""></td>
           <td><input type="number" step="0.5" name="line_qty_0" value=""></td>
           <td><input type="number" step="0.01" name="line_price_0" value=""></td>
         </tr>`;

    const extraLines = Array.from({ length: 4 }).map((_, i) => `
      <tr>
        <td><input type="text" name="line_desc_${i + 1}" list="material-names"></td>
        <td><input type="number" step="0.5" name="line_qty_${i + 1}"></td>
        <td><input type="number" step="0.01" name="line_price_${i + 1}"></td>
      </tr>
    `).join('');

    res.send(layout('Ny faktura', `
      <div class="panel">
        ${receivedOrder ? `<p class="badge">Basert på AnKa-ordre #${esc(receivedOrder.anka_order_id)}</p>` : ''}
        <form method="post" action="/fakturaer">
          <input type="hidden" name="received_order_id" value="${receivedOrder ? receivedOrder.id : ''}">
          <label>Kunde</label>
          <select name="customer_id" required>
            <option value="">Velg kunde...</option>
            ${customers.map(c => `<option value="${c.id}" ${receivedOrder && receivedOrder.customer_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>

          <label>Notat (valgfritt)</label>
          <textarea name="notes" rows="2">${receivedOrder ? esc(receivedOrder.notes) : ''}</textarea>

          <h2>Linjer</h2>
          <datalist id="material-names">
            ${materials.map(m => `<option value="${esc(m.name)}" data-price="${m.unit_price}">`).join('')}
          </datalist>
          <table class="grid">
            <tr><th>Beskrivelse</th><th>Antall</th><th>Pris/enhet (kr)</th></tr>
            ${laborLine}
            ${extraLines}
          </table>
          <p class="muted">Varekatalog for referanse: ${materials.map(m => `${esc(m.name)} (${nok(m.unit_price)} kr/${esc(m.unit)})`).join(', ')}</p>

          <p><button type="submit" class="btn btn-primary">Opprett faktura</button></p>
        </form>
      </div>
    `, { activeNav: 'invoices' }));
  });

  app.post('/fakturaer', (req, res) => {
    const { customer_id, notes, received_order_id } = req.body;
    const lines = [];
    for (let i = 0; i < 5; i++) {
      const description = req.body[`line_desc_${i}`];
      const quantity = parseFloat(req.body[`line_qty_${i}`]);
      const unit_price = parseFloat(req.body[`line_price_${i}`]);
      if (description && quantity) {
        lines.push({ description, quantity, unit_price: unit_price || 0 });
      }
    }

    const invoiceId = db.createInvoice({
      customer_id: parseInt(customer_id, 10),
      notes,
      lines,
      received_order_id: received_order_id ? parseInt(received_order_id, 10) : null
    });
    res.redirect(`/fakturaer/${invoiceId}`);
  });

  app.get('/fakturaer/:id', (req, res) => {
    const invoice = db.getInvoiceById(parseInt(req.params.id, 10));
    if (!invoice) return res.status(404).send('Faktura finnes ikke');

    const subtotal = invoice.lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
    const mva = subtotal * 0.25;
    const total = subtotal + mva;

    res.send(layout(`Faktura ${invoice.invoice_number}`, `
      <div class="panel" style="background:#fff; font-family: 'Times New Roman', serif;">
        <table style="width:100%; border:none;">
          <tr>
            <td style="border:none; vertical-align:top;">
              <div style="font-size:20px; font-weight:bold; color:#2a4a80;">Nortronik AS</div>
              <div>Fiktiv Industrivei 1</div>
              <div>0001 Oslo</div>
              <div>Org.nr: NO 999 888 777 MVA</div>
            </td>
            <td style="border:none; vertical-align:top; text-align:right;">
              <div style="font-size:22px; font-weight:bold;">FAKTURA</div>
              <div>Fakturanr: <strong>${esc(invoice.invoice_number)}</strong></div>
              <div>Dato: ${esc(new Date(invoice.created_at).toLocaleDateString('nb-NO'))}</div>
              <div>Forfallsdato: ${esc(new Date(Date.now() + 14 * 24 * 3600 * 1000).toLocaleDateString('nb-NO'))}</div>
            </td>
          </tr>
        </table>

        <hr>

        <table style="width:100%; border:none; margin-bottom:10px;">
          <tr>
            <td style="border:none; vertical-align:top;">
              <strong>Fakturamottaker:</strong><br>
              ${esc(invoice.customer_name)}<br>
              ${esc(invoice.customer_address || '')}<br>
              ${esc(invoice.postal_code || '')} ${esc(invoice.region || '')}<br>
              ${invoice.org_number ? `Org.nr: ${esc(invoice.org_number)}` : ''}
            </td>
          </tr>
        </table>

        <table class="grid">
          <tr><th>Beskrivelse</th><th>Antall</th><th>Pris/enhet</th><th>Sum</th></tr>
          ${invoice.lines.map(l => `
            <tr>
              <td>${esc(l.description)}</td>
              <td>${l.quantity}</td>
              <td>${nok(l.unit_price)} kr</td>
              <td>${nok(l.quantity * l.unit_price)} kr</td>
            </tr>
          `).join('')}
        </table>

        <table style="width:300px; margin-left:auto; margin-top:10px; border:none;">
          <tr><td style="border:none;">Sum eks. mva:</td><td style="border:none; text-align:right;">${nok(subtotal)} kr</td></tr>
          <tr><td style="border:none;">MVA (25%):</td><td style="border:none; text-align:right;">${nok(mva)} kr</td></tr>
          <tr><td style="border:none; font-weight:bold; border-top:2px solid #000;">Å betale:</td><td style="border:none; text-align:right; font-weight:bold; border-top:2px solid #000;">${nok(total)} kr</td></tr>
        </table>

        ${invoice.notes ? `<p><strong>Notat:</strong> ${esc(invoice.notes)}</p>` : ''}

        <p style="margin-top:30px; text-align:center; color:#555;">Takk for handelen! Betaling til kontonr 1234.56.78901</p>
      </div>
      <p class="muted">(Dette er en forenklet demo-faktura og oppfyller ikke alle formelle fakturakrav.)</p>
      <button onclick="window.print()" class="btn btn-primary">🖨 Skriv ut / Lagre som PDF</button>
      <a href="/fakturaer" class="btn">Tilbake til liste</a>
      <style>@media print { .titlebar, .navbar, .footer, .btn { display: none !important; } }</style>
    `, { activeNav: 'invoices' }));
  });

  // Reset demo-data
  app.post('/api/reset', (req, res) => {
    res.json(db.resetDemoData());
  });

  const port = process.env.PORT || 5010;
  app.listen(port, () => {
    console.log(`Faktura-app kjører på http://localhost:${port}`);
  });
}

startServer();
