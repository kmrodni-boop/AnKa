const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { signToken, verifyPassword, requireAuth, requireRole } = require('./auth');

// Initialize database first
async function startServer() {
  try {
    await db.initDb();
    console.log('Database initialized successfully');

    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get('/api/health', (req, res) => res.json({ ok: true }));

    // ===== Auth (public) =====
    app.post('/api/auth/login', (req, res) => {
      const { username, password } = req.body || {};
      if (!username || !password) return res.status(400).json({ error: 'Brukernavn og passord kreves' });

      const user = db.getUserByUsername(username);
      if (!user || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: 'Feil brukernavn eller passord' });
      }

      const token = signToken(user);
      res.json({
        token,
        user: { id: user.id, username: user.username, name: user.name, role: user.role, technician_id: user.technician_id }
      });
    });

    // Everything below requires a valid session
    app.use('/api', requireAuth);

    app.get('/api/auth/me', (req, res) => {
      const user = db.getUserById(req.user.id);
      if (!user) return res.status(404).json({ error: 'Bruker finnes ikke' });
      res.json({ user });
    });

    // ===== Brukeradministrasjon (admin) =====
    app.get('/api/users', requireRole('admin', 'manager'), (req, res) => {
      res.json(db.listUsers());
    });

    app.post('/api/users', requireRole('admin'), (req, res) => {
      try {
        const id = db.createUser(req.body);
        res.json({ id });
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
    });

    app.patch('/api/users/:id', requireRole('admin'), (req, res) => {
      try {
        const changes = db.updateUser(parseInt(req.params.id, 10), req.body);
        res.json({ changes });
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
    });

    app.delete('/api/users/:id', requireRole('admin'), (req, res) => {
      const changes = db.deleteUser(parseInt(req.params.id, 10));
      res.json({ changes });
    });

    app.get('/api/customers', (req, res) => {
      const customers = db.getCustomers();
      res.json(customers);
    });

    app.get('/api/customers/:id', (req, res) => {
      const c = db.getCustomerById(parseInt(req.params.id, 10));
      if (!c) return res.status(404).json({ error: 'Not found' });
      res.json(c);
    });

    app.post('/api/customers', (req, res) => {
      try {
        const id = db.createCustomer(req.body);
        res.json({ id });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // ===== Fakturasystem-integrasjon =====
    // Kundedata eies av det eksterne fakturasystemet - AnKa henter/synker inn
    // en lokal kopi herfra i stedet for å administrere kunder selv.
    const INVOICE_APP_URL = process.env.INVOICE_APP_URL || 'http://localhost:5010';

    app.post('/api/customers/sync', requireRole('admin', 'manager'), async (req, res) => {
      try {
        const response = await fetch(`${INVOICE_APP_URL}/api/customers`);
        if (!response.ok) throw new Error(`Fakturasystemet svarte ${response.status}`);
        const externalCustomers = await response.json();
        const result = db.syncCustomersFromExternal(externalCustomers);
        res.json(result);
      } catch (e) {
        res.status(502).json({ error: `Kunne ikke nå fakturasystemet: ${e.message}` });
      }
    });

    app.post('/api/orders/:id/send-to-invoice', async (req, res) => {
      const id = parseInt(req.params.id, 10);
      const order = db.getOrderById(id);
      if (!order) return res.status(404).json({ error: 'Ordre finnes ikke' });
      if (order.status !== 'done') return res.status(400).json({ error: 'Kun fullførte ordre kan sendes til fakturasystemet' });

      const customer = db.getCustomerById(order.customer_id);
      const technician = order.assigned_tech_id ? db.getTechnicianById(order.assigned_tech_id) : null;

      try {
        const response = await fetch(`${INVOICE_APP_URL}/api/received-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            anka_order_id: order.id,
            customer_id: customer?.external_id || null,
            customer_name: customer?.name || null,
            customer_address: customer?.address || null,
            order_type: order.type,
            estimated_hours: order.estimated_hours,
            technician_name: technician?.name || null,
            notes: order.notes,
            completed_at: order.scheduled_end || new Date().toISOString()
          })
        });
        if (!response.ok) throw new Error(`Fakturasystemet svarte ${response.status}`);
        db.markOrderInvoiced(id);
        res.json({ success: true });
      } catch (e) {
        res.status(502).json({ error: `Kunne ikke sende til fakturasystemet: ${e.message}` });
      }
    });

    app.get('/api/technicians', (req, res) => {
      res.json(db.getTechnicians());
    });

    app.get('/api/technicians/:id', (req, res) => {
      const tech = db.getTechnicianById(parseInt(req.params.id, 10));
      if (!tech) return res.status(404).json({ error: 'Not found' });
      res.json(tech);
    });

    app.get('/api/technicians/:id/bookings', (req, res) => {
      const id = parseInt(req.params.id, 10);
      res.json(db.getBookingsForTech(id));
    });

    app.get('/api/orders/:id/checklist', (req, res) => {
      const id = parseInt(req.params.id, 10);
      res.json(db.getChecklistForOrder(id));
    });

    app.post('/api/orders/:id/checklist', (req, res) => {
      const id = parseInt(req.params.id, 10);
      const { description, section } = req.body;
      if (!description) return res.status(400).json({ error: 'description required' });
      const newId = db.createChecklistItem(id, description, section || null);
      res.json({ id: newId });
    });

    app.post('/api/orders/:id/checklist/apply-template', (req, res) => {
      const id = parseInt(req.params.id, 10);
      const { templateId } = req.body;
      if (!templateId) return res.status(400).json({ error: 'templateId required' });
      try {
        const count = db.applyTemplateToOrder(id, templateId);
        res.json({ added: count });
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
    });

    app.patch('/api/checklist/:itemId', (req, res) => {
      const itemId = parseInt(req.params.itemId, 10);
      const { status, comment } = req.body;
      if (status === undefined && comment === undefined) {
        return res.status(400).json({ error: 'status or comment required' });
      }
      const changes = db.updateChecklistItemDetails(itemId, { status, comment });
      res.json({ changes });
    });

    // ===== Sjekkliste-maler =====
    app.get('/api/checklist-templates', (req, res) => {
      res.json(db.listTemplates());
    });

    app.get('/api/checklist-templates/:id', (req, res) => {
      const template = db.getTemplateById(parseInt(req.params.id, 10));
      if (!template) return res.status(404).json({ error: 'Mal finnes ikke' });
      res.json(template);
    });

    app.post('/api/checklist-templates', requireRole('admin', 'manager'), (req, res) => {
      try {
        const id = db.createTemplate(req.body);
        res.json({ id });
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
    });

    app.put('/api/checklist-templates/:id', requireRole('admin', 'manager'), (req, res) => {
      try {
        const changes = db.updateTemplate(parseInt(req.params.id, 10), req.body);
        res.json({ changes });
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
    });

    app.delete('/api/checklist-templates/:id', requireRole('admin', 'manager'), (req, res) => {
      const changes = db.deleteTemplate(parseInt(req.params.id, 10));
      res.json({ changes });
    });

    app.post('/api/orders/:id/status', (req, res) => {
      const id = parseInt(req.params.id, 10);
      const { status, assigned_tech_id, scheduled_start, scheduled_end } = req.body;
      if (!status) return res.status(400).json({ error: 'status required' });

      try {
        const changes = db.updateOrderStatus(id, status, assigned_tech_id || null, scheduled_start || null, scheduled_end || null);
        res.json({ changes });
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
    });

    app.patch('/api/orders/:id', (req, res) => {
      const id = parseInt(req.params.id, 10);
      const updates = req.body;
      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }
      const changes = db.updateOrderFull(id, updates);
      res.json({ changes });
    });

    const ai = require('./ai');

    app.get('/api/orders/:id/review', async (req, res) => {
      const id = parseInt(req.params.id, 10);
      const order = db.getOrderById(id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      const checklist = db.getChecklistForOrder(id);
      const review = await ai.reviewChecklist(order, checklist);
      res.json({ review });
    });

    // Rollen kommer fra den innloggede brukeren, ikke fra klienten - ellers kan
    // hvem som helst be om ?role=admin og se maskerte, sensitive kunder.
    app.get('/api/calendar', (req, res) => {
      const items = db.getCalendarItems(req.user.role);
      res.json(items);
    });

    app.get('/api/orders', (req, res) => {
      res.json(db.getOrders());
    });

    app.get('/api/orders/:id', (req, res) => {
      const order = db.getOrderById(parseInt(req.params.id, 10));
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json(order);
    });

    app.post('/api/orders', (req, res) => {
      try {
        const id = db.createOrder(req.body);
        res.json({ id });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // Simple schedule suggest endpoint
    app.post('/api/schedule/suggest', (req, res) => {
      const { orderId } = req.body;
      if (!orderId) return res.status(400).json({ error: 'orderId required' });
      const suggestions = db.suggestForOrder(orderId);
      res.json(suggestions);
    });

    // Reset demo data
    app.post('/api/demo/reset', requireRole('admin', 'manager'), (req, res) => {
      try {
        const result = db.resetDemoData();
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // Serve frontend in production (if built)
    const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
    app.use(express.static(frontendDist));

    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`Backend listening on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
