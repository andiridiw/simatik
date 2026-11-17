'use client';

import { getCurrentUser } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

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

export default function StockOpnamePage() {
  const [user, setUser] = useState<any>(null);
  const [atks, setAtks] = useState<ATK[]>([]);
  const [editedStocks, setEditedStocks] = useState<{ [key: string]: number }>({});
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userData = getCurrentUser();
    if (userData) setUser(userData);
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'atks'), (snapshot) => {
      setAtks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ATK[]);
    });
    return () => unsubscribe();
  }, []);

  const handleStockChange = (id: string, value: number) => {
    setEditedStocks(prev => ({ ...prev, [id]: value }));
  };

  const saveAll = async () => {
    const changedItems = Object.keys(editedStocks).filter(id => {
      const atk = atks.find(a => a.id === id);
      return atk && atk.stok_tersedia !== editedStocks[id];
    });

    if (changedItems.length === 0) {
      alert('Tidak ada perubahan stok!');
      return;
    }

    if (!confirm(`Simpan perubahan stok untuk ${changedItems.length} item?`)) return;

    setLoading(true);
    try {
      const promises = changedItems.map(id =>
        updateDoc(doc(db, 'atks', id), {
          stok_tersedia: editedStocks[id],
          updated_at: new Date(),
        })
      );
      await Promise.all(promises);
      alert(`✅ Berhasil update stok untuk ${changedItems.length} item!`);
      setEditedStocks({});
    } catch (error) {
      alert('Gagal update stok: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetChanges = () => {
    if (confirm('Batalkan semua perubahan?')) {
      setEditedStocks({});
    }
  };

  const totalChanged = Object.keys(editedStocks).filter(id => {
    const atk = atks.find(a => a.id === id);
    return atk && atk.stok_tersedia !== editedStocks[id];
  }).length;

  const kategoriList = Array.from(new Set(atks.map(a => a.kategori || 'Lainnya')));

  const filteredAtks = atks.filter(a => {
    const matchKategori = filterKategori === 'Semua' || a.kategori === filterKategori;
    const matchSearch = a.nama.toLowerCase().includes(search.toLowerCase()) ||
                       a.kode.toLowerCase().includes(search.toLowerCase());
    const matchChanged = !showOnlyChanged || editedStocks[a.id] !== undefined;
    return matchKategori && matchSearch && matchChanged;
  });

  if (!user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📋 Stock Opname</h2>
          <p className="text-sm text-gray-500 mt-1">Input stok fisik gudang dengan cepat — edit langsung di tabel</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetChanges}
            disabled={totalChanged === 0}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50"
          >
            🔄 Reset
          </button>
          <button
            onClick={saveAll}
            disabled={totalChanged === 0 || loading}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-medium disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : `💾 Simpan (${totalChanged})`}
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-teal-50 to-blue-50 border-l-4 border-teal-500 p-4 mb-4 rounded">
        <p className="text-sm text-teal-800">
          <strong>⚡ Cara Cepat:</strong> Ketik stok fisik langsung di kolom <strong>"Stok Fisik"</strong>. 
          Kolom yang berubah akan <strong>highlight kuning</strong>. Klik <strong>"💾 Simpan"</strong> untuk update semua sekaligus.
        </p>
      </div>

      {/* Info Box */}
      {totalChanged > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-4 rounded flex justify-between items-center">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Ada {totalChanged} item</strong> yang stoknya berubah dan belum disimpan
          </p>
          <button onClick={saveAll} className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600">
            Simpan Sekarang
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-4 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="🔍 Cari nama/kode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
        />
        <select
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
          className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option>Semua</option>
          {kategoriList.map(k => <option key={k}>{k}</option>)}
        </select>
        <label className="flex items-center gap-2 px-3 py-2">
          <input
            type="checkbox"
            checked={showOnlyChanged}
            onChange={(e) => setShowOnlyChanged(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-700">Tampilkan yang berubah saja</span>
        </label>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white p-3 rounded-lg shadow">
          <p className="text-xs text-gray-500">Total Item</p>
          <p className="text-xl font-bold text-teal-600">{atks.length}</p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow">
          <p className="text-xs text-gray-500">Sudah Dicek</p>
          <p className="text-xl font-bold text-blue-600">{Object.keys(editedStocks).length}</p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow">
          <p className="text-xs text-gray-500">Berubah</p>
          <p className="text-xl font-bold text-yellow-600">{totalChanged}</p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow">
          <p className="text-xs text-gray-500">Belum Dicek</p>
          <p className="text-xl font-bold text-gray-600">{atks.length - Object.keys(editedStocks).length}</p>
        </div>
      </div>

      {/* Tabel Stock Opname */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Kode</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Nama Barang</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Kategori</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700">Stok Sistem</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-teal-700 bg-teal-50">Stok Fisik</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700">Selisih</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAtks.map((atk) => {
                const stokFisik = editedStocks[atk.id] !== undefined ? editedStocks[atk.id] : atk.stok_tersedia;
                const selisih = stokFisik - atk.stok_tersedia;
                const isChanged = editedStocks[atk.id] !== undefined && atk.stok_tersedia !== editedStocks[atk.id];
                const isEdited = editedStocks[atk.id] !== undefined;

                let statusBadge = 'bg-green-100 text-green-700';
                let statusText = 'Sesuai';
                if (stokFisik <= 0) { statusBadge = 'bg-red-100 text-red-700'; statusText = 'Habis'; }
                else if (stokFisik <= atk.stok_minimum) { statusBadge = 'bg-orange-100 text-orange-700'; statusText = 'Menipis'; }

                return (
                  <tr 
                    key={atk.id} 
                    className={`border-t transition ${
                      isChanged ? 'bg-yellow-50' : isEdited ? 'bg-green-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-2 text-xs font-mono">{atk.kode}</td>
                    <td className="px-3 py-2 text-sm font-medium">{atk.nama}</td>
                    <td className="px-3 py-2 text-xs">{atk.kategori}</td>
                    <td className="px-3 py-2 text-center text-sm text-gray-600">
                      {atk.stok_tersedia} <span className="text-xs text-gray-400">{atk.satuan}</span>
                    </td>
                    <td className="px-3 py-2 text-center bg-teal-50">
                      <input
                        type="number"
                        value={stokFisik}
                        onChange={(e) => handleStockChange(atk.id, Number(e.target.value))}
                        className={`w-20 px-2 py-1 border rounded text-center text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500 ${
                          isChanged ? 'border-yellow-500 bg-yellow-100' : 'border-teal-300'
                        }`}
                        min="0"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      {selisih !== 0 ? (
                        <span className={`text-sm font-bold ${selisih > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {selisih > 0 ? '+' : ''}{selisih}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge}`}>
                        {statusText}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredAtks.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500 text-right">
        Menampilkan {filteredAtks.length} dari {atks.length} item
      </div>
    </div>
  );
}