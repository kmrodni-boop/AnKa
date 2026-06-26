import React from 'react';
import ScheduleSuggestions from './ScheduleSuggestions';

export default function CustomerDetail({ customer, orders, onBack, onOrderAction }) {
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const [suggestions, setSuggestions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const customerOrders = orders.filter(o => o.customer_id === customer.id);

  const handleFindTime = async (order) => {
    setSelectedOrder(order);
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
    } catch (e) {
      alert('Kunne ikke laste forslag');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = async (slot) => {
    try {
      await fetch(`/api/orders/${selectedOrder.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'planlagt',
          assigned_tech_id: slot.technician?.id,
          scheduled_start: slot.start,
          scheduled_end: slot.end
        })
      });

      alert(`Ordre planlagt med ${slot.technician?.name}`);
      setSelectedOrder(null);
      setSuggestions([]);
      if (onOrderAction) onOrderAction();
    } catch (e) {
      alert('Kunne ikke planlegge ordre');
    }
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-6 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        ← Tilbake til kundeoversikt
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">{customer.name}</h1>
        <p className="text-gray-600 mt-1">{customer.address}</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Ordre</h2>
        <span className="text-sm text-gray-500">{customerOrders.length} ordre</span>
      </div>

      {customerOrders.length === 0 && (
        <div className="bg-white border rounded-2xl p-8 text-center text-gray-500">
          Ingen ordre på denne kunden ennå.
        </div>
      )}

      <div className="grid gap-4">
        {customerOrders.map((order) => (
          <div
            key={order.id}
            className="bg-white border rounded-2xl p-6 hover:shadow-sm transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-xl text-gray-900">
                  {order.type}
                </div>
                <div className="text-gray-600 mt-1">
                  Estimert tid: {order.estimated_hours} timer
                </div>
                <div className="mt-2">
                  <span className="inline-block px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                    {order.status || 'open'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleFindTime(order)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Finn ledig tid
              </button>
            </div>

            {selectedOrder?.id === order.id && (
              <div className="mt-6 pt-6 border-t">
                <ScheduleSuggestions
                  suggestions={suggestions}
                  loading={loading}
                  onSelect={handleSelectSlot}
                  onClose={() => {
                    setSelectedOrder(null);
                    setSuggestions([]);
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}