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
  const [role, setRole] = React.useState('coordinator');

  React.useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(setCustomers);
    fetch('/api/orders').then(r => r.json()).then(setOrders);
    fetch('/api/technicians').then(r => r.json()).then(setTechnicians);
  }, []);

  const refreshOrders = () => {
    fetch('/api/orders').then(r => r.json()).then(setOrders);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Toaster position="top-center" />

      {/* Sidebar */}
      <div className="w-72 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900">Nortronik</h1>
          <p className="text-sm text-gray-500">Planlegging & Oppdrag</p>
        </div>

        <div className="p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Kunder</div>
          
          {customers.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">Ingen kunder</div>
          )}

          {customers.map((customer) => (
            <div
              key={customer.id}
              onClick={() => setSelectedCustomer(customer)}
              className={`px-3 py-3 rounded-xl cursor-pointer mb-1 transition-all ${
                selectedCustomer?.id === customer.id 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div>{customer.name}</div>
              <div className="text-xs text-gray-500 truncate">{customer.address}</div>
            </div>
          ))}
        </div>

        <div className="mt-auto p-4 border-t">
          <OrderForm customers={customers} onCreated={refreshOrders} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-14 border-b bg-white flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="text-lg font-semibold text-gray-800">
              {selectedCustomer ? selectedCustomer.name : 'Oversikt'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5 bg-white"
            >
              <option value="coordinator">Koordinator</option>
              <option value="manager">Leder</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {!selectedCustomer ? (
            <div className="max-w-md mx-auto mt-20 text-center">
              <div className="text-6xl mb-4">👋</div>
              <h2 className="text-2xl font-semibold mb-2">Velkommen</h2>
              <p className="text-gray-600">
                Velg en kunde fra listen til venstre for å se ordre og planlegge arbeid.
              </p>
            </div>
          ) : (
            <CustomerDetail
              customer={selectedCustomer}
              orders={orders}
              onBack={() => setSelectedCustomer(null)}
              onOrderAction={refreshOrders}
            />
          )}
        </div>
      </div>

      {/* Right panel - Technician quick access */}
      <div className="w-80 border-l bg-white p-5 overflow-auto hidden xl:block">
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Teknikere</h3>
          {technicians.map(t => (
            <div 
              key={t.id}
              onClick={() => setActiveTech(t)}
              className="p-3 rounded-xl border mb-2 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              {t.name}
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold mb-3">Kalender</h3>
          <CalendarView role={role} />
        </div>
      </div>

      {/* Technician View Overlay */}
      {activeTech && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
          <div className="w-full max-w-md bg-white h-full overflow-auto">
            <TechnicianView 
              tech={activeTech} 
              onClose={() => setActiveTech(null)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}