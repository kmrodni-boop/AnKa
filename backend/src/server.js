const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

// Initialize database first
async function startServer() {
  try {
    await db.initDb();
    console.log('Database initialized successfully');
    
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get('/api/health', (req, res) => res.json({ ok: true }));

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
      const { description } = req.body;
      if (!description) return res.status(400).json({ error: 'description required' });
      const newId = db.createChecklistItem(id, description);
      res.json({ id: newId });
    });

    app.patch('/api/checklist/:itemId', (req, res) => {
      const itemId = parseInt(req.params.itemId, 10);
      const { completed } = req.body;
      if (completed === undefined) return res.status(400).json({ error: 'completed required' });
      const changes = db.updateChecklistItem(itemId, completed);
      res.json({ changes });
    });

    app.post('/api/orders/:id/status', (req, res) => {
      const id = parseInt(req.params.id, 10);
      const { status, assigned_tech_id, scheduled_start, scheduled_end } = req.body;
      if (!status) return res.status(400).json({ error: 'status required' });
      
      const changes = db.updateOrderStatus(id, status, assigned_tech_id || null, scheduled_start || null, scheduled_end || null);
      res.json({ changes });
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

    app.get('/api/calendar', (req, res) => {
      const role = req.query.role || 'technician';
      const items = db.getCalendarItems(role);
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
    app.post('/api/demo/reset', (req, res) => {
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

    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      console.log(`Backend listening on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
