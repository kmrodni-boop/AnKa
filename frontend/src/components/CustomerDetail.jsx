import React from 'react';
import ScheduleSuggestions from './ScheduleSuggestions';

export default function CustomerDetail({ customer, orders, onOrderAction, onBack }) {
  const [selectedOrderForSuggestions, setSelectedOrderForSuggestions] = React.useState(null);
  const [suggestions, setSuggestions] = React.useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);

  const customerOrders = orders.filter(o => o.customer_id === customer.id);

  const handleFindTime = async (order) => {
    setSelectedOrderForSuggestions(order);
    setLoadingSuggestions(true);
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
      alert('Kunne ikke hente forslag');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSelectSlot = (slot) => {
    alert(`Valgte ${slot.technician?.name} - ${new Date(slot.start).toLocaleDateString('nb-NO')}`);
    setSelectedOrderForSuggestions(null);
    setSuggestions([]);
    // Her kan du senere legge til logikk for å oppdatere ordren
  };

  return (
    <div>
      <button 
        onClick={onBack}
        style={{ marginBottom: 16, padding: '6px 12px', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer' }}
      >
        ← Tilbake til oversikt
      </button>

      <h2 style={{ marginBottom: 4 }}>{customer.name}</h2>
      <p style={{ color: '#666', marginBottom: 20 }}>{customer.address}</p>

      <h3>Ordre</h3>

      {customerOrders.length === 0 && (
        <p style={{ color: '#888' }}>Ingen ordre på denne kunden ennå.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {customerOrders.map(order => (
          <div 
            key={order.id}
            style={{ 
              border: '1px solid #ddd', 
              borderRadius: 12, 
              padding: 16,
              background: 'white'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 18 }}>
                  {order.type} – Est. {order.estimated_hours} timer
                </div>
                <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>
                  Status: {order.status || 'open'}
                </div>
              </div>

              <button 
                onClick={() => handleFindTime(order)}
                style={{
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Finn ledig tid
              </button>
            </div>

            {selectedOrderForSuggestions?.id === order.id && (
              <div style={{ marginTop: 16 }}>
                <ScheduleSuggestions
                  suggestions={suggestions}
                  loading={loadingSuggestions}
                  onSelect={handleSelectSlot}
                  onClose={() => {
                    setSelectedOrderForSuggestions(null);
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