import React from 'react';
import { toast } from 'react-hot-toast';

const emptyForm = {
  username: '',
  password: '',
  name: '',
  email: '',
  role: 'technician',
  technician_id: ''
};

const getRoleColor = (role) => {
  switch (role) {
    case 'admin': return 'bg-purple-100 text-purple-700';
    case 'manager': return 'bg-red-100 text-red-700';
    case 'coordinator': return 'bg-blue-100 text-blue-700';
    case 'technician': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getRoleText = (role) => {
  switch (role) {
    case 'admin': return 'Admin';
    case 'manager': return 'Leder';
    case 'coordinator': return 'Koordinator';
    case 'technician': return 'Tekniker';
    default: return role;
  }
};

export default function UsersTab({ technicians, role, onPreviewTechnician }) {
  const canManage = role === 'admin' || role === 'manager';
  const isAdmin = role === 'admin';

  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(canManage);
  const [showForm, setShowForm] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState(null);
  const [formData, setFormData] = React.useState(emptyForm);
  const [filters, setFilters] = React.useState({ role: '', search: '' });

  const loadUsers = React.useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Kunne ikke laste brukere');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      toast.error('Feil ved lasting av brukere');
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreateForm = () => {
    setEditingUser(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      name: user.name || '',
      email: user.email || '',
      role: user.role,
      technician_id: user.technician_id || ''
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData(emptyForm);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const payload = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          technician_id: formData.role === 'technician' ? (formData.technician_id || null) : null
        };
        if (formData.password) payload.password = formData.password;

        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Kunne ikke oppdatere bruker');
        toast.success(`Bruker ${formData.name} oppdatert`);
      } else {
        if (!formData.username || !formData.password) {
          toast.error('Brukernavn og passord kreves');
          return;
        }
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
            name: formData.name || formData.username,
            email: formData.email,
            role: formData.role,
            technician_id: formData.role === 'technician' ? (formData.technician_id || null) : null
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Kunne ikke opprette bruker');
        toast.success(`Bruker ${formData.username} opprettet`);
      }
      closeForm();
      loadUsers();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Er du sikker på at du vil slette brukeren "${user.username}"?`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Kunne ikke slette bruker');
      toast.success('Bruker slettet');
      loadUsers();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const filteredUsers = users.filter(user => {
    if (filters.role && user.role !== filters.role) return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const match = user.name?.toLowerCase().includes(s) ||
                   user.username?.toLowerCase().includes(s) ||
                   user.email?.toLowerCase().includes(s);
      if (!match) return false;
    }
    return true;
  });

  const getTechnicianForUser = (user) => technicians.find(t => t.id === user.technician_id);

  // Koordinator/tekniker: enkel, skrivebeskyttet oversikt over teknikerne
  if (!canManage) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#520000]">Teknikere</h1>
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Navn</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kompetanse</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Base</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {technicians.map(tech => (
                <tr key={tech.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{tech.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{JSON.parse(tech.skills || '[]').join(', ')}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{tech.base_lat?.toFixed(2)}, {tech.base_lng?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-gray-600">
            <span>ℹ️</span>
            <p className="text-sm">
              {role === 'technician'
                ? 'Kontakt koordinator for å oppdatere dine detaljer.'
                : 'Som koordinator kan du se teknikerlisten, men kun ledere/admin administrerer brukerkontoer.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-[#520000]">Brukere</h1>
        {isAdmin && (
          <button
            onClick={openCreateForm}
            className="px-4 py-2 bg-[#520000] hover:bg-[#3a0000] text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Ny bruker
          </button>
        )}
      </div>

      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Alle roller</option>
              <option value="admin">Admin</option>
              <option value="manager">Leder</option>
              <option value="coordinator">Koordinator</option>
              <option value="technician">Tekniker</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Søk</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Navn, brukernavn, e-post..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Viser {filteredUsers.length} av {users.length} brukere
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#520000]">
                {editingUser ? 'Rediger bruker' : 'Ny bruker'}
              </h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brukernavn</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="f.eks. per.hansen"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Fullt navn"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e-post@nortronik.no"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingUser ? 'Nytt passord (valgfritt)' : 'Passord'}
                </label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder={editingUser ? 'La stå tom for å beholde' : '••••••••'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value, technician_id: '' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="technician">Tekniker</option>
                  <option value="coordinator">Koordinator</option>
                  <option value="manager">Leder</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formData.role === 'technician' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Koblet tekniker</label>
                  <select
                    value={formData.technician_id}
                    onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Velg tekniker...</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#520000] hover:bg-[#3a0000] text-white rounded-lg font-medium transition-colors"
                >
                  {editingUser ? 'Lagre endringer' : 'Opprett bruker'}
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

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Brukernavn</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Navn</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">E-post</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rolle</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Handling</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">👥</div>
                  <p>Ingen brukere funnet</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-block px-3 py-1 text-xs rounded-full ${getRoleColor(user.role)}`}>
                      {getRoleText(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex gap-2 justify-end">
                      {user.role === 'technician' && getTechnicianForUser(user) && (
                        <button
                          onClick={() => onPreviewTechnician && onPreviewTechnician(getTechnicianForUser(user))}
                          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          👁 Forhåndsvis
                        </button>
                      )}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => openEditForm(user)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Rediger
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Slett
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
