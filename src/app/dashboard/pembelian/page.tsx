'use client';

import { getCurrentUser } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { formatTanggal } from '@/lib/helpers';
import { useRouter } from 'next/navigation';

interface PO {
  id: string;
  nomor: string;
  tanggal_po: any;
  items: { nama: string; jumlah: number; satuan: string; harga: number; total: number; kategori: string }[];
  total_nilai: number;
  status: string;
  nama_tl: string;
  jabatan_tl: string;
  nama_admin: string;
  catatan: string;
  created_at: any;
}

interface ATK {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  satuan: string;
  harga_satuan: number;
}

export default function PembelianPage() {
  const [user, setUser] = useState<any>(null);
  const [pos, setPos] = useState<PO[]>([]);
  const [atks, setAtks] = useState<ATK[]>([]);
  const [tlData, setTlData] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<PO | null>(null);
  const [filterStatus, setFilterStatus] = useState('semua');
  const [loading, setLoading] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<{ [key: number]: ATK[] }>({});
  const router = useRouter();

  const [formData, setFormData] = useState({
    catatan: '',
    items: [] as { nama: string; jumlah: number; satuan: string; harga: number; total: number; kategori: string }[],
  });

  useEffect(() => {
    const userData = getCurrentUser();
    if (userData) setUser(userData);
  }, []);

  useEffect(() => {
    const fetchTL = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', 'andi.maulana'));
        if (docSnap.exists()) setTlData(docSnap.data());
      } catch (error) { console.error('Error fetch TL:', error); }
    };
    fetchTL();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubPO = onSnapshot(collection(db, 'pembelian'), (snap) => {
      setPos(snap.docs.map(d => ({ id: d.id, ...d.data() })) as PO[]);
    });
    const unsubAtk = onSnapshot(collection(db, 'atks'), (snap) => {
      setAtks(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ATK[]);
    });
    return () => { unsubPO(); unsubAtk(); };
  }, [user]);

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { nama: '', jumlah: 1, satuan: 'buah', harga: 0, total: 0, kategori: 'Alat Tulis' }],
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'jumlah' || field === 'harga') {
      newItems[index].total = newItems[index].jumlah * newItems[index].harga;
    }
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
    setSearchSuggestions(prev => {
      const newSuggestions = { ...prev };
      delete newSuggestions[index];
      return newSuggestions;
    });
  };

  // ✅ FITUR AUTOCOMPLETE: Cari saran nama barang
  const handleNamaChange = (index: number, value: string) => {
    updateItem(index, 'nama', value);
    
    if (value.trim().length > 0) {
      const suggestions = atks.filter(atk => 
        atk.nama.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setSearchSuggestions(prev => ({ ...prev, [index]: suggestions }));
    } else {
      setSearchSuggestions(prev => {
        const newSuggestions = { ...prev };
        delete newSuggestions[index];
        return newSuggestions;
      });
    }
  };

  // ✅ PILIH SARAN: Auto-fill data dari stok
  const selectSuggestion = (index: number, atk: ATK) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      nama: atk.nama,
      kategori: atk.kategori,
      satuan: atk.satuan,
      harga: atk.harga_satuan,
      total: atk.harga_satuan * newItems[index].jumlah,
    };
    setFormData({ ...formData, items: newItems });
    setSearchSuggestions(prev => {
      const newSuggestions = { ...prev };
      delete newSuggestions[index];
      return newSuggestions;
    });
  };

  const totalNilai = formData.items.reduce((sum, item) => sum + item.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) { alert('Tambahkan minimal 1 item!'); return; }
    if (formData.items.some(i => !i.nama.trim())) { alert('Nama barang wajib diisi!'); return; }
    if (formData.items.some(i => i.harga <= 0)) { alert('Harga satuan wajib diisi!'); return; }

    setLoading(true);
    try {
      const now = new Date();
      const tahun = now.getFullYear();
      const bulan = now.getMonth() + 1;
      const nomorPO = `PO/${String(pos.length + 1).padStart(4, '0')}/ATK/${bulan}/${tahun}`;

      const dataToSave = {
        nomor: nomorPO,
        tanggal_po: new Date(),
        items: formData.items,
        total_nilai: totalNilai,
        status: 'draft',
        nama_tl: tlData?.nama || 'Andi R Maulana',
        jabatan_tl: tlData?.jabatan || 'Team Leader Administrasi dan Umum',
        nama_admin: user?.nama || 'Admin',
        catatan: formData.catatan,
        created_by: user?.username || 'unknown',
        created_at: new Date(),
        updated_at: new Date(),
      };

      await addDoc(collection(db, 'pembelian'), dataToSave);

      alert(`✅ Purchase Order berhasil dibuat!\n\nNomor: ${nomorPO}\nTotal: Rp ${totalNilai.toLocaleString('id-ID')}`);
      resetForm();
    } catch (error) {
      alert('Gagal membuat PO: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (po: PO, newStatus: string) => {
    if (newStatus === 'received') {
      if (!confirm('Konfirmasi barang diterima? Stok akan otomatis ditambahkan.')) return;
      
      setLoading(true);
      try {
        for (const item of po.items) {
          const atksRef = collection(db, 'atks');
          const { getDocs, query, where } = await import('firebase/firestore');
          const querySnapshot = await getDocs(query(atksRef, where('nama', '==', item.nama)));
          
          if (!querySnapshot.empty) {
            const atkDoc = querySnapshot.docs[0];
            const currentStok = atkDoc.data().stok_tersedia || 0;
            await updateDoc(doc(db, 'atks', atkDoc.id), {
              stok_tersedia: currentStok + item.jumlah,
              updated_at: new Date(),
            });
          } else {
            await addDoc(collection(db, 'atks'), {
              kode: `ATK-${String(Math.floor(Math.random() * 9000) + 1000)}`,
              nama: item.nama,
              kategori: item.kategori || 'Alat Tulis',
              satuan: item.satuan,
              stok_tersedia: item.jumlah,
              stok_minimum: 10,
              harga_satuan: item.harga,
              aktif: true,
              created_at: new Date(),
            });
          }
        }

        await updateDoc(doc(db, 'pembelian', po.id), {
          status: newStatus,
          updated_at: new Date(),
        });

        alert(`✅ Barang diterima! Stok otomatis ditambahkan.`);
      } catch (error) {
        alert('Gagal update status: ' + (error as Error).message);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await updateDoc(doc(db, 'pembelian', po.id), {
          status: newStatus,
          updated_at: new Date(),
        });
        alert(`Status diubah menjadi: ${newStatus}`);
      } catch (error) {
        alert('Gagal update status');
      }
    }
  };

  const resetForm = () => {
    setFormData({ catatan: '', items: [] });
    setSearchSuggestions({});
    setShowForm(false);
  };

  const formatRupiah = (angka: number) => 'Rp ' + angka.toLocaleString('id-ID');
  const filteredPO = filterStatus === 'semua' ? pos : pos.filter(p => p.status === filterStatus);

  if (!user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🛒 Pembelian (Purchase Order)</h2>
          <p className="text-sm text-gray-500 mt-1">Kelola pembelian ATK berdasarkan evaluasi Admin/TL</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-medium">
          + Buat PO Baru
        </button>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Informasi:</strong> Purchase Order dibuat berdasarkan <strong>evaluasi Admin/TL</strong>, tidak terikat permohonan. 
          Nama barang bisa <strong>dipilih dari stok yang ada</strong> (auto-fill) atau <strong>ketik nama baru</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total PO</p>
          <p className="text-2xl font-bold text-teal-600">{pos.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Nilai PO</p>
          <p className="text-xl font-bold text-purple-600">{formatRupiah(pos.reduce((s, p) => s + (p.total_nilai || 0), 0))}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Menunggu Approval</p>
          <p className="text-2xl font-bold text-orange-600">{pos.filter(p => p.status === 'draft').length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Bulan Ini</p>
          <p className="text-2xl font-bold text-blue-600">
            {pos.filter(p => {
              if (!p.tanggal_po) return false;
              const d = p.tanggal_po.toDate ? p.tanggal_po.toDate() : new Date(p.tanggal_po);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length}
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <label className="text-sm font-medium text-gray-700 mr-2">Filter Status:</label>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
          <option value="semua">Semua Status</option>
          <option value="draft">Draft</option>
          <option value="ordered">Dipesan</option>
          <option value="received">Diterima</option>
          <option value="completed">Selesai</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nomor PO</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tanggal</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Dibuat Oleh</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Nilai</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredPO.map((po) => {
                const statusMap: Record<string, { label: string; color: string }> = {
                  'draft': { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
                  'ordered': { label: 'Dipesan', color: 'bg-blue-100 text-blue-700' },
                  'received': { label: 'Diterima', color: 'bg-green-100 text-green-700' },
                  'completed': { label: 'Selesai', color: 'bg-purple-100 text-purple-700' },
                };
                const badge = statusMap[po.status] || statusMap['draft'];
                return (
                  <tr key={po.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-teal-700">{po.nomor}</td>
                    <td className="px-4 py-3 text-sm">{formatTanggal(po.tanggal_po)}</td>
                    <td className="px-4 py-3 text-sm font-medium">{po.nama_admin}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-purple-700">{formatRupiah(po.total_nilai || 0)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <button onClick={() => setShowDetail(po)} className="text-teal-600 hover:text-teal-800 text-sm">👁️ Detail</button>
                      <button onClick={() => router.push(`/dashboard/pembelian/print?id=${po.id}`)} className="text-blue-600 hover:text-blue-800 text-sm">🖨️ Cetak</button>
                      {po.status === 'draft' && (
                        <button onClick={() => handleUpdateStatus(po, 'ordered')} className="text-orange-600 hover:text-orange-800 text-sm">📤 Pesan</button>
                      )}
                      {po.status === 'ordered' && (
                        <button onClick={() => handleUpdateStatus(po, 'received')} className="text-green-600 hover:text-green-800 text-sm">✅ Terima</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredPO.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Belum ada Purchase Order</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">🛒 Buat Purchase Order Baru</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-700"><strong>Penandatangan PO:</strong></p>
                  <p className="text-sm font-bold text-blue-900">{tlData?.nama || 'Andi R Maulana'}</p>
                  <p className="text-xs text-blue-700">{tlData?.jabatan || 'Team Leader Administrasi dan Umum'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Daftar Barang</label>
                  <div className="space-y-2">
                    {formData.items.map((item, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded border">
                        <div className="grid grid-cols-12 gap-2 items-start">
                          {/* Nama Barang dengan Autocomplete */}
                          <div className="col-span-4 relative">
                            <input
                              type="text"
                              value={item.nama}
                              onChange={(e) => handleNamaChange(index, e.target.value)}
                              placeholder="Ketik nama barang..."
                              className="w-full px-2 py-1 border rounded text-sm"
                              required
                            />
                            {/* Dropdown Saran */}
                            {searchSuggestions[index] && searchSuggestions[index].length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
                                {searchSuggestions[index].map(atk => (
                                  <button
                                    key={atk.id}
                                    type="button"
                                    onClick={() => selectSuggestion(index, atk)}
                                    className="w-full text-left px-3 py-2 hover:bg-teal-50 border-b last:border-b-0"
                                  >
                                    <p className="text-sm font-medium">{atk.nama}</p>
                                    <p className="text-xs text-gray-500">{atk.kategori} • {formatRupiah(atk.harga_satuan)}/{atk.satuan}</p>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={item.kategori}
                              onChange={(e) => updateItem(index, 'kategori', e.target.value)}
                              placeholder="Kategori"
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                          <div className="col-span-1">
                            <input
                              type="number"
                              value={item.jumlah}
                              onChange={(e) => updateItem(index, 'jumlah', Number(e.target.value))}
                              className="w-full px-2 py-1 border rounded text-sm"
                              min="1"
                              required
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={item.satuan}
                              onChange={(e) => updateItem(index, 'satuan', e.target.value)}
                              placeholder="Satuan"
                              className="w-full px-2 py-1 border rounded text-sm"
                              required
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              value={item.harga}
                              onChange={(e) => updateItem(index, 'harga', Number(e.target.value))}
                              placeholder="Harga"
                              className="w-full px-2 py-1 border rounded text-sm"
                              min="0"
                              required
                            />
                          </div>
                          <div className="col-span-1 text-right">
                            <button type="button" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-800">🗑️</button>
                          </div>
                        </div>
                        {/* Total per item */}
                        <div className="mt-2 text-right text-xs text-gray-600">
                          Subtotal: <span className="font-bold text-teal-700">{formatRupiah(item.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addItem} className="mt-2 text-sm text-teal-600 hover:text-teal-800 font-medium">
                    + Tambah Barang
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                  <textarea
                    value={formData.catatan}
                    onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    rows={2}
                    placeholder="Catatan pembelian (opsional)"
                  />
                </div>

                <div className="bg-teal-50 p-3 rounded-lg flex justify-between items-center">
                  <span className="font-bold text-teal-800">Total Nilai PO:</span>
                  <span className="text-xl font-bold text-teal-900">{formatRupiah(totalNilai)}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={loading} className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium">
                    {loading ? 'Menyimpan...' : 'Buat PO'}
                  </button>
                  <button type="button" onClick={resetForm} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300">Batal</button>
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
                <h3 className="text-xl font-bold">Detail Purchase Order</h3>
                <button onClick={() => setShowDetail(null)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>

              <div className="bg-gradient-to-r from-teal-50 to-teal-100 p-4 rounded-lg mb-4 border-l-4 border-teal-600">
                <p className="text-lg font-bold text-teal-800">{showDetail.nomor}</p>
                <p className="text-sm text-teal-700">Purchase Order ATK</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500 text-xs">Tanggal PO</p><p className="font-medium">{formatTanggal(showDetail.tanggal_po)}</p></div>
                  <div><p className="text-gray-500 text-xs">Dibuat Oleh</p><p className="font-medium">{showDetail.nama_admin}</p></div>
                  <div><p className="text-gray-500 text-xs">Penandatangan (TL)</p><p className="font-medium text-teal-700">{showDetail.nama_tl}</p></div>
                  <div><p className="text-gray-500 text-xs">Status</p><span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Dipesan</span></div>
                </div>
              </div>

              <h4 className="font-bold mb-2">📦 Daftar Barang:</h4>
              <table className="w-full mb-4 text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left border">No</th>
                    <th className="px-3 py-2 text-left border">Nama</th>
                    <th className="px-3 py-2 text-center border">Jumlah</th>
                    <th className="px-3 py-2 text-left border">Satuan</th>
                    <th className="px-3 py-2 text-right border">Harga</th>
                    <th className="px-3 py-2 text-right border">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {showDetail.items.map((item, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-3 py-2 border">{i + 1}</td>
                      <td className="px-3 py-2 border font-medium">{item.nama}<br/><span className="text-xs text-gray-500">{item.kategori}</span></td>
                      <td className="px-3 py-2 border text-center">{item.jumlah}</td>
                      <td className="px-3 py-2 border">{item.satuan}</td>
                      <td className="px-3 py-2 border text-right text-xs">{formatRupiah(item.harga)}</td>
                      <td className="px-3 py-2 border text-right font-bold text-teal-700">{formatRupiah(item.total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-teal-50 font-bold">
                    <td colSpan={5} className="px-3 py-2 border text-right">TOTAL</td>
                    <td className="px-3 py-2 border text-right text-teal-800">{formatRupiah(showDetail.total_nilai || 0)}</td>
                  </tr>
                </tbody>
              </table>

              {showDetail.catatan && (
                <div className="bg-yellow-50 p-3 rounded-lg mb-4">
                  <p className="text-sm font-medium text-yellow-800">📝 Catatan:</p>
                  <p className="text-sm text-yellow-700">{showDetail.catatan}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => router.push(`/dashboard/pembelian/print?id=${showDetail.id}`)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">
                  🖨️ Cetak PO
                </button>
                <button onClick={() => setShowDetail(null)} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300">Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}