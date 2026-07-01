import React from 'react';
import { toast } from 'react-hot-toast';

export default function CustomerDetail({
  customer,
  orders,
  technicians,
  onBack,
  onOrderAction,
  role,
  onOrderClick
}) {
  const customerOrders = orders.filter(o => o.customer_id === customer.id);

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

  const formatDate = (dateString) => {
    if (!dateString) return 'Ikke satt';
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleOrderClick = (order) => {
    if (onOrderClick) {
      onOrderClick(order);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          \u2190
        </button>
        <div>
          <h1 className="text-3xl font-bold text-[#520000] flex items-center gap-2">
            {customer.requires_clearance && <span>\ud83d\udd12</span>}
            {customer.name}
          </h1>
          <p className="text-gray-600 mt-1">{customer.address}</p>
          {customer.postal_code && (
            <p className="text-sm text-gray-500">{customer.postal_code} {customer.region}</p>
          )}
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#520000] mb-4">Kundeinformasjon</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Type</div>
            <div className="font-medium text-gray-900">
              {customer.requires_clearance ? 'Sensitiv kunde' : 'Standard kunde'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Lokasjon</div>
            <div className="font-medium text-gray-900">
              {customer.lat?.toFixed(4)}, {customer.lng?.toFixed(4)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Kontaktperson</div>
            <div className="font-medium text-gray-900">
              {customer.contact_person || 'Ikke oppgitt'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Telefon</div>
            <div className="font-medium text-gray-900">
              {customer.phone || 'Ikke oppgitt'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">E-post</div>
            <div className="font-medium text-gray-900">
              {customer.email || 'Ikke oppgitt'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Organisasjonsnummer</div>
            <div className="font-medium text-gray-900">
              {customer.organization_number || 'Ikke oppgitt'}
            </div>
          </div>
        </div>
      </div>

      {/* Orders Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#520000]">Ordrer</h2>
          <span className="text-sm text-white bg-[#520000] px-3 py-1 rounded-full">
            {customerOrders.length} ordre
          </span>
        </div>

        {customerOrders.length === 0 && (
          <div className="bg-white border rounded-2xl p-8 text-center text-gray-500 shadow-sm">
            <div className="text-4xl mb-2">\ud83d\udccb</div>
            <p>Ingen ordre p\u00e5 denne kunden enn\u00e5.</p>
          </div>
        )}

        <div className="grid gap-4">
          {customerOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleOrderClick(order)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-2xl">
                      {order.type === '\u00e5rskontroll' ? '\ud83d\udcc5' : 
                       order.type === 'service' ? '\ud83d\udd27' : 
                       order.type === 'inspection' ? '\ud83d\udd0d' : 
                       order.type === 'trykktest' ? '\u2699\ufe0f' : '\ud83d\udccb'}
                    </div>
                    <div>
                      <div className="font-semibold text-xl text-gray-900">
                        Ordre #{order.id} - {order.type}
                      </div>
                      <div className="text-gray-600">
                        Estimert tid: {order.estimated_hours} timer
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3">
                    <span className={`inline-block px-3 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                    
                    {order.assigned_tech_id && (
                      <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        Tildelt: {getTechnicianName(order.assigned_tech_id)}
                      </span>
                    )}
                    
                    {order.scheduled_start && (
                      <span className="text-sm text-[#520000] bg-red-50 px-3 py-1 rounded-full">
                        {formatDate(order.scheduled_start)}
                      </span>
                    )}
                  </div>
                  
                  {order.notes && (
                    <div className="mt-3 text-sm text-gray-500">
                      <span className="text-gray-400">Notat:</span> {order.notes}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOrderClick(order);
                    }}
                    className="px-5 py-2.5 bg-[#520000] hover:bg-[#3a0000] text-white rounded-xl text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                  >
                    \u2192 \u00c5pne ordre
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
