'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [atks, setAtks] = useState<any[]>([]);
  const [permohonans, setPermohonans] = useState<any[]>([]);
  const [periode, setPeriode] = useState('30 Hari');

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (userData) setUser(JSON.parse(userData));
  }, []);

  useEffect(() => {
    const unsubAtk = onSnapshot(collection(db, 'atks'), (snap) => {
      setAtks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubPerm = onSnapshot(collection(db, 'permohonans'), (snap) => {
      setPermohonans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubAtk(); unsubPerm(); };
  }, []);

  const totalJenis = atks.length;
  const totalStok = atks.reduce((sum, a) => sum + (a.stok_tersedia || 0), 0);
  
  const now = new Date();
  const permohonanBulanIni = permohonans.filter(p => {
    if (!p.tanggal_pengajuan) return false;
    const d = p.tanggal_pengajuan.toDate ? p.tanggal_pengajuan.toDate() : new Date(p.tanggal_pengajuan);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  
  const pengeluaranBulanIni = permohonans.filter(p => p.status === 'approved' || p.status === 'delivered').length;

  const stokTersedia = atks.filter(a => a.stok_tersedia > a.stok_minimum).length;
  const stokMenipis = atks.filter(a => a.stok_tersedia <= a.stok_minimum && a.stok_tersedia > 0).length;
  const stokHabis = atks.filter(a => a.stok_tersedia <= 0).length;
  const persenTersedia = totalJenis > 0 ? Math.round((stokTersedia / totalJenis) * 100) : 0;

  const pieData = [
    { name: 'Tersedia', value: stokTersedia, color: '#10b981' },
    { name: 'Menipis', value: stokMenipis, color: '#f59e0b' },
    { name: 'Habis', value: stokHabis, color: '#ef4444' },
  ];

  const chartData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dayStr = `${date.getDate()} Nov`;
    const count = permohonans.filter(p => {
      if (!p.tanggal_pengajuan) return false;
      const d = p.tanggal_pengajuan.toDate ? p.tanggal_pengajuan.toDate() : new Date(p.tanggal_pengajuan);
      return d.getDate() === date.getDate() && d.getMonth() === date.getMonth();
    }).length;
    return { tanggal: dayStr, permintaan: count, pemakaian: Math.floor(Math.random() * 50) + 20 };
  });

  const stokMenipisList = atks.filter(a => a.stok_tersedia <= a.stok_minimum).slice(0, 5);

  const aktivitasTerbaru = [...permohonans]
    .sort((a, b) => {
      const da = a.tanggal_pengajuan?.toDate ? a.tanggal_pengajuan.toDate() : new Date(a.tanggal_pengajuan || 0);
      const db2 = b.tanggal_pengajuan?.toDate ? b.tanggal_pengajuan.toDate() : new Date(b.tanggal_pengajuan || 0);
      return db2.getTime() - da.getTime();
    })
    .slice(0, 3);

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span>📊</span> Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">Ringkasan informasi monitoring Alat Tulis Kantor di lingkungan PLN UP3 Sanggau</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border flex items-center gap-2">
          <span className="text-gray-500 text-sm">📅 Periode</span>
          <select value={periode} onChange={(e) => setPeriode(e.target.value)} className="text-sm font-medium text-gray-700 outline-none">
            <option>7 Hari</option>
            <option>30 Hari</option>
            <option>3 Bulan</option>
            <option>1 Tahun</option>
          </select>
        </div>
      </div>

      {/* Kartu Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-5 rounded-xl border border-teal-200">
          <div className="bg-teal-500 p-2 rounded-lg inline-block">
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-3">{totalJenis}</p>
          <p className="text-sm text-gray-600">Jenis ATK</p>
          <p className="text-xs text-teal-600 mt-1">↑ +0 dari bulan lalu</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200">
          <div className="bg-blue-500 p-2 rounded-lg inline-block">
            <span className="text-2xl">🏪</span>
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-3">{totalStok}</p>
          <p className="text-sm text-gray-600">Total Stok</p>
          <p className="text-xs text-blue-600 mt-1">↑ +5%</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-xl border border-orange-200">
          <div className="bg-orange-500 p-2 rounded-lg inline-block">
            <span className="text-2xl">🛒</span>
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-3">{permohonanBulanIni}</p>
          <p className="text-sm text-gray-600">Permintaan Bulan Ini</p>
          <p className="text-xs text-orange-600 mt-1">↑ +12%</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200">
          <div className="bg-purple-500 p-2 rounded-lg inline-block">
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-3">{pengeluaranBulanIni}</p>
          <p className="text-sm text-gray-600">Pengeluaran Bulan Ini</p>
          <p className="text-xs text-purple-600 mt-1">↑ +14%</p>
        </div>
      </div>

      {/* Grafik */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span>📊</span> Grafik Pemakaian ATK
            </h3>
            <div className="flex gap-2">
              {['7 Hari', '30 Hari', '3 Bulan', '1 Tahun'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriode(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    periode === p ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 mb-3 text-xs">
            <div className="flex items-center gap-1"><span className="w-3 h-3 bg-teal-500 rounded-full"></span> Pemakaian</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-300 rounded-full"></span> Permintaan</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="tanggal" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="pemakaian" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="permintaan" stroke="#93c5fd" strokeWidth={2} dot={{ r: 3 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-5 rounded-xl border">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
            <span>📦</span> Status Stok
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center -mt-16 mb-12">
            <p className="text-3xl font-bold text-gray-800">{persenTersedia}%</p>
            <p className="text-xs text-gray-500">Tersedia</p>
          </div>
          <div className="space-y-2 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-gray-700">{item.name}</span>
                </div>
                <span className="font-medium text-gray-800">{item.value} Item</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stok Menipis & Aktivitas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="text-orange-500">⚠️</span> Stok Menipis
            </h3>
            <button className="text-xs text-teal-600 hover:underline">Lihat Semua →</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">No</th>
                <th className="pb-2">Nama ATK</th>
                <th className="pb-2">Stok Tersisa</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {stokMenipisList.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4 text-gray-400">✅ Semua stok aman</td></tr>
              ) : (
                stokMenipisList.map((atk, i) => (
                  <tr key={atk.id} className="border-b">
                    <td className="py-2">{i + 1}</td>
                    <td className="py-2 font-medium">{atk.nama}</td>
                    <td className="py-2">{atk.stok_tersedia} {atk.satuan}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        atk.stok_tersedia <= 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {atk.stok_tersedia <= 0 ? '• Habis' : '• Menipis'}
                      </span>
                    </td>
                    <td className="py-2">
                      <button className="text-teal-600 hover:underline text-xs">[Lihat]</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-5 rounded-xl border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span>🕐</span> Aktivitas Terbaru
            </h3>
            <button className="text-xs text-teal-600 hover:underline">Lihat Semua →</button>
          </div>
          <div className="space-y-3">
            {aktivitasTerbaru.length === 0 ? (
              <p className="text-center text-gray-400 py-4 text-sm">Belum ada aktivitas</p>
            ) : (
              aktivitasTerbaru.map((p) => {
                const icon = p.status === 'approved' ? '✅' : p.status === 'rejected' ? '❌' : '🛒';
                const bgColor = p.status === 'approved' ? 'bg-green-100' : p.status === 'rejected' ? 'bg-red-100' : 'bg-blue-100';
                const tanggal = p.tanggal_pengajuan?.toDate ? p.tanggal_pengajuan.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                return (
                  <div key={p.id} className="flex items-start gap-3">
                    <div className={`${bgColor} p-2 rounded-full`}>
                      <span>{icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">
                        <strong>{p.status === 'approved' ? 'Disetujui' : p.status === 'rejected' ? 'Ditolak' : 'Permintaan baru'}</strong> dari {p.nama_pemohon} ({p.divisi})
                      </p>
                      <p className="text-xs text-gray-500">{tanggal} • {p.nomor}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}