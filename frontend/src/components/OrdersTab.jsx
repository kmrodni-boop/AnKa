import React from 'react';
import { toast } from 'react-hot-toast';

export default function OrdersTab({ orders, technicians, customers, onOrderSelect, role }) {
  const [filters, setFilters] = React.useState({
    status: '',
    technician: '',
    customer: '',
    type: '',
    search: ''
  });
  const [sortConfig, setSortConfig] = React.useState({ key: 'id', direction: 'desc' });

  // Hent unike verdier for filtere
  const statuses = [...new Set(orders.map(o => o.status).filter(Boolean))];
  const types = [...new Set(orders.map(o => o.type).filter(Boolean))];

  const filteredOrders = orders.filter(order => {
    if (filters.status && order.status !== filters.status) return false;
    if (filters.technician && order.assigned_tech_id != filters.technician) return false;
    if (filters.customer && order.customer_id != filters.customer) return false;
    if (filters.type && order.type !== filters.type) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const orderMatch = order.id?.toString().includes(searchLower) ||
                        order.type?.toLowerCase().includes(searchLower) ||
                        order.notes?.toLowerCase().includes(searchLower);
      if (!orderMatch) return false;
    }
    return true;
  });

  // Sortering
  const sortedOrders = React.useMemo(() => {
    const sortableOrders = [...filteredOrders];
    if (sortConfig.key) {
      sortableOrders.sort((a, b) => {
        // Håndter numeriske felter
        if (['id', 'estimated_hours', 'customer_id'].includes(sortConfig.key)) {
          const aVal = a[sortConfig.key] || 0;
          const bVal = b[sortConfig.key] || 0;
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        // String felter
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        return sortConfig.direction === 'asc' 
          ? aVal.toString().localeCompare(bVal.toString())
          : bVal.toString().localeCompare(aVal.toString());
      });
    }
    return sortableOrders;
  }, [filteredOrders, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '\u2191' : '\u2193';
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'bg-yellow-100 text-yellow-700';
      case 'planlagt': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-purple-100 text-purple-700';
      case 'done': return 'bg-green-100 text-green-700';
      case 'kritisk': return 'bg-[#520000] text-white';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return '\u00c5pen';
      case 'planlagt': return 'Planlagt';
      case 'in_progress': return 'Under arbeid';
      case 'done': return 'Ferdig';
      case 'kritisk': return 'Kritisk';
      default: return status || 'Ukjent';
    }
  };

  const getTechnicianName = (techId) => {
    if (!techId) return 'Ikke tildelt';
    const tech = technicians.find(t => t.id === techId);
    return tech ? tech.name : `Tekniker #${techId}`;
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : `Kunde #${customerId}`;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#520000] mb-4">Filter ordrer</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Alle statuser</option>
              {statuses.map(status => (
                <option key={status} value={status}>{getStatusText(status)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Alle typer</option>
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tekniker</label>
            <select
              value={filters.technician}
              onChange={(e) => setFilters({...filters, technician: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Alle teknikere</option>
              {technicians.map(tech => (
                <option key={tech.id} value={tech.id}>{tech.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kunde</label>
            <select
              value={filters.customer}
              onChange={(e) => setFilters({...filters, customer: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Alle kunder</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">S\u00f8k</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              placeholder="Ordre ID, type..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => setFilters({ status: '', technician: '', customer: '', type: '', search: '' })}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
          >
            Nullstill filter
          </button>
          <span className="text-sm text-gray-500">
            Viser {filteredOrders.length} av {orders.length} ordrer
          </span>
        </div>
      </div>

      {/* Orders Table - Kompakt versjon */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th 
                onClick={() => requestSort('id')} 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Ordre ID {getSortIndicator('id')}
              </th>
              <th 
                onClick={() => requestSort('type')} 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Type {getSortIndicator('type')}
              </th>
              <th 
                onClick={() => requestSort('customer_id')} 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Kunde {getSortIndicator('customer_id')}
              </th>
              <th 
                onClick={() => requestSort('assigned_tech_id')} 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Tekniker {getSortIndicator('assigned_tech_id')}
              </th>
              <th 
                onClick={() => requestSort('status')} 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Status {getSortIndicator('status')}
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Handling
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sortedOrders.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">\ud83d\udccb</div>
                  <p>Ingen ordrer funnet med gjeldende filter</p>
                </td>
              </tr>
            ) : (
              sortedOrders.map(order => (
                <tr 
                  key={order.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onOrderSelect && onOrderSelect(order)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{order.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {order.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {getCustomerName(order.customer_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {getTechnicianName(order.assigned_tech_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-block px-3 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOrderSelect && onOrderSelect(order);
                      }}
                      className="text-sm text-[#520000] hover:text-[#3a0000] font-medium"
                    >
                      Vis detaljer \u2192
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
