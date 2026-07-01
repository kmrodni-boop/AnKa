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
      month: 'short'
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

      {/* Customer Info Card - Kompakt */}
      <div className="bg-white border rounded-2xl p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-[#520000] mb-3">Kundeinformasjon</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Type</div>
            <div className="font-medium text-gray-900 text-sm">
              {customer.requires_clearance ? 'Sensitiv' : 'Standard'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Kontakt</div>
            <div className="font-medium text-gray-900 text-sm">
              {customer.contact_person || 'Ikke oppgitt'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Telefon</div>
            <div className="font-medium text-gray-900 text-sm">
              {customer.phone || 'Ikke oppgitt'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">E-post</div>
            <div className="font-medium text-gray-900 text-sm truncate">
              {customer.email || 'Ikke oppgitt'}
            </div>
          </div>
        </div>
      </div>

      {/* Orders Overview - Kompakt liste */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[#520000]">Ordrer</h2>
          <span className="text-xs text-white bg-[#520000] px-2 py-1 rounded-full">
            {customerOrders.length} ordre
          </span>
        </div>

        {customerOrders.length === 0 && (
          <div className="bg-white border rounded-xl p-6 text-center text-gray-500 shadow-sm">
            <div className="text-3xl mb-2">\ud83d\udccb</div>
            <p className="text-sm">Ingen ordre p\u00e5 denne kunden enn\u00e5.</p>
          </div>
        )}

        {/* Kompakt ordre-liste */}
        <div className="space-y-2">
          {customerOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
              onClick={() => handleOrderClick(order)}
            >
              {/* Venstre side: Ordreinfo */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-xl">
                  {order.type === '\u00e5rskontroll' ? '\ud83d\udcc5' : 
                   order.type === 'service' ? '\ud83d\udd27' : 
                   order.type === 'inspection' ? '\ud83d\udd0d' : 
                   order.type === 'trykktest' ? '\u2699\ufe0f' : '\ud83d\udccb'}
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">
                    Ordre #{order.id} - {order.type}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {order.estimated_hours} timer
                    {order.assigned_tech_id && ` - ${getTechnicianName(order.assigned_tech_id)}`}
                    {order.scheduled_start && ` - ${formatDate(order.scheduled_start)}`}
                  </div>
                </div>
              </div>

              {/* H\u00f8yre side: Status og knapp */}
              <div className="flex items-center gap-2 ml-2">
                <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOrderClick(order);
                  }}
                  className="px-3 py-1.5 bg-[#520000] hover:bg-[#3a0000] text-white rounded-lg text-xs font-medium transition-colors"
                >
                  \u2192
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
