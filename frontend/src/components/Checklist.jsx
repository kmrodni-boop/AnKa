import React from 'react';
import { toast } from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'godkjent', label: 'GODKJENT', activeClass: 'bg-green-500 text-white border-green-500', idleClass: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'irrelevant', label: 'IRRELEVANT', activeClass: 'bg-yellow-500 text-white border-yellow-500', idleClass: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'ikke_godkjent', label: 'IKKE GODKJENT', activeClass: 'bg-red-600 text-white border-red-600', idleClass: 'bg-red-50 text-red-700 border-red-200' }
];

const UNGROUPED = 'Sjekkpunkter';

export default function Checklist({ orderId, orderType, onReviewRequested, compact = false }) {
  const [items, setItems] = React.useState([]);
  const [newItem, setNewItem] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [templates, setTemplates] = React.useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');
  const [applyingTemplate, setApplyingTemplate] = React.useState(false);
  // I kompakt (mobil) visning er kommentarfeltet sjelden i bruk - hold det
  // skjult med mindre punktet er "Ikke godkjent", allerede har en kommentar,
  // eller teknikeren selv har åpnet det manuelt.
  const [expandedComments, setExpandedComments] = React.useState(() => new Set());

  const showCommentFor = (item) =>
    !compact || item.status === 'ikke_godkjent' || !!item.comment || expandedComments.has(item.id);

  const expandComment = (itemId) => {
    setExpandedComments(prev => new Set(prev).add(itemId));
  };

  const loadChecklist = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/checklist`);
      const data = await res.json();
      setItems(data);
    } catch (error) {
      toast.error('Feil ved lasting av sjekkliste');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  React.useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await fetch('/api/checklist-templates');
        const data = await res.json();
        setTemplates(data);
        // Foreslå malen som matcher ordretypen, hvis en finnes
        const match = data.find(t => t.order_type === orderType);
        if (match) setSelectedTemplateId(String(match.id));
      } catch (error) {
        // Stille feil - malvelger er en bonusfunksjon, ikke kritisk for sjekklisten
      }
    };
    loadTemplates();
  }, [orderType]);

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) return;
    setApplyingTemplate(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/checklist/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: parseInt(selectedTemplateId, 10) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunne ikke bruke mal');
      toast.success(`${data.added} sjekkpunkter lagt til`);
      loadChecklist();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setApplyingTemplate(false);
    }
  };

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
          section: null,
          description: newItem,
          comment: null,
          status: null
        }]);
        setNewItem('');
        toast.success('Oppgave lagt til');
      }
    } catch (error) {
      toast.error('Feil ved lagring av oppgave');
    }
  };

  const handleSetStatus = async (itemId, status) => {
    const nextStatus = items.find(i => i.id === itemId)?.status === status ? null : status;
    setItems(items.map(item => item.id === itemId ? { ...item, status: nextStatus } : item));
    try {
      await fetch(`/api/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (error) {
      toast.error('Feil ved oppdatering');
    }
  };

  const handleCommentChange = (itemId, comment) => {
    setItems(items.map(item => item.id === itemId ? { ...item, comment } : item));
  };

  const handleCommentBlur = async (itemId, comment) => {
    try {
      await fetch(`/api/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment })
      });
    } catch (error) {
      toast.error('Feil ved lagring av kommentar');
    }
  };

  const handleRunReview = () => {
    if (onReviewRequested) {
      onReviewRequested();
    }
  };

  const assessedCount = items.filter(item => item.status).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((assessedCount / totalCount) * 100) : 0;

  const sections = React.useMemo(() => {
    const grouped = new Map();
    for (const item of items) {
      const key = item.section || UNGROUPED;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    }
    return Array.from(grouped.entries());
  }, [items]);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#520000] mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bruk mal */}
      {templates.length > 0 && (
        <div className="bg-white border rounded-xl p-4 flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Velg mal...</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.item_count} punkter)</option>
            ))}
          </select>
          <button
            onClick={handleApplyTemplate}
            disabled={!selectedTemplateId || applyingTemplate}
            className="px-4 py-2 bg-[#520000] hover:bg-[#3a0000] disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            {applyingTemplate ? 'Legger til...' : 'Bruk mal'}
          </button>
        </div>
      )}

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="bg-gray-100 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Vurdert: {assessedCount}/{totalCount}
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

      {/* Sjekklistepunkter, gruppert på seksjon */}
      {items.length === 0 ? (
        <div className="bg-white border rounded-xl p-6 text-center text-gray-500">
          <div className="text-2xl mb-2">✓</div>
          <p>Ingen oppgaver ennå</p>
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map(([sectionName, sectionItems]) => (
            <div key={sectionName}>
              <h4 className="font-semibold text-[#520000] mb-2">{sectionName}</h4>
              <div className="space-y-3">
                {sectionItems.map(item => (
                  <div key={item.id} className="bg-white border rounded-xl p-3">
                    <div className="text-sm font-medium text-gray-900 mb-2">{item.description}</div>
                    {showCommentFor(item) ? (
                      <textarea
                        value={item.comment || ''}
                        onChange={(e) => handleCommentChange(item.id, e.target.value)}
                        onBlur={(e) => handleCommentBlur(item.id, e.target.value)}
                        placeholder="(Skriv inn tekst her)"
                        rows={1}
                        autoFocus={expandedComments.has(item.id)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#520000]"
                      />
                    ) : (
                      <button
                        onClick={() => expandComment(item.id)}
                        className="text-xs text-gray-400 hover:text-[#520000] mb-2"
                      >
                        + Legg til kommentar
                      </button>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      {STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleSetStatus(item.id, opt.value)}
                          className={`px-2 py-2 rounded-lg text-xs font-bold border-2 transition-colors ${
                            item.status === opt.value ? opt.activeClass : opt.idleClass
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new item */}
      <form onSubmit={handleAddItem} className="bg-white border rounded-xl p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Legg til eget sjekkpunkt..."
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
