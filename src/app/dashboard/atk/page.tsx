'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

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

export default function ATKPage() {
  const [atks, setAtks] = useState<ATK[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');

  const [formData, setFormData] = useState({
    kode: '', nama: '', kategori: 'Alat Tulis', satuan: 'buah',
    stok_tersedia: 0, stok_minimum: 10, harga_satuan: 0, aktif: true,
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'atks'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ATK[];
      setAtks(data);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSend = {
        kode: formData.kode, nama: formData.nama, kategori: formData.kategori, satuan: formData.satuan,
        stok_tersedia: Number(formData.stok_tersedia), stok_minimum: Number(formData.stok_minimum),
        harga_satuan: Number(formData.harga_satuan), aktif: true,
      };
      if (editId) { await updateDoc(doc(db, 'atks', editId), dataToSend); alert('ATK berhasil diupdate!'); } 
      else { await addDoc(collection(db, 'atks'), dataToSend); alert('ATK berhasil ditambahkan!'); }
      resetForm();
    } catch (error) { alert('Gagal menyimpan data'); } finally { setLoading(false); }
  };

  const handleEdit = (atk: ATK) => {
    setFormData({ kode: atk.kode, nama: atk.nama, kategori: atk.kategori, satuan: atk.satuan,
      stok_tersedia: Number(atk.stok_tersedia), stok_minimum: Number(atk.stok_minimum),
      harga_satuan: Number(atk.harga_satuan), aktif: atk.aktif });
    setEditId(atk.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus ATK ini?')) {
      try { await deleteDoc(doc(db, 'atks', id)); alert('ATK berhasil dihapus!'); } catch (error) { alert('Gagal menghapus data'); }
    }
  };

  const resetForm = () => {
    setFormData({ kode: '', nama: '', kategori: 'Alat Tulis', satuan: 'buah', stok_tersedia: 0, stok_minimum: 10, harga_satuan: 0, aktif: true });
    setEditId(null); setShowForm(false);
  };

  const getStokBadge = (stok: number, minimum: number) => {
    if (stok <= 0) return 'bg-red-100 text-red-700';
    if (stok <= minimum) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const formatRupiah = (angka: number) => 'Rp ' + angka.toLocaleString('id-ID');

  const filteredAtks = atks.filter((atk) => {
    const matchSearch = atk.nama.toLowerCase().includes(search.toLowerCase()) || atk.kode.toLowerCase().includes(search.toLowerCase());
    const matchKategori = filterKategori === 'Semua' || atk.kategori === filterKategori;
    return matchSearch && matchKategori;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">📦 Master Data ATK</h2>
        <button onClick={() => setShowForm(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium">+ Tambah ATK</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Total Jenis ATK</p><p className="text-2xl font-bold text-blue-600">{atks.length}</p></div>
        <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Stok Menipis</p><p className="text-2xl font-bold text-yellow-600">{atks.filter(a => a.stok_tersedia <= a.stok_minimum && a.stok_tersedia > 0).length}</p></div>
        <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Stok Habis</p><p className="text-2xl font-bold text-red-600">{atks.filter(a => a.stok_tersedia <= 0).length}</p></div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4 flex flex-col md:flex-row gap-3">
        <input type="text" placeholder="🔍 Cari nama atau kode ATK..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" />
        <select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)} className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500">
          <option>Semua</option><option>Alat Tulis</option><option>Kertas</option><option>Map</option><option>Amplop</option><option>Baterai</option><option>Tinta</option><option>Elektronik</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kode</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kategori</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Stok</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Harga</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredAtks.map((atk) => (
                <tr key={atk.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{atk.kode}</td>
                  <td className="px-4 py-3 text-sm font-medium">{atk.nama}</td>
                  <td className="px-4 py-3 text-sm">{atk.kategori}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStokBadge(atk.stok_tersedia, atk.stok_minimum)}`}>{atk.stok_tersedia} {atk.satuan}</span></td>
                  <td className="px-4 py-3 text-right text-sm">{formatRupiah(atk.harga_satuan)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleEdit(atk)} className="text-blue-600 hover:text-blue-800 mx-1 text-sm">✏️ Edit</button>
                    <button onClick={() => handleDelete(atk.id)} className="text-red-600 hover:text-red-800 mx-1 text-sm">🗑️ Hapus</button>
                  </td>
                </tr>
              ))}
              {filteredAtks.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">{editId ? '✏️ Edit ATK' : '➕ Tambah ATK Baru'}</h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Kode</label><input type="text" value={formData.kode} onChange={(e) => setFormData({ ...formData, kode: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama</label><input type="text" value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label><select value={formData.kategori} onChange={(e) => setFormData({ ...formData, kategori: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500"><option>Alat Tulis</option><option>Kertas</option><option>Map</option><option>Amplop</option><option>Baterai</option><option>Tinta</option><option>Elektronik</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label><input type="text" value={formData.satuan} onChange={(e) => setFormData({ ...formData, satuan: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Stok</label><input type="number" value={formData.stok_tersedia} onChange={(e) => setFormData({ ...formData, stok_tersedia: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Min. Stok</label><input type="number" value={formData.stok_minimum} onChange={(e) => setFormData({ ...formData, stok_minimum: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" required /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Harga Satuan (Rp)</label><input type="number" value={formData.harga_satuan} onChange={(e) => setFormData({ ...formData, harga_satuan: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" required /></div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={loading} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">{loading ? 'Menyimpan...' : 'Simpan'}</button>
                  <button type="button" onClick={resetForm} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300">Batal</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}