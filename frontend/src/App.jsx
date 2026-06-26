import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import ScheduleSuggestions from './components/ScheduleSuggestions';
import OrderForm from './components/OrderForm';
import TechnicianView from './components/TechnicianView';
import CalendarView from './components/CalendarView';
import CustomerDetail from './components/CustomerDetail';

export default function App() {
  const [customers, setCustomers] = React.useState([]);
  const [orders, setOrders] = React.useState([]);
  const [technicians, setTechnicians] = React.useState([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState(null);
  const [activeTech, setActiveTech] = React.useState(null);
  const [role, setRole] = React.useState('technician');

  React.useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(setCustomers);
    fetch('/api/orders').then(r => r.json()).then(setOrders);
    fetch('/api/technicians').then(r => r.json()).then(setTechnicians);
  }, []);

  const refreshOrders = () => {
    fetch('/api/orders').then(r => r.json()).then(setOrders);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui' }}>
      <Toaster position="top-center" />

      {/* Sidebar - Customers */}
      <div style={{ 
        width: 280, 
        borderRight: '1px solid #e5e7eb', 
        padding: 20, 
        background: '#f9fafb',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Kunder</h2>
        
        {customers.length === 0 && <p style={{ color: '#888' }}>Ingen kunder</p>}
        
        {customers.map(customer => (
          <div
            key={customer.id}
            onClick={() => setSelectedCustomer(customer)}
            style={{
              padding: '12px 16px',
              marginBottom: 8,
              borderRadius: 10,
              cursor: 'pointer',
              background: selectedCustomer?.id === customer.id ? '#dbeafe' : 'white',
              border: selectedCustomer?.id === customer.id ? '1px solid #3b82f6' : '1px solid #e5e7eb',
              transition: 'all 0.1s ease'
            }}
          >
            <div style={{ fontWeight: 600 }}>{customer.name}</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{customer.address}</div>
          </div>
        ))}

        <div style={{ marginTop: 24 }}>
          <OrderForm customers={customers} onCreated={refreshOrders} />
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        {!selectedCustomer ? (
          <div style={{ textAlign: 'center', paddingTop: 80, color: '#666' }}>
            <h2>Velg en kunde fra listen</h2>
            <p>eller opprett en ny ordre</p>
          </div>
        ) : (
          <CustomerDetail
            customer={selectedCustomer}
            orders={orders}
            onBack={() => setSelectedCustomer(null)}
            onOrderAction={() => {}}
          />
        )}
      </div>

      {/* Right side - Technician + Calendar */}
      <div style={{ width: 320, borderLeft: '1px solid #e5e7eb', padding: 20, background: '#f9fafb', overflowY: 'auto' }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 14, fontWeight: 500 }}>Kalender-rolle</label>
          <select 
            value={role} 
            onChange={e => setRole(e.target.value)}
            style={{ width: '100%', padding: 8, marginTop: 6, borderRadius: 6 }}
          >
            {['technician', 'manager', 'admin'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <CalendarView role={role} />

        <div style={{ marginTop: 32 }}>
          <h3 style={{ marginBottom: 12 }}>Teknikere</h3>
          {technicians.map(t => (
            <div 
              key={t.id} 
              style={{ 
                padding: '10px 14px', 
                background: 'white', 
                borderRadius: 8, 
                marginBottom: 8,
                border: '1px solid #e5e7eb',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTech(t)}
            >
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {activeTech && (
        <div style={{ 
          position: 'fixed', 
          top: 0, right: 0, bottom: 0, 
          width: 380, 
          background: 'white', 
          boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
          zIndex: 100,
          padding: 24,
          overflowY: 'auto'
        }}>
          <TechnicianView 
            tech={activeTech} 
            onClose={() => setActiveTech(null)} 
          />
        </div>
      )}
    </div>
  );
}