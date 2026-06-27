import React from 'react';
import { toast } from 'react-hot-toast';

export default function CustomerSearchTab({ customers, onCustomerSelect, role }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCustomer, setSelectedCustomer] = React.useState(null);
  const [sortConfig, setSortConfig] = React.useState({ key: 'name', direction: 'asc' });

  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.address?.toLowerCase().includes(searchLower) ||
      customer.postal_code?.toLowerCase().includes(searchLower) ||
      customer.region?.toLowerCase().includes(searchLower)
    );
  });

  // Sortering
  const sortedCustomers = React.useMemo(() => {
    const sortableCustomers = [...filteredCustomers];
    if (sortConfig.key) {
      sortableCustomers.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        return sortConfig.direction === 'asc' 
          ? aVal.toString().localeCompare(bVal.toString())
          : bVal.toString().localeCompare(aVal.toString());
      });
    }
    return sortableCustomers;
  }, [filteredCustomers, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Søk kunder</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Søk på navn, adresse, postnummer..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm pl-10"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>
          </div>
          <button
            onClick={() => setSearchTerm('')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors mt-6"
          >
            Nullstill
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          Viser {filteredCustomers.length} av {customers.length} kunder
        </div>
      </div>

      {/* Customer Cards */}
      <div className="grid gap-4">
        {sortedCustomers.length === 0 ? (
          <div className="bg-white border rounded-2xl p-8 text-center text-gray-500 shadow-sm">
            <div className="text-4xl mb-2">🏢</div>
            <p>Ingen kunder funnet med gjeldende søk</p>
          </div>
        ) : (
          sortedCustomers.map(customer => (
            <div
              key={customer.id}
              onClick={() => onCustomerSelect && onCustomerSelect(customer)}
              className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-[#520000]">
                      {customer.requires_clearance && <span className="mr-1">🔒</span>}
                      {customer.name}
                    </h3>
                  </div>
                  
                  <div className="text-gray-600 mb-1">{customer.address}</div>
                  
                  {customer.postal_code && (
                    <div className="text-sm text-gray-500">
                      {customer.postal_code} {customer.region}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <span className="inline-block px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                      {customer.requires_clearance ? 'Sensitiv' : 'Standard'}
                    </span>
                    {customer.lat && customer.lng && (
                      <span className="inline-block px-3 py-1 text-xs rounded-full bg-blue-50 text-blue-700">
                        GPS: {customer.lat.toFixed(4)}, {customer.lng.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCustomerSelect && onCustomerSelect(customer);
                    }}
                    className="px-4 py-2 bg-[#520000] hover:bg-[#3a0000] text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Vis detaljer →
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
