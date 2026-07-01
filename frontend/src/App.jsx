import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import ScheduleSuggestions from './components/ScheduleSuggestions';
import OrderForm from './components/OrderForm';
import TechnicianView from './components/TechnicianView';
import CalendarView from './components/CalendarView';
import CustomerDetail from './components/CustomerDetail';
import OrderDetail from './components/OrderDetail';
import OrdersTab from './components/OrdersTab';
import CustomerSearchTab from './components/CustomerSearchTab';
import DeviationsTab from './components/DeviationsTab';
import UsersTab from './components/UsersTab';
import TemplatesTab from './components/TemplatesTab';
import Login from './components/Login';
import { getStoredUser, clearSession } from './session';

export default function App() {
  const [currentUser, setCurrentUser] = React.useState(() => getStoredUser());
  const [customers, setCustomers] = React.useState([]);
  const [orders, setOrders] = React.useState([]);
  const [technicians, setTechnicians] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('orders');
  const [recentCustomers, setRecentCustomers] = React.useState([]);
  const [closedOrders, setClosedOrders] = React.useState([]);
  const [activeTech, setActiveTech] = React.useState(null);

  const role = currentUser?.role;

  const handleLogout = React.useCallback(() => {
    clearSession();
    setCurrentUser(null);
    setActiveTech(null);
  }, []);

  React.useEffect(() => {
    window.addEventListener('anka:unauthorized', handleLogout);
    return () => window.removeEventListener('anka:unauthorized', handleLogout);
  }, [handleLogout]);
  
  // Tab system for customers and their orders
  const [customerTabs, setCustomerTabs] = React.useState([]);
  const [activeCustomerTabId, setActiveCustomerTabId] = React.useState(null);

  // Tab definisjoner for main navigation
  const mainTabs = [
    { id: 'orders', label: 'Ordrer', icon: '📋' },
    { id: 'customers', label: 'Kunder', icon: '🏢' },
    { id: 'deviations', label: 'Avvik', icon: '⚠️' },
    { id: 'templates', label: 'Maler', icon: '📝' },
    { id: 'users', label: 'Brukere', icon: '👥' }
  ];

  React.useEffect(() => {
    if (!currentUser) return;

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
  }, [currentUser]);

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

  const refreshCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(data);
    } catch (error) {
      toast.error('Feil ved oppdatering av kundeliste');
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
          setCustomerTabs([]);
          setActiveCustomerTabId(null);
          setClosedOrders([]);
        }
      } catch (error) {
        toast.error('Feil ved nullstilling av data');
      }
    }
  };

  // Kunde-tab-id er deterministisk (basert på kunde-id) slik at en kunde-tab
  // opprettet og gjenfunnet i samme handling (se handleOpenOrder) alltid treffer.
  const customerTabId = (customerId) => `customer-${customerId}`;

  // Oppdater nylige kunder når en kunde velges
  const handleCustomerSelect = (customer) => {
    const existingTab = customerTabs.find(tab => tab.customerId === customer.id);

    if (existingTab) {
      setActiveCustomerTabId(existingTab.id);
    } else {
      const newTab = {
        id: customerTabId(customer.id),
        customerId: customer.id,
        customer,
        orderTabs: [], // Nested tabs for orders
        activeOrderTabId: null
      };
      setCustomerTabs(prev => [...prev, newTab]);
      setActiveCustomerTabId(newTab.id);
    }

    // Oppdater nylige kunder (maks 5, unike)
    setRecentCustomers(prev => {
      const filtered = prev.filter(c => c.id !== customer.id);
      return [customer, ...filtered].slice(0, 5);
    });
  };

  // Åpne en ordre direkte i riktig kunde-tab, selv om kunde-taben ikke
  // finnes fra før (f.eks. fra ordrelisten). Kombinerer kunde- og
  // ordre-tab-opprettelse i én oppdatering slik at de ikke kan komme ut av synk.
  const handleOpenOrder = (order) => {
    const customer = customers.find(c => c.id === order.customer_id);
    if (!customer) return;

    const tabId = customerTabId(customer.id);
    setCustomerTabs(prev => {
      const base = prev.some(t => t.id === tabId)
        ? prev
        : [...prev, { id: tabId, customerId: customer.id, customer, orderTabs: [], activeOrderTabId: null }];

      return base.map(tab => {
        if (tab.id !== tabId) return tab;
        const existingOrderTab = tab.orderTabs.find(ot => ot.orderId === order.id);
        if (existingOrderTab) {
          return { ...tab, activeOrderTabId: existingOrderTab.id };
        }
        const newOrderTab = { id: `order-${customer.id}-${order.id}`, orderId: order.id, order };
        return { ...tab, orderTabs: [...tab.orderTabs, newOrderTab], activeOrderTabId: newOrderTab.id };
      });
    });
    setActiveCustomerTabId(tabId);

    setRecentCustomers(prev => {
      const filtered = prev.filter(c => c.id !== customer.id);
      return [customer, ...filtered].slice(0, 5);
    });
  };

  // Lukk en kunde-tab
  const closeCustomerTab = (tabId) => {
    setCustomerTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      // Hvis vi lukker den aktive taben, sett aktiv til null eller siste tab
      if (activeCustomerTabId === tabId) {
        if (newTabs.length > 0) {
          setActiveCustomerTabId(newTabs[newTabs.length - 1].id);
        } else {
          setActiveCustomerTabId(null);
        }
      }
      return newTabs;
    });
  };

  // Åpne en ordre i en kunde-tab som nested tab
  const openOrderInCustomerTab = (customerTabId, order) => {
    setCustomerTabs(prev => prev.map(tab => {
      if (tab.id !== customerTabId) return tab;
      
      // Sjekk om orden allerede har en tab
      const existingOrderTab = tab.orderTabs.find(ot => ot.orderId === order.id);
      
      if (existingOrderTab) {
        // Aktiver eksisterende order tab
        return {
          ...tab,
          activeOrderTabId: existingOrderTab.id
        };
      } else {
        // Opprett ny order tab
        const newOrderTab = {
          id: `order-${Date.now()}-${order.id}`,
          orderId: order.id,
          order
        };
        return {
          ...tab,
          orderTabs: [...tab.orderTabs, newOrderTab],
          activeOrderTabId: newOrderTab.id
        };
      }
    }));
  };

  // Lukk en order-tab
  const closeOrderTab = (customerTabId, orderTabId) => {
    setCustomerTabs(prev => prev.map(tab => {
      if (tab.id !== customerTabId) return tab;
      
      const newOrderTabs = tab.orderTabs.filter(ot => ot.id !== orderTabId);
      let newActiveOrderTabId = tab.activeOrderTabId;
      
      // Hvis vi lukker den aktive order-taben
      if (tab.activeOrderTabId === orderTabId) {
        if (newOrderTabs.length > 0) {
          newActiveOrderTabId = newOrderTabs[newOrderTabs.length - 1].id;
        } else {
          newActiveOrderTabId = null;
        }
      }
      
      return {
        ...tab,
        orderTabs: newOrderTabs,
        activeOrderTabId: newActiveOrderTabId
      };
    }));
  };

  // Sett aktiv order-tab
  const setActiveOrderTab = (customerTabId, orderTabId) => {
    setCustomerTabs(prev => prev.map(tab => {
      if (tab.id !== customerTabId) return tab;
      return {
        ...tab,
        activeOrderTabId: orderTabId
      };
    }));
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
        
        // Lukk eventuelle åpne order-tabs for denne orden
        setCustomerTabs(prev => prev.map(tab => {
          const updatedOrderTabs = tab.orderTabs.filter(ot => ot.orderId !== orderId);
          let updatedActiveOrderTabId = tab.activeOrderTabId;
          
          if (tab.activeOrderTabId && tab.orderTabs.some(ot => ot.orderId === orderId)) {
            if (updatedOrderTabs.length > 0) {
              updatedActiveOrderTabId = updatedOrderTabs[updatedOrderTabs.length - 1].id;
            } else {
              updatedActiveOrderTabId = null;
            }
          }
          
          return {
            ...tab,
            orderTabs: updatedOrderTabs,
            activeOrderTabId: updatedActiveOrderTabId
          };
        }));
        
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

  const getOrderById = (orderId) => {
    return orders.find(o => o.id === orderId);
  };

  // Aktive kunde-tabs (for rendering)
  const activeCustomerTab = customerTabs.find(tab => tab.id === activeCustomerTabId);

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

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

  // Teknikere får en dedikert, mobil-tilpasset fullskjermsvisning i stedet for
  // koordinator-skrivebordet - det er ikke laget for smale skjermer.
  if (role === 'technician') {
    const myTech = technicians.find(t => t.id === currentUser.technician_id);
    if (!myTech) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
          <div>
            <p className="text-gray-600">Fant ingen teknikerprofil koblet til denne brukeren.</p>
            <button onClick={handleLogout} className="mt-4 text-sm text-[#520000] underline">Logg ut</button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-center" />
        <TechnicianView tech={myTech} customers={customers} mode="session" onLogout={handleLogout} />
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
                    handleCustomerSelect(customer);
                  }
                }}
                className={`px-4 py-3 rounded-xl cursor-pointer transition-all border-2 ${
                  activeCustomerTab?.customerId === order.customer_id 
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
          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Main Tab Navigation */}
            <div className="flex gap-1">
              {mainTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setActiveCustomerTabId(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id && !activeCustomerTabId
                      ? 'bg-[#520000] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Customer tabs - persistente tabs */}
            {customerTabs.length > 0 && (
              <div className="flex gap-1 ml-2">
                {customerTabs.map(tab => {
                  const customer = tab.customer || customers.find(c => c.id === tab.customerId);
                  if (!customer) return null;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveCustomerTabId(tab.id);
                        // Nullstill aktiv order-tab når vi bytter kunde-tab
                        setCustomerTabs(prev => prev.map(t => 
                          t.id === tab.id ? { ...t, activeOrderTabId: null } : t
                        ));
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
                        activeCustomerTabId === tab.id
                          ? 'bg-[#520000] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>🏠 {customer.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeCustomerTab(tab.id);
                        }}
                        className="text-xs hover:text-white ml-1"
                        title="Lukk"
                      >
                        ✕
                      </button>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Reset demo button - kun for ledere/admin */}
            {(role === 'admin' || role === 'manager') && (
              <button
                onClick={handleResetDemo}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
              >
                🗑️ Nullstill Demo
              </button>
            )}

            <div className="flex items-center gap-2 text-sm">
              <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700">
                {currentUser.name}
                <span className="text-gray-400"> · {
                  { admin: 'Admin', manager: 'Leder', coordinator: 'Koordinator', technician: 'Tekniker' }[role] || role
                }</span>
              </span>
              <button
                onClick={handleLogout}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
              >
                Logg ut
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          {/* Hvis en kunde-tab er aktiv, vis kunde-innhold med nested tabs */}
          {activeCustomerTab && (
            <div className="space-y-4">
              {/* Customer nested tabs (for orders) */}
              {activeCustomerTab.orderTabs.length > 0 && (
                <div className="flex gap-1 mb-4 bg-white p-2 rounded-lg shadow-sm">
                  {/* Generell tab for kundeinformasjon */}
                  <button
                    onClick={() => {
                      setCustomerTabs(prev => prev.map(tab => 
                        tab.id === activeCustomerTab.id ? { ...tab, activeOrderTabId: null } : tab
                      ));
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                      !activeCustomerTab.activeOrderTabId
                        ? 'bg-[#520000] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>🏠 {activeCustomerTab.customer?.name || 'Kunde'}</span>
                  </button>

                  {/* Order tabs */}
                  {activeCustomerTab.orderTabs.map(orderTab => {
                    const order = getOrderById(orderTab.orderId);
                    if (!order) return null;
                    
                    return (
                      <button
                        key={orderTab.id}
                        onClick={() => setActiveOrderTab(activeCustomerTab.id, orderTab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                          activeCustomerTab.activeOrderTabId === orderTab.id
                            ? 'bg-[#520000] text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <span>📄 Ordre #{order.id}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            closeOrderTab(activeCustomerTab.id, orderTab.id);
                          }}
                          className="text-xs hover:text-white"
                          title="Lukk"
                        >
                          ✕
                        </button>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Vis enten CustomerDetail (generell) eller OrderDetail (for ordre-undertab) */}
              {activeCustomerTab.activeOrderTabId ? (
                <OrderDetail
                  order={getOrderById(
                    activeCustomerTab.orderTabs.find(ot => ot.id === activeCustomerTab.activeOrderTabId)?.orderId
                  )}
                  technicians={technicians}
                  customers={customers}
                  onClose={() => {
                    setCustomerTabs(prev => prev.map(tab => 
                      tab.id === activeCustomerTab.id ? { ...tab, activeOrderTabId: null } : tab
                    ));
                  }}
                  onOrderAction={refreshOrders}
                  role={role}
                />
              ) : (
                <CustomerDetail
                  customer={activeCustomerTab.customer}
                  orders={orders.filter(o => o.customer_id === activeCustomerTab.customerId)}
                  technicians={technicians}
                  onBack={() => {
                    closeCustomerTab(activeCustomerTab.id);
                    setActiveTab('customers');
                  }}
                  onOrderAction={refreshOrders}
                  role={role}
                  onOrderClick={(order) => {
                    openOrderInCustomerTab(activeCustomerTab.id, order);
                  }}
                />
              )}
            </div>
          )}

          {/* Main tab content (when no customer tab is active) */}
          {!activeCustomerTab && (
            <>
              {activeTab === 'orders' && (
                <OrdersTab
                  orders={orders}
                  technicians={technicians}
                  customers={customers}
                  onOrderSelect={handleOpenOrder}
                  role={role}
                />
              )}

              {activeTab === 'customers' && (
                <CustomerSearchTab
                  customers={customers}
                  onCustomerSelect={handleCustomerSelect}
                  role={role}
                  onCustomersSynced={refreshCustomers}
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

              {activeTab === 'templates' && (
                <TemplatesTab role={role} />
              )}

              {activeTab === 'users' && (
                <UsersTab
                  technicians={technicians}
                  role={role}
                  onPreviewTechnician={setActiveTech}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Technician View Overlay - forhåndsvisning for admin/leder */}
      {activeTech && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
          <div className="w-full max-w-md bg-white h-full overflow-auto shadow-2xl">
            <TechnicianView
              tech={activeTech}
              customers={customers}
              mode="preview"
              onClose={() => setActiveTech(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
