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
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [customersRes, ordersRes, techniciansRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/orders'),
          fetch('/api/technicians')
        ]);
        const [customersData, ordersData, techniciansData] = await Promise.all([
          customersRes.json(),
          ordersRes.json(),
          techniciansRes.json()
        ]);
        setCustomers(customersData);
        setOrders(ordersData);
        setTechnicians(techniciansData);
      } catch (error) {
        toast.error('Feil ved lasting av data');
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const refreshOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      setOrders(data);
      toast.success('Ordreliste oppdatert');
    } catch (error) {
      toast.error('Feil ved oppdatering av ordre');
    }
  };

  const handleResetDemo = async () => {
    if (window.confirm('Er du sikker på at du vil nullstille demo-data?')) {
      try {
        const res = await fetch('/api/demo/reset', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          toast.success('Demo-data nullstilt!');
          // Refresh all data
          const [customersRes, ordersRes, techniciansRes] = await Promise.all([
            fetch('/api/customers'),
            fetch('/api/orders'),
            fetch('/api/technicians')
          ]);
          const [customersData, ordersData, techniciansData] = await Promise.all([
            customersRes.json(),
            ordersRes.json(),
            techniciansRes.json()
          ]);
          setCustomers(customersData);
          setOrders(ordersData);
          setTechnicians(techniciansData);
        }
      } catch (error) {
        toast.error('Feil ved nullstilling av data');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'bg-yellow-100 text-yellow-700';
      case 'planlagt':
        return 'bg-blue-100 text-blue-700';
      case 'in_progress':
        return 'bg-purple-100 text-purple-700';
      case 'done':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Laster data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Toaster position="top-center" />

      {/* Sidebar */}
      <div className="w-72 bg-white border-r flex flex-col">
        <div className="p-6 border-b bg-gradient-to-br from-blue-600 to-blue-800">
          <h1 className="text-2xl font-bold text-white">Nortronik</h1>
          <p className="text-sm text-blue-100">Arbeidsordre & Planlegging</p>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kunder</div>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">{customers.length}</span>
          </div>
          
          {customers.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400 text-center">
              Ingen kunder funnet
            </div>
          )}

          <div className="space-y-1">
            {customers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className={`px-4 py-3 rounded-xl cursor-pointer transition-all border-2 ${
                  selectedCustomer?.id === customer.id 
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-medium' 
                    : 'hover:bg-gray-100 text-gray-700 border-transparent'
                }`}
              >
                <div className="font-medium truncate">{customer.name}</div>
                <div className="text-xs text-gray-500 truncate">{customer.address}</div>
                {customer.requires_clearance && (
                  <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                    <span>🔒</span> Krever klarering
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto p-4 border-t bg-gray-50">
          <OrderForm customers={customers} onCreated={refreshOrders} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-14 border-b bg-white flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="text-lg font-semibold text-gray-800">
              {selectedCustomer ? (
                <span className="flex items-center gap-2">
                  {selectedCustomer.requires_clearance && <span>🔒</span>}
                  {selectedCustomer.name}
                </span>
              ) : 'Oversikt'}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Reset demo button */}
            <button
              onClick={handleResetDemo}
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
            >
              🔄 Nullstill Demo
            </button>
            
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5 bg-white shadow-sm"
            >
              <option value="coordinator">Koordinator</option>
              <option value="technician">Tekniker</option>
              <option value="manager">Leder</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          {!selectedCustomer ? (
            <div className="max-w-2xl mx-auto mt-16 text-center">
              <div className="text-8xl mb-6">🗺️</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Velkommen til Nortronik Planlegging</h2>
              <p className="text-gray-600 text-lg mb-8">
                Velg en kunde fra listen til venstre for å se ordre og planlegge arbeid.
              </p>
              
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="bg-white p-4 rounded-2xl shadow border">
                  <div className="text-2xl font-bold text-blue-600">{customers.length}</div>
                  <div className="text-sm text-gray-500">Kunder</div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow border">
                  <div className="text-2xl font-bold text-green-600">{technicians.length}</div>
                  <div className="text-sm text-gray-500">Teknikere</div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow border">
                  <div className="text-2xl font-bold text-purple-600">{orders.length}</div>
                  <div className="text-sm text-gray-500">Ordrer</div>
                </div>
              </div>
            </div>
          ) : (
            <CustomerDetail
              customer={selectedCustomer}
              orders={orders}
              technicians={technicians}
              onBack={() => setSelectedCustomer(null)}
              onOrderAction={refreshOrders}
              role={role}
            />
          )}
        </div>
      </div>

      {/* Right panel - Technician quick access */}
      <div className="w-80 border-l bg-white p-5 overflow-auto hidden xl:block">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Teknikere</h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{technicians.length}</span>
          </div>
          
          {technicians.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-4">Ingen teknikere</div>
          )}
          
          <div className="space-y-2">
            {technicians.map(t => (
              <div 
                key={t.id}
                onClick={() => setActiveTech(t)}
                className="p-4 rounded-xl border-2 hover:bg-gray-50 cursor-pointer transition-all border-transparent hover:border-blue-200 group"
              >
                <div className="font-medium text-gray-900 group-hover:text-blue-700">{t.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Base: {t.base_lat?.toFixed(3)}, {t.base_lng?.toFixed(3)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Kompetanse: {JSON.parse(t.skills || '[]').join(', ')}
                </div>
                {t.clearance_level >= 2 && (
                  <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <span>✓</span> Clearance Level {t.clearance_level}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Kalender</h3>
            <span className="text-xs text-gray-500">
              {role === 'manager' || role === 'admin' ? 'Full visning' : 'Maskert'}
            </span>
          </div>
          <CalendarView role={role} />
        </div>

        {/* Demo info */}
        <div className="mt-auto pt-4 border-t">
          <div className="bg-blue-50 p-3 rounded-xl">
            <div className="text-xs font-semibold text-blue-700 mb-1">DEMO MODUS</div>
            <div className="text-xs text-blue-600">
              All data er fiktiv. Bruk "Nullstill Demo" for å starte på nytt.
            </div>
          </div>
        </div>
      </div>

      {/* Technician View Overlay */}
      {activeTech && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
          <div className="w-full max-w-md bg-white h-full overflow-auto shadow-2xl">
            <TechnicianView 
              tech={activeTech} 
              onClose={() => setActiveTech(null)} 
              role={role}
            />
          </div>
        </div>
      )}
    </div>
  );
}
