import React from 'react';
import { toast } from 'react-hot-toast';

export default function UsersTab({ technicians, role }) {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editingUser, setEditingUser] = React.useState(null);
  const [newUser, setNewUser] = React.useState({
    name: '',
    email: '',
    phone: '',
    base_lat: '',
    base_lng: '',
    skills: [],
    clearance_level: 0,
    role: 'technician'
  });
  const [filters, setFilters] = React.useState({
    role: '',
    search: ''
  });

  // Kombiner teknikere med mock brukerdata
  React.useEffect(() => {
    // Mock data for koordinatorer og ledere
    const mockUsers = [
      { id: 100, name: 'Ole Hansen', email: 'ole@nortronik.no', phone: '900 12 345', role: 'manager', base: 'Oslo', skills: [], clearance_level: 3 },
      { id: 101, name: 'Kari Nordmann', email: 'kari@nortronik.no', phone: '901 23 456', role: 'coordinator', base: 'Bergen', skills: [], clearance_level: 2 },
      { id: 102, name: 'Per Pedersen', email: 'per@nortronik.no', phone: '902 34 567', role: 'coordinator', base: 'Trondheim', skills: [], clearance_level: 2 }
    ];

    // Map teknikere til user-objekter
    const technicianUsers = technicians.map(t => ({
      id: t.id,
      name: t.name,
      email: `${t.name.toLowerCase().replace(/\s+/g, '.')}@nortronik.no`,
      phone: `90${t.id} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100}`,
      role: 'technician',
      base: `Base (${t.base_lat?.toFixed(3)}, ${t.base_lng?.toFixed(3)})`,
      base_lat: t.base_lat,
      base_lng: t.base_lng,
      skills: JSON.parse(t.skills || '[]'),
      clearance_level: t.clearance_level
    }));

    setUsers([...mockUsers, ...technicianUsers]);
    setLoading(false);
  }, [technicians]);

  const filteredUsers = users.filter(user => {
    if (filters.role && user.role !== filters.role) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const match = user.name?.toLowerCase().includes(searchLower) ||
                   user.email?.toLowerCase().includes(searchLower) ||
                   user.phone?.toLowerCase().includes(searchLower);
      if (!match) return false;
    }
    return true;
  });

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

  const handleSaveUser = () => {
    if (!editingUser) {
      // Ny bruker
      const newId = Math.max(...users.map(u => u.id), 0) + 1;
      setUsers([...users, { ...newUser, id: newId }]);
      toast.success(`Bruker ${newUser.name} opprettet`);
      setNewUser({
        name: '',
        email: '',
        phone: '',
        base_lat: '',
        base_lng: '',
        skills: [],
        clearance_level: 0,
        role: 'technician'
      });
    } else {
      // Oppdater eksisterende
      setUsers(users.map(u => u.id === editingUser.id ? { ...editingUser, ...newUser } : u));
      toast.success(`Bruker ${editingUser.name} oppdatert`);
      setEditingUser(null);
    }
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Er du sikker på at du vil slette denne brukeren?')) {
      setUsers(users.filter(u => u.id !== userId));
      toast.success('Bruker slettet');
    }
  };

  const handleSkillChange = (skill, checked) => {
    const currentSkills = newUser.skills || [];
    if (checked) {
      setNewUser({ ...newUser, skills: [...currentSkills, skill] });
    } else {
      setNewUser({ ...newUser, skills: currentSkills.filter(s => s !== skill) });
    }
  };

  // Tilgjengelige skills
  const allSkills = ['årskontroll', 'service', 'inspection', 'trykktest', 'vedlikehold', 'reparasjon', 'sikkerhet'];

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#520000]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#520000]">Brukere</h1>
        {(role === 'manager' || role === 'admin') && (
          <button
            onClick={() => {
              setEditingUser(null);
              setNewUser({
                name: '',
                email: '',
                phone: '',
                base_lat: '',
                base_lng: '',
                skills: [],
                clearance_level: 0,
                role: 'technician'
              });
            }}
            className="px-4 py-2 bg-[#520000] hover:bg-[#3a0000] text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Ny bruker
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({...filters, role: e.target.value})}
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
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              placeholder="Navn, e-post, telefon..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          Viser {filteredUsers.length} av {users.length} brukere
        </div>
      </div>

      {/* User Modal */}
      {(editingUser !== null || newUser.name) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#520000]">
                {editingUser ? 'Rediger bruker' : 'Ny bruker'}
              </h2>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setNewUser({
                    name: '',
                    email: '',
                    phone: '',
                    base_lat: '',
                    base_lng: '',
                    skills: [],
                    clearance_level: 0,
                    role: 'technician'
                  });
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Fullt navn"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e-post@nortronik.no"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="900 12 345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="technician">Tekniker</option>
                  <option value="coordinator">Koordinator</option>
                  <option value="manager">Leder</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {newUser.role === 'technician' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Base Lat</label>
                      <input
                        type="number"
                        step="0.001"
                        value={newUser.base_lat}
                        onChange={(e) => setNewUser({...newUser, base_lat: parseFloat(e.target.value) || ''})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="60.391"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Base Lng</label>
                      <input
                        type="number"
                        step="0.001"
                        value={newUser.base_lng}
                        onChange={(e) => setNewUser({...newUser, base_lng: parseFloat(e.target.value) || ''})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="5.322"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clearance Level</label>
                    <select
                      value={newUser.clearance_level}
                      onChange={(e) => setNewUser({...newUser, clearance_level: parseInt(e.target.value) || 0})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="0">0 - Ingen</option>
                      <option value="1">1 - Grunnleggende</option>
                      <option value="2">2 - Standard</option>
                      <option value="3">3 - Høy (Sensitiv)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kompetanse</label>
                    <div className="grid grid-cols-2 gap-2">
                      {allSkills.map(skill => (
                        <label key={skill} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={(newUser.skills || []).includes(skill)}
                            onChange={(e) => handleSkillChange(skill, e.target.checked)}
                            className="rounded border-gray-300 text-[#520000] focus:ring-[#520000]"
                          />
                          <span className="text-sm text-gray-700">{skill}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSaveUser}
                  className="flex-1 px-4 py-2 bg-[#520000] hover:bg-[#3a0000] text-white rounded-lg font-medium transition-colors"
                >
                  {editingUser ? 'Lagre endringer' : 'Opprett bruker'}
                </button>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setNewUser({
                      name: '',
                      email: '',
                      phone: '',
                      base_lat: '',
                      base_lng: '',
                      skills: [],
                      clearance_level: 0,
                      role: 'technician'
                    });
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Navn
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                E-post
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Telefon
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Rolle
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Base
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Kompetanse
              </th>
              {(role === 'manager' || role === 'admin') && (
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Handling
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={role === 'manager' || role === 'admin' ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">👥</div>
                  <p>Ingen brukere funnet</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-block px-3 py-1 text-xs rounded-full ${getRoleColor(user.role)}`}>
                      {getRoleText(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.base}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.skills?.length > 0 ? user.skills.join(', ') : '-'}
                  </td>
                  {(role === 'manager' || role === 'admin') && (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setNewUser({
                              name: user.name,
                              email: user.email,
                              phone: user.phone,
                              base_lat: user.base_lat || '',
                              base_lng: user.base_lng || '',
                              skills: user.skills || [],
                              clearance_level: user.clearance_level || 0,
                              role: user.role
                            });
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Rediger
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Slett
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info for teknikere/koordinatorer */}
      {(role === 'technician' || role === 'coordinator') && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-gray-600">
            <span>ℹ️</span>
            <p className="text-sm">
              {role === 'technician' 
                ? 'Kontakt koordinator for å oppdatere dine detaljer.'
                : 'Som koordinator kan du se brukerliste, men kun ledere/admin kan redigere.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
