import React from 'react';
import { toast } from 'react-hot-toast';

export default function OrderForm({ customers, onCreated }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    customer_id: '',
    type: 'årskontroll',
    estimated_hours: 2,
    notes: ''
  });
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_id) {
      toast.error('Velg en kunde');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success(`Ordre opprettet (ID: ${data.id})`);
        setFormData({
          customer_id: '',
          type: 'årskontroll',
          estimated_hours: 2,
          notes: ''
        });
        setIsOpen(false);
        if (onCreated) onCreated();
      } else {
        toast.error('Feil ved opprettelse av ordre');
      }
    } catch (error) {
      toast.error('Feil ved opprettelse av ordre');
    } finally {
      setLoading(false);
    }
  };

  const types = [
    { value: 'årskontroll', label: 'Årskontroll', icon: '📅' },
    { value: 'service', label: 'Service', icon: '🔧' },
    { value: 'inspection', label: 'Inspeksjon', icon: '🔍' },
    { value: 'trykktest', label: 'Trykktest', icon: '⚙️' },
    { value: 'vedlikehold', label: 'Vedlikehold', icon: '🏗️' }
  ];

  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#520000] hover:bg-[#3a0000] text-white rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
      >
        <span>➕</span>
        Opprett ny ordre
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Opprett ny ordre</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Customer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kunde *
                </label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#520000] focus:border-transparent"
                  required
                >
                  <option value="">Velg kunde</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.requires_clearance ? '🔒' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {types.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({...formData, type: type.value})}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        formData.type === type.value
                          ? 'border-[#520000] bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xl">{type.icon}</div>
                      <div className="text-sm font-medium text-gray-700">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Estimated hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimert tid (timer) *
                </label>
                <input
                  type="number"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({...formData, estimated_hours: parseFloat(e.target.value) || 0})}
                  min="0.5"
                  step="0.5"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#520000] focus:border-transparent"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notater (valgfritt)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Legg til ekstra informasjon om ordren..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#520000] focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-[#520000] hover:bg-[#3a0000] disabled:bg-[#8a4a4a] text-white rounded-xl text-sm font-medium transition-colors shadow-sm hover:shadow-md disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Oppretter...
                    </span>
                  ) : (
                    'Opprett ordre'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
