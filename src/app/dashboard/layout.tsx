'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

const menuItems = [
  { name: 'Dashboard', icon: '🏠', path: '/dashboard' },
  { name: 'Data Persediaan', icon: '📦', path: '/dashboard/atk' },
  { name: 'Stock Opname', icon: '📋', path: '/dashboard/stock-opname' },
  { name: 'Permintaan ATK', icon: '📝', path: '/dashboard/permohonan' },
  { name: 'Pembelian', icon: '🛒', path: '/dashboard/pembelian' },
  { name: 'Input Stock', icon: '📥', path: '/dashboard/input-stock' },
  { name: 'BA Serah Terima', icon: '📤', path: '/dashboard/ba' },
  { name: 'Laporan', icon: '📊', path: '/dashboard/laporan' },
  { name: 'Pengaturan', icon: '⚙️', path: '/dashboard/pengaturan' },
  { name: 'Bantuan', icon: '❓', path: '/dashboard/bantuan' },
];

const menuAdminTL = [
  { name: 'Upload Stok', icon: '📤', path: '/dashboard/upload-stok' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.username) setUser(parsed);
        else router.push('/');
      } catch { router.push('/'); }
    } else { router.push('/'); }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    
    if (['admin', 'tl', 'asman'].includes(user.role)) {
      const unsubPerm = onSnapshot(
        query(collection(db, 'permohonans'), where('status', 'in', ['pending_admin', 'pending_tl', 'pending_asman'])),
        (snap) => {
          const newNotifs = snap.docs.map(d => {
            const data = d.data() as any;
            let statusLabel = '';
            if (data.status === 'pending_admin') statusLabel = 'Menunggu verifikasi Admin';
            if (data.status === 'pending_tl') statusLabel = 'Menunggu approval TL';
            if (data.status === 'pending_asman') statusLabel = 'Menunggu approval Asman';
            return {
              id: d.id,
              type: 'permohonan',
              title: `Permohonan ${data.nomor}`,
              message: `${data.nama_pemohon} (${data.divisi}) - ${statusLabel}`,
              time: data.tanggal_pengajuan?.toDate ? data.tanggal_pengajuan.toDate() : new Date(data.tanggal_pengajuan),
              link: '/dashboard/permohonan',
            };
          });
          setNotifications(newNotifs);
        }
      );
      return () => unsubPerm();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('currentUser');
      router.push('/');
    } catch (error) { console.error('Logout error:', error); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500">Memuat...</p></div>;
  }

  if (!user) return null;

  const unreadCount = notifications.length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r flex flex-col fixed h-full overflow-y-auto">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-4">
          <div className="bg-white rounded-lg p-2 flex items-center justify-center">
            <img src="/logo-simatik.png" alt="SIMATIK" className="w-20 h-20 object-contain rounded-full" />
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                pathname === item.path ? 'bg-teal-600 text-white font-medium' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
          
          {(user.role === 'admin' || user.role === 'tl') && (
            <>
              <div className="border-t border-gray-200 my-2"></div>
              <p className="text-xs text-gray-400 px-3 py-1 font-medium">MENU KHUSUS</p>
              {menuAdminTL.map((item) => (
                <button
                  key={item.name}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                    pathname === item.path ? 'bg-teal-600 text-white font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              ))}
            </>
          )}
        </nav>

        <div className="p-4 border-t bg-gradient-to-br from-teal-50 to-blue-50">
          <p className="text-xs text-teal-700 font-medium text-center">Tatakelola ATK Lebih Efisien</p>
          <p className="text-xs text-teal-600 text-center">Mendukung Energi untuk Negeri</p>
          <p className="text-xs text-gray-500 text-center mt-3">PLN UP3 Sanggau © 2026</p>
        </div>
      </aside>

      <div className="flex-1 ml-64">
        <header className="bg-white border-b sticky top-0 z-20">
          <div className="flex items-center justify-between px-6 py-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800">SIMATIK</h1>
              <p className="text-xs text-gray-500">Sistem Informasi Monitoring Alat Tulis Kantor • PLN UP3 Sanggau</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button 
                  onClick={() => setShowNotif(!showNotif)} 
                  className="relative p-2 hover:bg-gray-100 rounded-full"
                >
                  <span className="text-xl">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotif && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border max-h-96 overflow-y-auto z-50">
                    <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-sm text-gray-800">🔔 Notifikasi</h3>
                      <button onClick={() => setShowNotif(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">
                        <p className="text-2xl mb-2">📭</p>
                        <p>Tidak ada notifikasi baru</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {notifications.map((notif) => (
                          <button
                            key={notif.id}
                            onClick={() => {
                              router.push(notif.link);
                              setShowNotif(false);
                            }}
                            className="w-full text-left p-3 hover:bg-teal-50 transition"
                          >
                            <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                            <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {notif.time?.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                  {user.nama?.charAt(0) || 'U'}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">{user.nama}</p>
                  <p className="text-xs text-gray-500">{user.jabatan || user.role?.toUpperCase()}</p>
                </div>
                <button onClick={handleLogout} className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700">Keluar</button>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}