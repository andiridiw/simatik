'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface ATK {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  satuan: string;
  stok_tersedia: number;
  stok_minimum: number;
  harga_satuan: number;
  aktif: boolean;
}

const COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#10b981', '#6366f1'];

export default function LaporanPage() {
  const [user, setUser] = useState<any>(null);
  const [atks, setAtks] = useState<ATK[]>([]);
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (userData) setUser(JSON.parse(userData));
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'atks'), (snapshot) => {
      setAtks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ATK[]);
    });
    return () => unsubscribe();
  }, []);

  // Statistik
  const totalJenis = atks.length;
  const totalStok = atks.reduce((sum, a) => sum + (a.stok_tersedia || 0), 0);
  const totalNilai = atks.reduce((sum, a) => sum + ((a.stok_tersedia || 0) * (a.harga_satuan || 0)), 0);
  const stokMenipis = atks.filter(a => a.stok_tersedia <= a.stok_minimum && a.stok_tersedia > 0);
  const stokHabis = atks.filter(a => a.stok_tersedia <= 0);
  const stokAman = atks.filter(a => a.stok_tersedia > a.stok_minimum);

  // Data per kategori
  const kategoriMap: Record<string, { jumlah: number; stok: number; nilai: number }> = {};
  atks.forEach(a => {
    const kat = a.kategori || 'Lainnya';
    if (!kategoriMap[kat]) kategoriMap[kat] = { jumlah: 0, stok: 0, nilai: 0 };
    kategoriMap[kat].jumlah += 1;
    kategoriMap[kat].stok += a.stok_tersedia || 0;
    kategoriMap[kat].nilai += (a.stok_tersedia || 0) * (a.harga_satuan || 0);
  });

  const kategoriData = Object.entries(kategoriMap).map(([name, data]) => ({
    name,
    jenis: data.jumlah,
    stok: data.stok,
    nilai: data.nilai,
  }));

  // Pie chart data
  const pieData = kategoriData.map(k => ({ name: k.name, value: k.jenis }));

  // Filter tabel
  const filteredAtks = atks.filter(a => {
    const matchKategori = filterKategori === 'Semua' || a.kategori === filterKategori;
    const matchSearch = a.nama.toLowerCase().includes(search.toLowerCase()) || 
                       a.kode.toLowerCase().includes(search.toLowerCase());
    return matchKategori && matchSearch;
  });

  const formatRupiah = (angka: number) => 'Rp ' + angka.toLocaleString('id-ID');

  const handlePrint = () => {
    window.print();
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📊 Laporan Stok ATK</h2>
          <p className="text-sm text-gray-500 mt-1">Ringkasan persediaan dan nilai inventaris ATK</p>
        </div>
        <button
          onClick={handlePrint}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-medium print:hidden"
        >
          🖨️ Cetak Laporan
        </button>
      </div>

      {/* Kartu Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-xl border border-teal-200">
          <p className="text-xs text-teal-700 font-medium">Total Jenis ATK</p>
          <p className="text-2xl font-bold text-teal-800 mt-1">{totalJenis}</p>
          <p className="text-xs text-teal-600 mt-1">item berbeda</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
          <p className="text-xs text-blue-700 font-medium">Total Stok Fisik</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{totalStok.toLocaleString('id-ID')}</p>
          <p className="text-xs text-blue-600 mt-1">unit tersedia</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
          <p className="text-xs text-purple-700 font-medium">Nilai Inventaris</p>
          <p className="text-xl font-bold text-purple-800 mt-1">{formatRupiah(totalNilai)}</p>
          <p className="text-xs text-purple-600 mt-1">total aset ATK</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
          <p className="text-xs text-orange-700 font-medium">Stok Menipis</p>
          <p className="text-2xl font-bold text-orange-800 mt-1">{stokMenipis.length}</p>
          <p className="text-xs text-orange-600 mt-1">perlu restock</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
          <p className="text-xs text-red-700 font-medium">Stok Habis</p>
          <p className="text-2xl font-bold text-red-800 mt-1">{stokHabis.length}</p>
          <p className="text-xs text-red-600 mt-1">harus segera dibeli</p>
        </div>
      </div>

      {/* Grafik */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Pie Chart Kategori */}
        <div className="bg-white p-5 rounded-xl border">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>🥧</span> Distribusi Jenis ATK per Kategori
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={(entry: any) => `${entry.name} (${entry.value})`}>
                {pieData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart Stok per Kategori */}
        <div className="bg-white p-5 rounded-xl border">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📊</span> Total Stok per Kategori
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={kategoriData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => value?.toLocaleString('id-ID')} />
              <Bar dataKey="stok" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabel Nilai per Kategori */}
      <div className="bg-white p-5 rounded-xl border mb-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>💰</span> Nilai Inventaris per Kategori
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Kategori</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">Jenis</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">Total Stok</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700">Nilai (Rp)</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Persentase</th>
              </tr>
            </thead>
            <tbody>
              {kategoriData.map((k, i) => (
                <tr key={k.name} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                    {k.name}
                  </td>
                  <td className="px-4 py-2 text-center">{k.jenis}</td>
                  <td className="px-4 py-2 text-center">{k.stok.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatRupiah(k.nilai)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ 
                            width: `${totalNilai > 0 ? (k.nilai / totalNilai) * 100 : 0}%`,
                            backgroundColor: COLORS[i % COLORS.length]
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600 w-12 text-right">
                        {totalNilai > 0 ? ((k.nilai / totalNilai) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 bg-teal-50 font-bold">
                <td className="px-4 py-2">TOTAL</td>
                <td className="px-4 py-2 text-center">{totalJenis}</td>
                <td className="px-4 py-2 text-center">{totalStok.toLocaleString('id-ID')}</td>
                <td className="px-4 py-2 text-right">{formatRupiah(totalNilai)}</td>
                <td className="px-4 py-2 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Stok Menipis & Habis */}
      {(stokMenipis.length > 0 || stokHabis.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {stokMenipis.length > 0 && (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
              <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                <span>⚠️</span> Stok Menipis ({stokMenipis.length} item)
              </h4>
              <ul className="space-y-1">
                {stokMenipis.slice(0, 5).map(a => (
                  <li key={a.id} className="text-sm text-orange-900 flex justify-between">
                    <span>{a.nama}</span>
                    <span className="font-medium">{a.stok_tersedia} / {a.stok_minimum} {a.satuan}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {stokHabis.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                <span>🚫</span> Stok Habis ({stokHabis.length} item)
              </h4>
              <ul className="space-y-1">
                {stokHabis.slice(0, 5).map(a => (
                  <li key={a.id} className="text-sm text-red-900 flex justify-between">
                    <span>{a.nama}</span>
                    <span className="font-medium">0 {a.satuan}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tabel Detail Stok */}
      <div className="bg-white p-5 rounded-xl border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <span>📋</span> Detail Stok ATK
          </h3>
          <div className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="🔍 Cari nama/kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 flex-1"
            />
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option>Semua</option>
              {Object.keys(kategoriMap).map(k => <option key={k}>{k}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Kode</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Nama</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Kategori</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700">Stok</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Min</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700">Harga</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700">Nilai</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAtks.map(a => {
                const nilai = (a.stok_tersedia || 0) * (a.harga_satuan || 0);
                let statusBadge = 'bg-green-100 text-green-700';
                let statusText = 'Aman';
                if (a.stok_tersedia <= 0) { statusBadge = 'bg-red-100 text-red-700'; statusText = 'Habis'; }
                else if (a.stok_tersedia <= a.stok_minimum) { statusBadge = 'bg-orange-100 text-orange-700'; statusText = 'Menipis'; }
                return (
                  <tr key={a.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{a.kode}</td>
                    <td className="px-3 py-2 font-medium">{a.nama}</td>
                    <td className="px-3 py-2 text-xs">{a.kategori}</td>
                    <td className="px-3 py-2 text-center font-medium">{a.stok_tersedia} <span className="text-xs text-gray-500">{a.satuan}</span></td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500">{a.stok_minimum}</td>
                    <td className="px-3 py-2 text-right text-xs">{formatRupiah(a.harga_satuan)}</td>
                    <td className="px-3 py-2 text-right font-medium text-xs">{formatRupiah(nilai)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge}`}>{statusText}</span>
                    </td>
                  </tr>
                );
              })}
              {filteredAtks.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-gray-500 text-right">
          Menampilkan {filteredAtks.length} dari {totalJenis} item
        </div>
      </div>

      {/* Footer Laporan */}
      <div className="mt-6 text-center text-xs text-gray-500 print:block hidden">
        <p>Laporan ini digenerate otomatis oleh SIMATIK - PLN UP3 Sanggau</p>
        <p>Tanggal cetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        <p>Dicetak oleh: {user.nama} ({user.jabatan || user.role})</p>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          body { background: white !important; }
          aside, header { display: none !important; }
        }
      `}</style>
    </div>
  );
}