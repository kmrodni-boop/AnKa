import React from 'react';
import { toast } from 'react-hot-toast';

export default function DeviationsTab({ orders, technicians, customers, role }) {
  // Foreløpig: Simuler avvik basert på ordre-status
  // I ekte implementasjon ville dette komme fra en dedikert avvik-tabell
  const [deviations, setDeviations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState({
    status: '',
    priority: '',
    search: ''
  });

  // Mock avvik data fra ordre
  React.useEffect(() => {
    // Simuler avvik basert på ordre
    const mockDeviations = orders
      .filter(order => ['kritisk', 'in_progress'].includes(order.status?.toLowerCase()))
      .map(order => ({
        id: `dev-${order.id}`,
        orderId: order.id,
        orderType: order.type,
        customerId: order.customer_id,
        description: `Avvik rapportert for ${order.type} - ${order.notes || 'Ingen detaljer'}`,
        status: order.status === 'kritisk' ? 'Åpen' : 'Under behandling',
        priority: order.status === 'kritisk' ? 'Høy' : 'Normal',
        reportedDate: order.scheduled_start || new Date().toISOString(),
        assignedTo: order.assigned_tech_id,
        resolution: null,
        resolutionDate: null
      }));
    
    setDeviations(mockDeviations);
    setLoading(false);
  }, [orders]);

  const filteredDeviations = deviations.filter(dev => {
    if (filters.status && dev.status !== filters.status) return false;
    if (filters.priority && dev.priority !== filters.priority) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const match = dev.id?.toLowerCase().includes(searchLower) ||
                   dev.description?.toLowerCase().includes(searchLower) ||
                   dev.orderType?.toLowerCase().includes(searchLower);
      if (!match) return false;
    }
    return true;
  });

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : `Kunde #${customerId}`;
  };

  const getTechnicianName = (techId) => {
    if (!techId) return 'Ikke tildelt';
    const tech = technicians.find(t => t.id === techId);
    return tech ? tech.name : `Tekniker #${techId}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Ikke satt';
    const date = new Date(dateString);
    return date.toLocaleString('nb-NO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'åpen': return 'bg-red-100 text-red-700';
      case 'under behandling': return 'bg-yellow-100 text-yellow-700';
      case 'lukket': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'høy': return 'bg-red-100 text-red-700';
      case 'normal': return 'bg-yellow-100 text-yellow-700';
      case 'lav': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#520000]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#520000] mb-4">Filter avvik</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Alle statuser</option>
              <option value="Åpen">Åpen</option>
              <option value="Under behandling">Under behandling</option>
              <option value="Lukket">Lukket</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioritet</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Alle prioriteringer</option>
              <option value="Høy">Høy</option>
              <option value="Normal">Normal</option>
              <option value="Lav">Lav</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Søk</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              placeholder="Avvik ID, beskrivelse..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => setFilters({ status: '', priority: '', search: '' })}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
          >
            Nullstill filter
          </button>
          <span className="text-sm text-gray-500">
            Viser {filteredDeviations.length} av {deviations.length} avvik
          </span>
        </div>
      </div>

      {/* Deviations Table */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Avvik ID
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Ordre
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Kunde
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Beskrivelse
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Prioritet
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Rapportert
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Handling
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredDeviations.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">⚠️</div>
                  <p>Ingen avvik funnet</p>
                </td>
              </tr>
            ) : (
              filteredDeviations.map(dev => (
                <tr key={dev.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {dev.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    #{dev.orderId} - {dev.orderType}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {getCustomerName(dev.customerId)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {dev.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-block px-3 py-1 text-xs rounded-full ${getPriorityColor(dev.priority)}`}>
                      {dev.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-block px-3 py-1 text-xs rounded-full ${getStatusColor(dev.status)}`}>
                      {dev.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(dev.reportedDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {(role === 'manager' || role === 'admin') && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => toast.info(`Viser detaljer for avvik ${dev.id}`)}
                          className="text-sm text-[#520000] hover:text-[#3a0000] font-medium"
                        >
                          Vis →
                        </button>
                        <button
                          onClick={() => toast.success(`Avvik ${dev.id} oppdatert`)}
                          className="text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                          Lukk ✓
                        </button>
                      </div>
                    )}
                    {!(role === 'manager' || role === 'admin') && (
                      <button
                        onClick={() => toast.info(`Viser detaljer for avvik ${dev.id}`)}
                        className="text-sm text-[#520000] hover:text-[#3a0000] font-medium"
                      >
                        Vis →
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info for teknikere/koordinatorer */}
      {(role === 'technician' || role === 'coordinator') && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-blue-700">
            <span>ℹ️</span>
            <p className="text-sm">
              {role === 'technician' 
                ? 'Kontakt koordinator for å rapportere avvik.'
                : 'Som koordinator kan du se avvik, men kun ledere/admin kan lukke dem.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
