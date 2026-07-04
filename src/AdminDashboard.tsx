import React, { useState, useEffect } from 'react';
import { useAppContext } from './AppContext';
import { API_BASE_URL } from './config';

const AdminDashboard: React.FC = () => {
  const { session, isAdmin } = useAppContext();
  const token = session?.access_token;
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Users could not be fetched");
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && token) {
      fetchUsers();
    }
  }, [isAdmin, token]);

  const handleUpdateLimit = async (userId: string, newLimit: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/user/${userId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ daily_limit: newLimit })
      });
      if (res.ok) {
        alert("Limit updated!");
        fetchUsers();
      } else {
        alert("Update failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred");
    }
  };

  if (!isAdmin) {
    return <div className="p-8 text-center text-rose-500 font-bold">Unauthorized</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-8 animate-[fadeIn_0.3s]">
      <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 border-b border-zinc-800 pb-4">
        Admin Dashboard
      </h2>

      {loading ? (
        <div className="text-zinc-500 font-mono">Loading users...</div>
      ) : error ? (
        <div className="text-rose-500 font-bold">Error: {error}</div>
      ) : (
        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950 text-zinc-500 font-mono text-[10px] uppercase">
                <tr>
                  <th className="p-4 font-bold">ID</th>
                  <th className="p-4 font-bold">Username</th>
                  <th className="p-4 font-bold">Email</th>
                  <th className="p-4 font-bold">Role</th>
                  <th className="p-4 font-bold">Daily Limit</th>
                  <th className="p-4 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-zinc-800/50 transition">
                    <td className="p-4 text-zinc-500 font-mono text-xs">{u.id}</td>
                    <td className="p-4 text-zinc-100 font-bold">{u.username || 'Unknown'}</td>
                    <td className="p-4 text-zinc-400">{u.email || 'Unknown'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td className="p-4 text-sky-400 font-mono font-bold">{u.daily_limit}</td>
                    <td className="p-4">
                      <button 
                        onClick={() => {
                          const limit = prompt("Enter new limit:", u.daily_limit);
                          if (limit && !isNaN(parseInt(limit))) {
                            handleUpdateLimit(u.id, parseInt(limit));
                          }
                        }}
                        className="bg-sky-500/10 text-sky-500 border border-sky-500/20 text-xs font-bold py-2 rounded-lg hover:bg-sky-500 hover:text-white transition"
                      >
                        Change Limit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
