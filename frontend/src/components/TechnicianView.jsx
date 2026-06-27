import React from 'react';
import Checklist from './Checklist';
import { toast } from 'react-hot-toast';

export default function TechnicianView({ tech, onClose, role }) {
  const [orders, setOrders] = React.useState([]);
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [showChecklist, setShowChecklist] = React.useState(false);
  const [aiReview, setAiReview] = React.useState(null);
  const [reviewLoading, setReviewLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        // Filter orders assigned to this technician
        const techOrders = data.filter(o => o.assigned_tech_id === tech.id && o.status !== 'done');
        setOrders(techOrders);
      } catch (error) {
        toast.error('Feil ved lasting av ordre');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [tech.id]);

  const handleStartJob = async (order) => {
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' })
      });
      if (res.ok) {
        toast.success(`Jobb startet: ${order.type}`);
        // Refresh orders
        const updatedRes = await fetch('/api/orders');
        const updatedData = await updatedRes.json();
        const techOrders = updatedData.filter(o => o.assigned_tech_id === tech.id && o.status !== 'done');
        setOrders(techOrders);
      }
    } catch (error) {
      toast.error('Feil ved start av jobb');
    }
  };

  const handleCompleteJob = async (order) => {
    if (window.confirm(`Er du sikker på at du vil fullføre denne jobben: ${order.type}?`)) {
      try {
        // First, run AI review
        setReviewLoading(true);
        const reviewRes = await fetch(`/api/orders/${order.id}/review`);
        const reviewData = await reviewRes.json();
        setAiReview(reviewData.review);
        setReviewLoading(false);
        
        // Then mark as done
        const res = await fetch(`/api/orders/${order.id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'done' })
        });
        
        if (res.ok) {
          toast.success(`Jobb fullført: ${order.type}`);
          // Refresh orders
          const updatedRes = await fetch('/api/orders');
          const updatedData = await updatedRes.json();
          const techOrders = updatedData.filter(o => o.assigned_tech_id === tech.id && o.status !== 'done');
          setOrders(techOrders);
          setSelectedOrder(null);
        }
      } catch (error) {
        toast.error('Feil ved fullføring av jobb');
        setReviewLoading(false);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Ikke satt';
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  };

  const getCustomerName = (customerId) => {
    // This would ideally come from context or props
    const customers = {
      1: 'Bergen Energi',
      2: 'Lyse Energi',
      3: 'Bergenshalvøens Kommunale Kraftselskap',
      4: 'Førde Industri',
      5: 'Sogn og Fjordane Energi',
      6: 'Hemmeligholdt Kunde',
      7: 'Statens Hemmelige Anlegg',
      8: 'Finnmark Kraft'
    };
    return customers[customerId] || `Kunde #${customerId}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Laster ordre...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl"
            >
              ×
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">{tech.name}</h2>
              <p className="text-blue-100 text-sm">Tekniker-visning</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tech info */}
      <div className="p-6 bg-white border-b">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Base</div>
            <div className="font-medium text-gray-900">
              {tech.base_lat?.toFixed(3)}, {tech.base_lng?.toFixed(3)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">Kompetanse</div>
            <div className="font-medium text-gray-900">
              {JSON.parse(tech.skills || '[]').join(', ')}
            </div>
          </div>
        </div>
        {tech.clearance_level >= 2 && (
          <div className="mt-4">
            <div className="text-sm text-gray-500 uppercase tracking-wider">Clearance</div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span className="font-medium">Nivå {tech.clearance_level}</span>
            </div>
          </div>
        )}
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Mine ordre</h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {orders.length} aktive
          </span>
        </div>

        {orders.length === 0 && (
          <div className="bg-white border rounded-2xl p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p>Ingen aktive ordre</p>
          </div>
        )}

        <div className="grid gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-2xl">
                      {order.type === 'årskontroll' ? '📅' : 
                       order.type === 'service' ? '🔧' : 
                       order.type === 'inspection' ? '🔍' : 
                       order.type === 'trykktest' ? '⚙️' : '📋'}
                    </div>
                    <div>
                      <div className="font-semibold text-xl text-gray-900">{order.type}</div>
                      <div className="text-gray-600">
                        {getCustomerName(order.customer_id)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    {order.scheduled_start && (
                      <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        {formatDate(order.scheduled_start)}
                      </span>
                    )}
                    {order.scheduled_start && (
                      <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        {formatTime(order.scheduled_start)} – {formatTime(order.scheduled_end)}
                      </span>
                    )}
                    <span className="text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      {order.estimated_hours}t
                    </span>
                  </div>
                  
                  {order.notes && (
                    <div className="mt-3 text-sm text-gray-500">
                      <span className="text-gray-400">Notat:</span> {order.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                {order.status === 'planlagt' && (
                  <button
                    onClick={() => handleStartJob(order)}
                    className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                  >
                    Start jobb
                  </button>
                )}
                
                {order.status === 'in_progress' && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowChecklist(true);
                      }}
                      className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      Sjekkliste
                    </button>
                    <button
                      onClick={() => handleCompleteJob(order)}
                      className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      Fullfør
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist Modal */}
      {showChecklist && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Sjekkliste for {selectedOrder.type}</h3>
              <button
                onClick={() => {
                  setShowChecklist(false);
                  setAiReview(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <Checklist 
              orderId={selectedOrder.id} 
              onReviewRequested={async () => {
                setReviewLoading(true);
                try {
                  const res = await fetch(`/api/orders/${selectedOrder.id}/review`);
                  const data = await res.json();
                  setAiReview(data.review);
                } catch (error) {
                  toast.error('Feil ved AI-review');
                } finally {
                  setReviewLoading(false);
                }
              }}
            />
            
            {reviewLoading && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Kjører AI-review...</p>
              </div>
            )}
            
            {aiReview && aiReview.length > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🤖</span>
                  <h4 className="font-semibold text-gray-900">AI Review</h4>
                </div>
                <div className="space-y-2">
                  {aiReview.map((item, index) => (
                    <div key={index} className="text-sm text-gray-700 p-2 bg-white rounded-lg">
                      {item.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowChecklist(false);
                  setAiReview(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
              >
                Lukk
              </button>
              <button
                onClick={() => handleCompleteJob(selectedOrder)}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Fullfør jobb
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
