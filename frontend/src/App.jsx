import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import ScheduleSuggestions from './components/ScheduleSuggestions';
import OrderForm from './components/OrderForm';
import TechnicianView from './components/TechnicianView';
import CalendarView from './components/CalendarView';
import CustomerDetail from './components/CustomerDetail';
import OrdersTab from './components/OrdersTab';
import CustomerSearchTab from './components/CustomerSearchTab';
import DeviationsTab from './components/DeviationsTab';
import UsersTab from './components/UsersTab';

export default function App() {
  const [customers, setCustomers] = React.useState([]);
  const [orders, setOrders] = React.useState([]);
  const [technicians, setTechnicians] = React.useState([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState(null);
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const [activeTech, setActiveTech] = React.useState(null);
  const [role, setRole] = React.useState('coordinator');
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('orders');
  const [recentCustomers, setRecentCustomers] = React.useState([]);
  const [closedOrders, setClosedOrders] = React.useState([]);

  // Tab definisjoner
  const tabs = [
    { id: 'orders', label: 'Ordrer', icon: '\ud83d\udccb' },
    { id: 'customers', label: 'Kunder', icon: '\ud83c\udfe2' },
    { id: 'deviations', label: 'Avvik', icon: '\u26a0\ufe0f' },
    { id: 'users', label: 'Brukere', icon: '\ud83d\udc65' }
  ];

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
        
        // Filtrer ut de 5 siste lukkede ordrene
        const doneOrders = ordersData.filter(o => o.status?.toLowerCase() === 'done');
        const sortedDoneOrders = doneOrders.sort((a, b) => 
          (b.scheduled_end || b.updated_at || new Date(0)) - (a.scheduled_end || a.updated_at || new Date(0))
        );
        setClosedOrders(sortedDoneOrders.slice(0, 5));
        
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
      
      // Oppdater lukkede ordrer
      const doneOrders = data.filter(o => o.status?.toLowerCase() === 'done');
      const sortedDoneOrders = doneOrders.sort((a, b) => 
        (b.scheduled_end || b.updated_at || new Date(0)) - (a.scheduled_end || a.updated_at || new Date(0))
      );
      setClosedOrders(sortedDoneOrders.slice(0, 5));
      
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
          setSelectedCustomer(null);
          setSelectedOrder(null);
          setRecentCustomers([]);
          setClosedOrders([]);
        }
      } catch (error) {
        toast.error('Feil ved nullstilling av data');
      }
    }
  };

  // Oppdater nylige kunder når en kunde velges
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setActiveTab('customers');
    
    // Oppdater nylige kunder (maks 5, unike)
    setRecentCustomers(prev => {
      const filtered = prev.filter(c => c.id !== customer.id);
      return [customer, ...filtered].slice(0, 5);
    });
  };

  // Lukk detaljvisning
  const handleCloseDetail = () => {
    setSelectedCustomer(null);
    setSelectedOrder(null);
  };

  // Lukk en ordre (oppdater status til 'done')
  const handleCloseOrder = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' })
      });
      
      if (res.ok) {
        toast.success(`Ordre #${orderId} markert som ferdig`);
        refreshOrders();
        
        // Oppdater lukkede ordrer
        const updatedOrders = await res.json();
        const doneOrders = orders.map(o => o.id === orderId ? { ...o, status: 'done' } : o);
        const sortedDoneOrders = doneOrders
          .filter(o => o.status?.toLowerCase() === 'done')
          .sort((a, b) => (b.scheduled_end || b.updated_at || new Date(0)) - (a.scheduled_end || a.updated_at || new Date(0)));
        setClosedOrders(sortedDoneOrders.slice(0, 5));
        
      } else {
        toast.error('Kunne ikke lukke ordre');
      }
    } catch (error) {
      toast.error('Feil ved lukking av ordre');
      console.error('Error closing order:', error);
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
      case 'kritisk':
        return 'bg-[#520000] text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : `Kunde #${customerId}`;
  };

  const getTechnicianName = (techId) => {
    if (!techId) return 'Ikke tildelt';
    const tech = technicians.find(t => t.id === techId);
    return tech ? tech.name : `Tekniker #${techId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#520000]"></div>
          <p className="text-gray-600">Laster data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Toaster position="top-center" />

      {/* Sidebar - Siste lukkede ordrer */}
      <div className="w-72 bg-white border-r flex flex-col">
        <div className="p-6 border-b bg-gradient-to-br from-[#520000] to-[#3a0000]">
          <h1 className="text-2xl font-bold text-white">Nortronik AnKa</h1>
          <p className="text-sm text-red-100">Arbeidsordre & Planlegging</p>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Siste lukkede ordrer</div>
          </div>
          
          {closedOrders.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400 text-center">
              Ingen lukkede ordrer
            </div>
          )}

          <div className="space-y-1">
            {closedOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => {
                  const customer = customers.find(c => c.id === order.customer_id);
                  if (customer) {
                    setSelectedCustomer(customer);
                    setActiveTab('customers');
                  }
                }}
                className={`px-4 py-3 rounded-xl cursor-pointer transition-all border-2 ${
                  selectedCustomer?.id === order.customer_id 
                    ? 'bg-[#520000] text-white font-medium border-[#520000]' 
                    : 'hover:bg-gray-100 text-gray-700 border-transparent'
                }`}
              >
                <div className="font-medium truncate">Ordre #{order.id}</div>
                <div className="text-xs text-gray-500 truncate">{getCustomerName(order.customer_id)}</div>
                <div className="text-xs text-gray-400 truncate">{order.type}</div>
                {order.scheduled_end && (
                  <div className="text-xs text-gray-400 mt-1">
                    Ferdig: {new Date(order.scheduled_end).toLocaleDateString('nb-NO')}
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
            {/* Tab Navigation */}
            <div className="flex gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedCustomer(null);
                    setSelectedOrder(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#520000] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
              
              {/* Customer tab - vises bare når en kunde er valgt */}
              {selectedCustomer && (
                <button
                  onClick={() => {
                    setActiveTab('customer-detail');
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'customer-detail'
                      ? 'bg-[#520000] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>🏠 {selectedCustomer.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomer(null);
                      setActiveTab('customers');
                    }}
                    className="text-xs hover:text-white"
                  >
                    ✕
                  </button>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Reset demo button */}
            <button
              onClick={handleResetDemo}
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
            >
              🗑️ Nullstill Demo
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
          {/* Tab Content */}
          {activeTab === 'orders' && !selectedOrder && (
            <OrdersTab
              orders={orders}
              technicians={technicians}
              customers={customers}
              onOrderSelect={(order) => {
                setSelectedOrder(order);
                // Finn tilhørende kunde
                const customer = customers.find(c => c.id === order.customer_id);
                if (customer) {
                  setSelectedCustomer(customer);
                }
              }}
              role={role}
            />
          )}

          {activeTab === 'customers' && !selectedCustomer && (
            <CustomerSearchTab
              customers={customers}
              onCustomerSelect={handleCustomerSelect}
              role={role}
            />
          )}

          {activeTab === 'deviations' && (
            <DeviationsTab
              orders={orders}
              technicians={technicians}
              customers={customers}
              role={role}
            />
          )}

          {activeTab === 'users' && (
            <UsersTab
              technicians={technicians}
              role={role}
            />
          )}

          {/* Customer Detail - Vises i hovedvinduet eller som aktiv tab */}
          {(activeTab === 'customer-detail' || (selectedCustomer && !selectedOrder)) && selectedCustomer && (
            <CustomerDetail
              customer={selectedCustomer}
              orders={orders.filter(o => o.customer_id === selectedCustomer.id)}
              technicians={technicians}
              onBack={() => {
                setSelectedCustomer(null);
                setActiveTab('customers');
              }}
              onOrderAction={refreshOrders}
              role={role}
            />
          )}

          {/* Order Detail Modal */}
          {selectedOrder && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-[#520000]">
                    Ordre #{selectedOrder.id}
                  </h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider">Type</div>
                      <div className="font-medium">{selectedOrder.type}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider">Status</div>
                      <span className={`inline-block px-3 py-1 text-xs rounded-full ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider">Kunde</div>
                      <div className="font-medium">
                        {getCustomerName(selectedOrder.customer_id)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider">Tekniker</div>
                      <div className="font-medium">
                        {getTechnicianName(selectedOrder.assigned_tech_id)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider">Estimert tid</div>
                      <div className="font-medium">{selectedOrder.estimated_hours} timer</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider">Lokasjon</div>
                      <div className="font-medium">
                        {selectedOrder.lat?.toFixed(4)}, {selectedOrder.lng?.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  {selectedOrder.scheduled_start && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500 uppercase tracking-wider">Planlagt start</div>
                        <div className="font-medium">
                          {new Date(selectedOrder.scheduled_start).toLocaleString('nb-NO')}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 uppercase tracking-wider">Planlagt slutt</div>
                        <div className="font-medium">
                          {new Date(selectedOrder.scheduled_end).toLocaleString('nb-NO')}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedOrder.notes && (
                    <div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider">Notater</div>
                      <div className="font-medium">{selectedOrder.notes}</div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    {selectedOrder.status !== 'done' && (
                      <button
                        onClick={() => handleCloseOrder(selectedOrder.id)}
                        className="flex-1 px-4 py-2 bg-[#520000] hover:bg-[#3a0000] text-white rounded-lg font-medium transition-colors"
                      >
                        Marker som ferdig
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      Lukk
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
