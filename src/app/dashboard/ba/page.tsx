'use client';

import { getCurrentUser } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { formatTanggal } from '@/lib/helpers';
import { useRouter } from 'next/navigation';

interface BA {
  id: string;
  nomor: string;
  nomor_permohonan: string;
  nama_penerima: string;
  divisi: string;
  nip_penerima: string;
  tanggal_serah_terima: any;
  items: { nama: string; jumlah: number; satuan: string; diterima: number }[];
  catatan: string;
  status: string;
  tanda_terima: string;
  nama_penyerah: string;
  jabatan_penyerah: string;
  created_at: any;
}

interface Permohonan {
  id: string;
  nomor: string;
  nama_pemohon: string;
  divisi: string;
  nip_pemohon: string;
  items: any[];
  status: string;
}

export default function BASerahTerimaPage() {
  const [user, setUser] = useState<any>(null);
  const [bas, setBas] = useState<BA[]>([]);
  const [permohonans, setPermohonans] = useState<Permohonan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<BA | null>(null);
  const [filterStatus, setFilterStatus] = useState('semua');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    permohonan_id: '',
    catatan: '',
    tanda_terima: '',
    nama_penyerah: '',
    jabatan_penyerah: '',
    items: [] as { nama: string; jumlah: number; satuan: string; diterima: number }[],
  });

  useEffect(() => {
    const userData = getCurrentUser();
    if (userData) setUser(userData);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubBA = onSnapshot(collection(db, 'ba_serah_terima'), (snap) => {
      setBas(snap.docs.map(d => ({ id: d.id, ...d.data() })) as BA[]);
    });

    const unsubPerm = onSnapshot(
      query(collection(db, 'permohonans'), where('status', 'in', ['approved', 'delivered'])),
      (snap) => {
        setPermohonans(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Permohonan[]);
      }
    );

    return () => { unsubBA(); unsubPerm(); };
  }, [user]);

  // ✅ FIX: Ambil nama barang dari berbagai kemungkinan field
  const getNamaBarang = (item: any): string => {
    return item.nama || item.atk_nama || item.nama_barang || item.nama_atk || 'Barang ATK';
  };

  const getSatuan = (item: any): string => {
    return item.satuan || 'buah';
  };

  const getJumlah = (item: any): number => {
    return Number(item.jumlah) || 0;
  };

  const handleSelectPermohonan = (permohonanId: string) => {
    const perm = permohonans.find(p => p.id === permohonanId);
    if (perm) {
      setFormData({
        permohonan_id: permohonanId,
        catatan: '',
        tanda_terima: '',
        nama_penyerah: user?.nama || '',
        jabatan_penyerah: user?.jabatan || user?.role || 'Admin',
        items: (perm.items || []).map((item: any) => ({
          nama: getNamaBarang(item),
          jumlah: getJumlah(item),
          satuan: getSatuan(item),
          diterima: getJumlah(item),
        })),
      });
    }
  };

  const updateItemDiterima = (index: number, value: number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], diterima: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.permohonan_id) {
      alert('Pilih permohonan terlebih dahulu!');
      return;
    }
    if (!formData.tanda_terima.trim()) {
      alert('Nama penerima wajib diisi!');
      return;
    }

    setLoading(true);
    try {
      const perm = permohonans.find(p => p.id === formData.permohonan_id);
      if (!perm) throw new Error('Permohonan tidak ditemukan');

      const now = new Date();
      const tahun = now.getFullYear();
      const bulan = now.getMonth() + 1;
      const nomorBA = `BA/${String(bas.length + 1).padStart(4, '0')}/${perm.divisi || 'UMUM'}/${bulan}/${tahun}`;

      const dataToSave = {
        nomor: nomorBA,
        nomor_permohonan: perm.nomor || '-',
        nama_penerima: perm.nama_pemohon || 'Unknown',
        divisi: perm.divisi || 'UMUM',
        nip_penerima: perm.nip_pemohon || '-',
        tanggal_serah_terima: new Date(),
        items: formData.items.map(item => ({
          nama: item.nama || 'Barang ATK',
          jumlah: Number(item.jumlah) || 0,
          satuan: item.satuan || 'buah',
          diterima: Number(item.diterima) || 0,
        })),
        catatan: formData.catatan || '-',
        status: 'completed',
        tanda_terima: formData.tanda_terima || '-',
        nama_penyerah: formData.nama_penyerah || user?.nama || 'Admin',
        jabatan_penyerah: formData.jabatan_penyerah || user?.jabatan || 'Admin',
        created_by: user?.nama || 'Unknown',
        created_at: new Date(),
        updated_at: new Date(),
      };

      console.log('💾 Data BA yang akan disimpan:', dataToSave);

      await addDoc(collection(db, 'ba_serah_terima'), dataToSave);

      await updateDoc(doc(db, 'permohonans', perm.id), {
        status: 'delivered',
        updated_at: new Date(),
      });

      alert(`✅ BA Serah Terima berhasil dibuat!\n\nNomor: ${nomorBA}`);
      resetForm();
    } catch (error) {
      console.error('❌ Error detail:', error);
      alert('Gagal membuat BA: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ permohonan_id: '', catatan: '', tanda_terima: '', nama_penyerah: '', jabatan_penyerah: '', items: [] });
    setShowForm(false);
  };

  const filteredBA = filterStatus === 'semua' ? bas : bas.filter(b => b.status === filterStatus);

  if (!user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📤 BA Serah Terima</h2>
          <p className="text-sm text-gray-500 mt-1">Dokumentasi serah terima ATK kepada pemohon</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-medium"
        >
          + Buat BA Baru
        </button>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Informasi:</strong> BA Serah Terima dibuat berdasarkan permohonan yang sudah <strong>disetujui (approved)</strong>. 
          Setelah BA dibuat, status permohonan akan berubah menjadi <strong>"Diserahkan"</strong>.
        </p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <label className="text-sm font-medium text-gray-700 mr-2">Filter Status:</label>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
          <option value="semua">Semua Status</option>
          <option value="completed">Selesai</option>
          <option value="pending">Menunggu</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total BA</p>
          <p className="text-2xl font-bold text-teal-600">{bas.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Permohonan Tersedia</p>
          <p className="text-2xl font-bold text-blue-600">{permohonans.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Bulan Ini</p>
          <p className="text-2xl font-bold text-purple-600">
            {bas.filter(b => {
              if (!b.tanggal_serah_terima) return false;
              const d = b.tanggal_serah_terima.toDate ? b.tanggal_serah_terima.toDate() : new Date(b.tanggal_serah_terima);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nomor BA</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No. Permohonan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Penerima</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Divisi</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tanggal</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredBA.map((ba) => (
                <tr key={ba.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-teal-700">{ba.nomor}</td>
                  <td className="px-4 py-3 text-sm font-mono text-blue-700">{ba.nomor_permohonan}</td>
                  <td className="px-4 py-3 text-sm font-medium">{ba.nama_penerima}</td>
                  <td className="px-4 py-3 text-sm">{ba.divisi}</td>
                  <td className="px-4 py-3 text-sm">{formatTanggal(ba.tanggal_serah_terima)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ba.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {ba.status === 'completed' ? 'Selesai' : 'Menunggu'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center space-x-2">
                    <button onClick={() => setShowDetail(ba)} className="text-teal-600 hover:text-teal-800 text-sm">
                      👁️ Detail
                    </button>
                    <button 
                      onClick={() => router.push(`/dashboard/ba/print?id=${ba.id}`)} 
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      🖨️ Cetak
                    </button>
                  </td>
                </tr>
              ))}
              {filteredBA.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">Belum ada BA Serah Terima</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">📤 Buat BA Serah Terima Baru</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pilih Permohonan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.permohonan_id}
                    onChange={(e) => handleSelectPermohonan(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  >
                    <option value="">-- Pilih Permohonan --</option>
                    {permohonans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nomor} - {p.nama_pemohon} ({p.divisi})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Hanya permohonan berstatus "Disetujui" yang muncul</p>
                </div>

                {formData.items.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Daftar Barang</label>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                      {formData.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 bg-white p-2 rounded">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.nama}</p>
                            <p className="text-xs text-gray-500">Diminta: {item.jumlah} {item.satuan}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Diterima:</label>
                            <input
                              type="number"
                              value={item.diterima}
                              onChange={(e) => updateItemDiterima(index, Number(e.target.value))}
                              className="w-20 px-2 py-1 border rounded text-sm"
                              min="0"
                              max={item.jumlah}
                            />
                            <span className="text-xs text-gray-600">{item.satuan}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Penerima (Tanda Terima) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tanda_terima}
                    onChange={(e) => setFormData({ ...formData, tanda_terima: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Nama lengkap penerima"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Penyerah</label>
                    <input
                      type="text"
                      value={formData.nama_penyerah}
                      onChange={(e) => setFormData({ ...formData, nama_penyerah: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Nama yang menyerahkan"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan Penyerah</label>
                    <input
                      type="text"
                      value={formData.jabatan_penyerah}
                      onChange={(e) => setFormData({ ...formData, jabatan_penyerah: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Jabatan"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                  <textarea
                    value={formData.catatan}
                    onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    rows={2}
                    placeholder="Catatan tambahan (opsional)"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Menyimpan...' : 'Buat BA'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">Detail BA Serah Terima</h3>
                <button onClick={() => setShowDetail(null)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>

              <div className="bg-gradient-to-r from-teal-50 to-teal-100 p-4 rounded-lg mb-4 border-l-4 border-teal-600">
                <p className="text-lg font-bold text-teal-800">{showDetail.nomor}</p>
                <p className="text-sm text-teal-700">Berita Acara Serah Terima ATK</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Nomor Permohonan</p>
                    <p className="font-medium text-blue-700">{showDetail.nomor_permohonan}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Tanggal Serah Terima</p>
                    <p className="font-medium">{formatTanggal(showDetail.tanggal_serah_terima)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Penerima</p>
                    <p className="font-medium">{showDetail.nama_penerima}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Divisi</p>
                    <p className="font-medium">{showDetail.divisi}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">NIP</p>
                    <p className="font-medium">{showDetail.nip_penerima}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      showDetail.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {showDetail.status === 'completed' ? 'Selesai' : 'Menunggu'}
                    </span>
                  </div>
                </div>
              </div>

              <h4 className="font-bold mb-2">📦 Daftar Barang yang Diserahkan:</h4>
              <table className="w-full mb-4 text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left border">No</th>
                    <th className="px-3 py-2 text-left border">Nama Barang</th>
                    <th className="px-3 py-2 text-center border">Jumlah</th>
                    <th className="px-3 py-2 text-left border">Satuan</th>
                    <th className="px-3 py-2 text-center border">Diterima</th>
                  </tr>
                </thead>
                <tbody>
                  {showDetail.items.map((item, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-3 py-2 border">{i + 1}</td>
                      <td className="px-3 py-2 border font-medium">{item.nama}</td>
                      <td className="px-3 py-2 border text-center">{item.jumlah}</td>
                      <td className="px-3 py-2 border">{item.satuan}</td>
                      <td className="px-3 py-2 border text-center font-bold text-teal-700">{item.diterima}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {showDetail.catatan && showDetail.catatan !== '-' && (
                <div className="bg-yellow-50 p-3 rounded-lg mb-4">
                  <p className="text-sm font-medium text-yellow-800">📝 Catatan:</p>
                  <p className="text-sm text-yellow-700">{showDetail.catatan}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Yang Menyerahkan</p>
                  <p className="font-bold text-blue-900">{showDetail.nama_penyerah || '-'}</p>
                  <p className="text-xs text-blue-700">{showDetail.jabatan_penyerah || '-'}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Yang Menerima</p>
                  <p className="font-bold text-green-900">{showDetail.tanda_terima}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => router.push(`/dashboard/ba/print?id=${showDetail.id}`)} 
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  🖨️ Cetak BA
                </button>
                <button onClick={() => setShowDetail(null)} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}