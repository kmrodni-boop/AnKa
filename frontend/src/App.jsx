import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import ScheduleSuggestions from './components/ScheduleSuggestions';
import OrderForm from './components/OrderForm';
import TechnicianView from './components/TechnicianView';
import CalendarView from './components/CalendarView';

export default function App() {
  const [customers, setCustomers] = React.useState([]);
  const [orders, setOrders] = React.useState([]);
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const [technicians, setTechnicians] = React.useState([]);
  const [activeTech, setActiveTech] = React.useState(null);
  const [role, setRole] = React.useState('technician');

  // New state for suggestions
  const [suggestions, setSuggestions] = React.useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(setCustomers);
    fetch('/api/orders').then(r => r.json()).then(setOrders);
    fetch('/api/technicians').then(r => r.json()).then(setTechnicians);
  }, []);

  const refreshOrders = () => {
    fetch('/api/orders').then(r => r.json()).then(setOrders);
  };

  const handleSuggestTime = async (order) => {
    setSelectedOrder(order);
    setLoadingSuggestions(true);
    setShowSuggestions(true);
    setSuggestions([]);

    try {
      const res = await fetch('/api/schedule/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      });
      const data = await res.json();
      setSuggestions(data);
    } catch (error) {
      toast.error('Kunne ikke hente forslag');
      setShowSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSelectSlot = async (slot) => {
    toast.success(`Valgte ${slot.technician?.name} - ${new Date(slot.start).toLocaleDateString('nb-NO')}`);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <Toaster position="top-center" />
      
      <h1 style={{ marginBottom: 8 }}>Nortronik Demo</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>Arbeidsordre- og planleggingssystem</p>

      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
        {/* Customers */}
        <section style={{ flex: 1 }}>
          <h2>Kunder</h2>
          <ul>
            {customers.map(c => (
              <li key={c.id}>{c.name} — {c.address}</li>
            ))}
          </ul>
        </section>

        {/* Orders */}
        <section style={{ flex: 1.5 }}>
          <h2>Ordre</h2>
          <ul style={{ marginBottom: 16 }}>
            {orders.map(o => (
              <li key={o.id} style={{ marginBottom: 6 }}>
                {o.type} for kunde {o.customer_id} — est {o.estimated_hours}t{' '}
                <button 
                  onClick={() => handleSuggestTime(o)}
                  style={{ 
                    marginLeft: 8, 
                    padding: '4px 10px', 
                    background: '#2563eb', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  Finn ledig tid
                </button>
              </li>
            ))}
          </ul>

          <OrderForm customers={customers} onCreated={refreshOrders} />
        </section>

        {/* Technicians */}
        <section style={{ flex: 1 }}>
          <h2>Teknikere</h2>
          <ul>
            {technicians.map(t => (
              <li key={t.id}>
                {t.name}{' '}
                <button onClick={() => setActiveTech(t)}>Åpne tekniker-visning</button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Calendar role selector */}
      <div style={{ marginTop: 24, marginBottom: 12 }}>
        <label>
          Kalender-rolle:{' '}
          <select value={role} onChange={e => setRole(e.target.value)}>
            {['technician', 'manager', 'admin'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
      </div>

      <CalendarView role={role} />

      {/* Suggestions Panel */}
      {showSuggestions && selectedOrder && (
        <div style={{ marginTop: 24 }}>
          <ScheduleSuggestions
            suggestions={suggestions}
            loading={loadingSuggestions}
            onSelect={handleSelectSlot}
            onClose={() => {
              setShowSuggestions(false);
              setSuggestions([]);
            }}
          />
        </div>
      )}

      {activeTech && (
        <div style={{ marginTop: 24 }}>
          <TechnicianView 
            tech={activeTech} 
            onClose={() => setActiveTech(null)} 
          />
        </div>
      )}
    </div>
  );
}