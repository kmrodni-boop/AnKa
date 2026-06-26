const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

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
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  const changes = db.updateOrderStatus(id, status);
  res.json({ changes });
});

const ai = require('./ai');

app.get('/api/orders/:id/review', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const order = db.getOrders().find(o => o.id === id);
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

app.post('/api/orders', (req, res) => {
  try {
    const id = db.createOrder(req.body);
    res.json({ id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// simple schedule suggest placeholder
app.post('/api/schedule/suggest', (req, res) => {
  const { orderId } = req.body;
  const suggestions = db.suggestForOrder(orderId);
  res.json(suggestions);
});

// Serve frontend in production (if built)
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
