'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
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

export default function InputStockPage() {
  const [user, setUser] = useState<any>(null);
  const [atks, setAtks] = useState<ATK[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  const [formData, setFormData] = useState({
    kode: '',
    nama: '',
    kategori: 'Alat Tulis',
    satuan: 'buah',
    stok_tersedia: 0,
    stok_minimum: 10,
    harga_satuan: 0,
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSave = {
        kode: formData.kode,
        nama: formData.nama,
        kategori: formData.kategori,
        satuan: formData.satuan,
        stok_tersedia: Number(formData.stok_tersedia),
        stok_minimum: Number(formData.stok_minimum),
        harga_satuan: Number(formData.harga_satuan),
        aktif: true,
        updated_at: new Date(),
      };

      if (editId) {
        await updateDoc(doc(db, 'atks', editId), dataToSave);
        alert('✅ ATK berhasil diupdate!');
      } else {
        await addDoc(collection(db, 'atks'), { ...dataToSave, created_at: new Date() });
        alert('✅ ATK baru berhasil ditambahkan!');
      }
      resetForm();
    } catch (error) {
      alert('Gagal menyimpan: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (atk: ATK) => {
    setFormData({
      kode: atk.kode,
      nama: atk.nama,
      kategori: atk.kategori,
      satuan: atk.satuan,
      stok_tersedia: atk.stok_tersedia,
      stok_minimum: atk.stok_minimum,
      harga_satuan: atk.harga_satuan,
    });
    setEditId(atk.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ kode: '', nama: '', kategori: 'Alat Tulis', satuan: 'buah', stok_tersedia: 0, stok_minimum: 10, harga_satuan: 0 });
    setEditId(null);
    setShowForm(false);
  };

  const filteredAtks = atks.filter(a => 
    a.nama.toLowerCase().includes(search.toLowerCase()) || 
    a.kode.toLowerCase().includes(search.toLowerCase())
  );

  if (!user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📥 Input Stok ATK</h2>
          <p className="text-sm text-gray-500 mt-1">Tambah atau update stok ATK secara manual</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-medium">
          + Tambah ATK Baru
        </button>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Informasi:</strong> Gunakan menu ini untuk <strong>menambah ATK baru</strong> yang belum ada di sistem, 
          atau <strong>update stok manual</strong> untuk ATK yang sudah ada.
        </p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <input
          type="text"
          placeholder="🔍 Cari nama atau kode ATK..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
        />
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
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Min</th>
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
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      atk.stok_tersedia <= 0 ? 'bg-red-100 text-red-700' :
                      atk.stok_tersedia <= atk.stok_minimum ? 'bg-orange-100 text-orange-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {atk.stok_tersedia} {atk.satuan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">{atk.stok_minimum}</td>
                  <td className="px-4 py-3 text-right text-sm">Rp {atk.harga_satuan.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleEdit(atk)} className="text-teal-600 hover:text-teal-800 text-sm">✏️ Edit</button>
                  </td>
                </tr>
              ))}
              {filteredAtks.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Tidak ada data</td></tr>
              )}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode</label>
                  <input type="text" value={formData.kode} onChange={(e) => setFormData({ ...formData, kode: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                  <input type="text" value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select value={formData.kategori} onChange={(e) => setFormData({ ...formData, kategori: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
                    <option>Alat Tulis</option>
                    <option>Kertas</option>
                    <option>Map</option>
                    <option>Amplop</option>
                    <option>Baterai</option>
                    <option>Tinta</option>
                    <option>Elektronik</option>
                    <option>Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                  <input type="text" value={formData.satuan} onChange={(e) => setFormData({ ...formData, satuan: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stok</label>
                    <input type="number" value={formData.stok_tersedia} onChange={(e) => setFormData({ ...formData, stok_tersedia: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min. Stok</label>
                    <input type="number" value={formData.stok_minimum} onChange={(e) => setFormData({ ...formData, stok_minimum: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga Satuan (Rp)</label>
                  <input type="number" value={formData.harga_satuan} onChange={(e) => setFormData({ ...formData, harga_satuan: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500" required />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={loading} className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium">
                    {loading ? 'Menyimpan...' : 'Simpan'}
                  </button>
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