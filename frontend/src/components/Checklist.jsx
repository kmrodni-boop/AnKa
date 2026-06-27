import React from 'react';
import { toast } from 'react-hot-toast';

export default function Checklist({ orderId, onReviewRequested }) {
  const [items, setItems] = React.useState([]);
  const [newItem, setNewItem] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchChecklist = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/checklist`);
        const data = await res.json();
        setItems(data);
      } catch (error) {
        toast.error('Feil ved lasting av sjekkliste');
      } finally {
        setLoading(false);
      }
    };
    fetchChecklist();
  }, [orderId]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newItem })
      });
      
      if (res.ok) {
        const newId = await res.json();
        setItems([...items, {
          id: newId.id,
          order_id: orderId,
          description: newItem,
          completed: 0
        }]);
        setNewItem('');
        toast.success('Oppgave lagt til');
      }
    } catch (error) {
      toast.error('Feil ved lagring av oppgave');
    }
  };

  const handleToggleComplete = async (itemId, currentCompleted) => {
    try {
      const res = await fetch(`/api/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentCompleted })
      });
      
      if (res.ok) {
        setItems(items.map(item => 
          item.id === itemId ? { ...item, completed: !currentCompleted } : item
        ));
        toast.success('Oppgave oppdatert');
      }
    } catch (error) {
      toast.error('Feil ved oppdatering');
    }
  };

  const handleRunReview = () => {
    if (onReviewRequested) {
      onReviewRequested();
    }
  };

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#520000] mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="bg-gray-100 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Fremdrift: {completedCount}/{totalCount} fullført
            </span>
            <span className="text-sm font-bold text-[#520000]">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-[#520000] to-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Add new item */}
      <form onSubmit={handleAddItem} className="bg-white border rounded-xl p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Legg til ny oppgave..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#520000] focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#520000] hover:bg-[#3a0000] text-white rounded-lg transition-colors"
          >
            Legg til
          </button>
        </div>
      </form>

      {/* Checklist items */}
      <div className="bg-white border rounded-xl overflow-hidden">
        {items.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="text-2xl mb-2">✓</div>
            <p>Ingen oppgaver ennå</p>
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleComplete(item.id, item.completed)}
                    className={`flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      item.completed 
                        ? 'bg-[#520000] border-[#520000]' 
                        : 'border-gray-300 hover:border-[#520000]'
                    }`}
                  >
                    {item.completed && <span className="text-white text-sm">✓</span>}
                  </button>
                  
                  <span className={`flex-1 text-gray-900 ${item.completed ? 'line-through text-gray-400' : ''}`}>
                    {item.description}
                  </span>
                  
                  {!item.completed && (
                    <button
                      onClick={() => handleToggleComplete(item.id, item.completed)}
                      className="text-sm text-[#520000] hover:text-[#3a0000]"
                    >
                      Fullfør
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Review button */}
      {totalCount > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <button
            onClick={handleRunReview}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#520000] to-purple-600 hover:from-[#3a0000] hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
          >
            <span>🤖</span>
            Kjør AI Review
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Få en automatisk vurdering av sjekklisten
          </p>
        </div>
      )}
    </div>
  );
}
