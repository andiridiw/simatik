'use client';

import { getCurrentUser } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function PengaturanPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('profil');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [profilForm, setProfilForm] = useState({
    nama: '',
    jabatan: '',
    divisi: '',
    nip: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const userData = getCurrentUser();
    if (userData) {
      const parsed = (userData);
      setUser(parsed);
      setProfilForm({
        nama: parsed.nama || '',
        jabatan: parsed.jabatan || '',
        divisi: parsed.divisi || '',
        nip: parsed.nip || '',
      });
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const handleUpdateProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.username), {
        nama: profilForm.nama,
        jabatan: profilForm.jabatan,
        divisi: profilForm.divisi,
        nip: profilForm.nip,
      });
      
      // Update localStorage juga
      const updatedUser = { ...user, ...profilForm };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      alert('✅ Profil berhasil diupdate!');
    } catch (error) {
      alert('Gagal update profil: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Password baru dan konfirmasi tidak cocok!');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      alert('Password minimal 6 karakter!');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) throw new Error('User tidak ditemukan');

      const credential = EmailAuthProvider.credential(currentUser.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, passwordForm.newPassword);
      
      alert('✅ Password berhasil diubah!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') alert('Password lama salah!');
      else alert('Gagal ubah password: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  const tabs = [
    { id: 'profil', name: '👤 Profil Saya', },
    { id: 'password', name: '🔒 Ganti Password' },
    { id: 'users', name: '👥 Daftar User' },
    { id: 'about', name: 'ℹ️ Tentang Aplikasi' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">⚙️ Pengaturan</h2>
        <p className="text-sm text-gray-500 mt-1">Kelola profil, password, dan pengaturan aplikasi</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow mb-6">
        <div className="flex border-b overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-teal-600 text-teal-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* TAB: Profil */}
          {activeTab === 'profil' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Profil Saya</h3>
              <form onSubmit={handleUpdateProfil} className="max-w-2xl space-y-4">
                <div className="bg-teal-50 p-4 rounded-lg">
                  <p className="text-xs text-teal-700">Username</p>
                  <p className="text-lg font-bold text-teal-900">{user.username}</p>
                  <p className="text-xs text-teal-600">Role: {user.role?.toUpperCase()}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={profilForm.nama}
                    onChange={(e) => setProfilForm({ ...profilForm, nama: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
                  <input
                    type="text"
                    value={profilForm.jabatan}
                    onChange={(e) => setProfilForm({ ...profilForm, jabatan: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Divisi</label>
                    <input
                      type="text"
                      value={profilForm.divisi}
                      onChange={(e) => setProfilForm({ ...profilForm, divisi: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NIP</label>
                    <input
                      type="text"
                      value={profilForm.nip}
                      onChange={(e) => setProfilForm({ ...profilForm, nip: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium"
                >
                  {loading ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                </button>
              </form>
            </div>
          )}

          {/* TAB: Ganti Password */}
          {activeTab === 'password' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Ganti Password</h3>
              <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password Lama</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimal 6 karakter</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium"
                >
                  {loading ? 'Memproses...' : '🔒 Ubah Password'}
                </button>
              </form>
            </div>
          )}

          {/* TAB: Daftar User */}
          {activeTab === 'users' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Daftar User Sistem</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Username</th>
                      <th className="px-4 py-2 text-left">Nama</th>
                      <th className="px-4 py-2 text-left">Jabatan</th>
                      <th className="px-4 py-2 text-left">Divisi</th>
                      <th className="px-4 py-2 text-left">Role</th>
                      <th className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs">{u.id}</td>
                        <td className="px-4 py-2 font-medium">{u.nama}</td>
                        <td className="px-4 py-2 text-xs">{u.jabatan || '-'}</td>
                        <td className="px-4 py-2">{u.divisi || '-'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                            u.role === 'tl' ? 'bg-blue-100 text-blue-700' :
                            u.role === 'asman' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {u.role?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${u.aktif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {u.aktif ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-3">Total: {users.length} user terdaftar</p>
            </div>
          )}

          {/* TAB: Tentang */}
          {activeTab === 'about' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Tentang SIMATIK</h3>
              <div className="bg-gradient-to-br from-teal-50 to-blue-50 p-6 rounded-xl border">
                <div className="flex items-center gap-4 mb-4">
                  <img src="/header-simatik.png" alt="SIMATIK" className="h-20" />
                  <div>
                    <h4 className="text-xl font-bold text-teal-800">SIMATIK</h4>
                    <p className="text-sm text-teal-700">Sistem Informasi Monitoring Alat Tulis Kantor</p>
                    <p className="text-xs text-teal-600">PLN UP3 Sanggau</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Versi</p>
                    <p className="font-bold">1.0.0</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Tahun</p>
                    <p className="font-bold">2026</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Teknologi</p>
                    <p className="font-bold text-sm">Next.js + Firebase</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Total User</p>
                    <p className="font-bold">{users.length} user</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t">
                  <p className="text-sm text-gray-700 font-medium mb-2">Fitur Utama:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✅ Manajemen Stok ATK</li>
                    <li>✅ Permohonan & Approval Multi-Level</li>
                    <li>✅ Purchase Order dengan Tanda Tangan TL</li>
                    <li>✅ BA Serah Terima Digital</li>
                    <li>✅ Laporan & Statistik Real-time</li>
                    <li>✅ Notifikasi Real-time</li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t text-center">
                  <p className="text-xs text-gray-500">Tatakelola ATK Lebih Efisien</p>
                  <p className="text-xs text-teal-700 font-medium">Mendukung Energi untuk Negeri ⚡</p>
                  <p className="text-xs text-gray-400 mt-2">© 2026 PLN UP3 Sanggau</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}