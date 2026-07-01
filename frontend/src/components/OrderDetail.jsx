import React from 'react';
import ScheduleSuggestions from './ScheduleSuggestions';
import { toast } from 'react-hot-toast';

export default function OrderDetail({
  order,
  technicians,
  customers,
  onClose,
  onOrderAction,
  role
}) {
  const [suggestions, setSuggestions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

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

  const formatDate = (dateString) => {
    if (!dateString) return 'Ikke satt';
    const date = new Date(dateString);
    return date.toLocaleString('nb-NO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFindTime = async () => {
    setLoading(true);
    setSuggestions([]);

    try {
      const res = await fetch('/api/schedule/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      });
      const data = await res.json();
      setSuggestions(data);
      toast.success(`Fant ${data.length} ledige tidspunkter`);
    } catch (e) {
      toast.error('Kunne ikke laste forslag');
      console.error('Error fetching suggestions:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = async (slot) => {
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'planlagt',
          assigned_tech_id: slot.technician?.id,
          scheduled_start: slot.start,
          scheduled_end: slot.end
        })
      });

      if (res.ok) {
        toast.success(`Ordre planlagt med ${slot.technician?.name}`);
        setSuggestions([]);
        if (onOrderAction) onOrderAction();
      } else {
        toast.error('Kunne ikke planlegge ordre');
      }
    } catch (e) {
      toast.error('Feil ved planlegging');
      console.error('Error selecting slot:', e);
    }
  };

  const handleCloseOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' })
      });

      if (res.ok) {
        toast.success(`Ordre #${order.id} markert som ferdig`);
        if (onOrderAction) onOrderAction();
      } else {
        toast.error('Kunne ikke lukke ordre');
      }
    } catch (error) {
      toast.error('Feil ved lukking av ordre');
      console.error('Error closing order:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          >
            \u2190 Tilbake til kunde
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#520000] flex items-center gap-2">
              Ordre #{order.id}
            </h1>
            <p className="text-gray-600 mt-1">
              {order.type} - {getCustomerName(order.customer_id)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {order.status !== 'done' && (
            <button
              onClick={handleCloseOrder}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Marker som ferdig
            </button>
          )}
        </div>
      </div>

      {/* Order Info Card */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#520000] mb-4">Grunnleggende informasjon</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Type</div>
            <div className="font-medium text-gray-900">{order.type}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Status</div>
            <span className={`inline-block px-3 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
              {getStatusText(order.status)}
            </span>
          </div>
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Kunde</div>
            <div className="font-medium text-gray-900">{getCustomerName(order.customer_id)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Tekniker</div>
            <div className="font-medium text-gray-900">{getTechnicianName(order.assigned_tech_id)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Estimert tid</div>
            <div className="font-medium text-gray-900">{order.estimated_hours} timer</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Lokasjon</div>
            <div className="font-medium text-gray-900">
              {order.lat?.toFixed(4)}, {order.lng?.toFixed(4)}
            </div>
          </div>
          {order.scheduled_start && (
            <>
              <div>
                <div className="text-sm text-gray-500 uppercase tracking-wider">Planlagt start</div>
                <div className="font-medium text-gray-900">{formatDate(order.scheduled_start)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 uppercase tracking-wider">Planlagt slutt</div>
                <div className="font-medium text-gray-900">{formatDate(order.scheduled_end)}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Arbeidsbeskrivelse */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#520000] mb-4">Arbeidsbeskrivelse</h2>
        <div className="prose max-w-none text-gray-700">
          {order.description || 'Ingen arbeidsbeskrivelse lagt til.'}
        </div>
      </div>

      {/* Materiell */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#520000] mb-4">Materiell</h2>
        {order.materials && order.materials.length > 0 ? (
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            {order.materials.map((material, index) => (
              <li key={index}>{material.name} - {material.quantity} {material.unit}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Ingen materiell lagt til.</p>
        )}
      </div>

      {/* Kommentarer */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#520000] mb-4">Kommentarer</h2>
        {order.comments && order.comments.length > 0 ? (
          <div className="space-y-4">
            {order.comments.map((comment, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900">{comment.author || 'Anonym'}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(comment.timestamp).toLocaleString('nb-NO')}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-gray-700">{comment.text}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Ingen kommentarer ennå.</p>
        )}
      </div>

      {/* Finn ledig tid */}
      {order.status === 'open' && (
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <button
            onClick={handleFindTime}
            className="w-full px-6 py-3 bg-[#520000] hover:bg-[#3a0000] text-white rounded-xl font-medium transition-colors shadow-sm hover:shadow-md"
          >
            Finn ledig tid
          </button>
          
          {suggestions.length > 0 && (
            <div className="mt-6">
              <ScheduleSuggestions
                suggestions={suggestions}
                loading={loading}
                onSelect={handleSelectSlot}
                onClose={() => setSuggestions([])}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
