import React from 'react';
import { toast } from 'react-hot-toast';

const emptyItem = () => ({ section: '', description: '' });
const emptyForm = { name: '', description: '', order_type: '', items: [emptyItem()] };

const ORDER_TYPES = ['årskontroll', 'service', 'inspection', 'trykktest', 'vedlikehold'];

export default function TemplatesTab({ role }) {
  const canManage = role === 'admin' || role === 'manager';

  const [templates, setTemplates] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState(null);
  const [formData, setFormData] = React.useState(emptyForm);

  const loadTemplates = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checklist-templates');
      const data = await res.json();
      setTemplates(data);
    } catch (error) {
      toast.error('Feil ved lasting av maler');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const openCreateForm = () => {
    setEditingTemplate(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditForm = async (template) => {
    try {
      const res = await fetch(`/api/checklist-templates/${template.id}`);
      const data = await res.json();
      setEditingTemplate(data);
      setFormData({
        name: data.name,
        description: data.description || '',
        order_type: data.order_type || '',
        items: data.items.length > 0
          ? data.items.map(i => ({ section: i.section || '', description: i.description }))
          : [emptyItem()]
      });
      setShowForm(true);
    } catch (error) {
      toast.error('Feil ved lasting av mal');
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setFormData(emptyForm);
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const addItem = () => {
    setFormData(prev => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Navn på mal kreves');
      return;
    }
    const items = formData.items.filter(i => i.description.trim());
    if (items.length === 0) {
      toast.error('Legg til minst ett sjekkpunkt');
      return;
    }

    const payload = { name: formData.name, description: formData.description, order_type: formData.order_type || null, items };

    try {
      const res = editingTemplate
        ? await fetch(`/api/checklist-templates/${editingTemplate.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        : await fetch('/api/checklist-templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunne ikke lagre mal');
      toast.success(editingTemplate ? 'Mal oppdatert' : 'Mal opprettet');
      closeForm();
      loadTemplates();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (template) => {
    if (!window.confirm(`Slette malen "${template.name}"?`)) return;
    try {
      const res = await fetch(`/api/checklist-templates/${template.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Kunne ikke slette mal');
      toast.success('Mal slettet');
      loadTemplates();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#520000]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#520000]">Sjekkliste-maler</h1>
        {canManage && (
          <button
            onClick={openCreateForm}
            className="px-4 py-2 bg-[#520000] hover:bg-[#3a0000] text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Ny mal
          </button>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="bg-white border rounded-2xl p-8 text-center text-gray-500 shadow-sm">
          <div className="text-4xl mb-2">📝</div>
          <p>Ingen maler opprettet ennå</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map(template => (
            <div key={template.id} className="bg-white border rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{template.name}</h3>
                  {template.order_type && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-red-50 text-[#520000]">
                      {template.order_type}
                    </span>
                  )}
                </div>
                <span className="text-xs text-white bg-[#520000] px-2 py-1 rounded-full whitespace-nowrap">
                  {template.item_count} punkter
                </span>
              </div>
              {template.description && (
                <p className="text-sm text-gray-600 mt-2">{template.description}</p>
              )}
              {canManage && (
                <div className="flex gap-3 mt-4 pt-3 border-t">
                  <button
                    onClick={() => openEditForm(template)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Rediger
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Slett
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#520000]">
                {editingTemplate ? 'Rediger mal' : 'Ny mal'}
              </h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="f.eks. Årskontroll slukkeanlegg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordretype (valgfritt)</label>
                  <select
                    value={formData.order_type}
                    onChange={(e) => setFormData({ ...formData, order_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Ingen spesifikk type</option>
                    {ORDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse (valgfritt)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Sjekkpunkter</label>
                  <span className="text-xs text-gray-400">Seksjon er valgfritt - punkter grupperes under samme seksjonsnavn</span>
                </div>
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start bg-gray-50 p-2 rounded-lg">
                      <input
                        type="text"
                        value={item.section}
                        onChange={(e) => updateItem(index, 'section', e.target.value)}
                        placeholder="Seksjon"
                        className="w-1/3 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Sjekkpunkt-tekst"
                        className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-gray-400 hover:text-red-600 px-2"
                        title="Fjern"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2 text-sm text-[#520000] hover:text-[#3a0000] font-medium"
                >
                  + Legg til sjekkpunkt
                </button>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#520000] hover:bg-[#3a0000] text-white rounded-lg font-medium transition-colors"
                >
                  {editingTemplate ? 'Lagre endringer' : 'Opprett mal'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Avbryt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
