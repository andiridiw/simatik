'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { getCurrentUser } from '@/lib/auth';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalAtk: 0,
    totalStok: 0,
    permintaanBulanIni: 0,
    pengeluaranBulanIni: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = getCurrentUser();
    if (userData) setUser(userData);
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubAtk = onSnapshot(collection(db, 'atks'), (snap) => {
      const atks = snap.docs.map(d => d.data() as any);
      setStats(prev => ({
        ...prev,
        totalAtk: atks.length,
        totalStok: atks.reduce((sum, a) => sum + (a.stok_tersedia || 0), 0),
      }));
      setLoading(false);
    });

    const unsubPerm = onSnapshot(collection(db, 'permohonans'), (snap) => {
      const perms = snap.docs.map(d => d.data() as any);
      const now = new Date();
      const bulanIni = perms.filter(p => {
        const t = p.tanggal_pengajuan?.toDate ? p.tanggal_pengajuan.toDate() : new Date(p.tanggal_pengajuan);
        return t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear();
      });
      setStats(prev => ({ ...prev, permintaanBulanIni: bulanIni.length }));
    });

    const unsubBa = onSnapshot(collection(db, 'ba_serah_terima'), (snap) => {
      const bas = snap.docs.map(d => d.data() as any);
      const now = new Date();
      const bulanIni = bas.filter(b => {
        const t = b.tanggal_serah_terima?.toDate ? b.tanggal_serah_terima.toDate() : new Date(b.tanggal_serah_terima);
        return t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear();
      });
      setStats(prev => ({ ...prev, pengeluaranBulanIni: bulanIni.length }));
    });

    return () => { unsubAtk(); unsubPerm(); unsubBa(); };
  }, [user]);

  if (!user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">📊 Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Ringkasan informasi monitoring ATK di PLN UP3 Sanggau</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">Memuat data...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-xl border border-teal-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">📦</span>
                <span className="text-xs text-teal-600 bg-teal-100 px-2 py-1 rounded-full">ATK</span>
              </div>
              <p className="text-3xl font-bold text-teal-800">{stats.totalAtk}</p>
              <p className="text-sm text-teal-600 mt-1">Jenis ATK</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">🏭</span>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Stok</span>
              </div>
              <p className="text-3xl font-bold text-blue-800">{stats.totalStok.toLocaleString('id-ID')}</p>
              <p className="text-sm text-blue-600 mt-1">Total Stok</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">🛒</span>
                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">Bulan Ini</span>
              </div>
              <p className="text-3xl font-bold text-orange-800">{stats.permintaanBulanIni}</p>
              <p className="text-sm text-orange-600 mt-1">Permintaan Bulan Ini</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">✅</span>
                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">Bulan Ini</span>
              </div>
              <p className="text-3xl font-bold text-purple-800">{stats.pengeluaranBulanIni}</p>
              <p className="text-sm text-purple-600 mt-1">Pengeluaran Bulan Ini</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Statistik Cepat</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Total User</p>
                <p className="text-2xl font-bold text-gray-800">4</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Kategori ATK</p>
                <p className="text-2xl font-bold text-gray-800">8</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Status Sistem</p>
                <p className="text-2xl font-bold text-green-600">✅ Online</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}