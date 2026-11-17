'use client';

import { getCurrentUser } from '@/lib/auth';
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

interface InputItem {
  atk_id: string;
  nama: string;
  jumlah: number;
  satuan: string;
  harga: number;
  kategori_pembiayaan: string;
  keterangan: string;
}

export default function InputStockPage() {
  const [user, setUser] = useState<any>(null);
  const [atks, setAtks] = useState<ATK[]>([]);
  const [inputItems, setInputItems] = useState<InputItem[]>([]);
  const [loading, setLoading] = useState(false);
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

  const addItem = () => {
    setInputItems([...inputItems, {
      atk_id: '',
      nama: '',
      jumlah: 1,
      satuan: 'buah',
      harga: 0,
      kategori_pembiayaan: 'Kas Kecil',
      keterangan: ''
    }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...inputItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill jika pilih ATK
    if (field === 'atk_id' && value) {
      const atk = atks.find(a => a.id === value);
      if (atk) {
        newItems[index].nama = atk.nama;
        newItems[index].satuan = atk.satuan;
        newItems[index].harga = atk.harga_satuan;
      }
    }
    
    setInputItems(newItems);
  };

  const removeItem = (index: number) => {
    setInputItems(inputItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputItems.length === 0) {
      alert('Tambahkan minimal 1 item!');
      return;
    }

    if (inputItems.some(item => !item.atk_id || item.jumlah <= 0)) {
      alert('Lengkapi semua data item!');
      return;
    }

    setLoading(true);
    try {
      // Update stok di database
      for (const item of inputItems) {
        const atk = atks.find(a => a.id === item.atk_id);
        if (atk) {
          await updateDoc(doc(db, 'atks', atk.id), {
            stok_tersedia: atk.stok_tersedia + item.jumlah,
            updated_at: new Date()
          });
        }
      }

      // Simpan riwayat input stock
      await addDoc(collection(db, 'input_stock'), {
        items: inputItems,
        total_items: inputItems.length,
        total_nilai: inputItems.reduce((sum, item) => sum + (item.jumlah * item.harga), 0),
        input_by: user.username,
        input_nama: user.nama,
        tanggal: new Date(),
        created_at: new Date()
      });

      alert(`✅ Berhasil input ${inputItems.length} item!`);
      setInputItems([]);
    } catch (error) {
      alert('Gagal input stock: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">📥 Input Stock</h2>
        <p className="text-sm text-gray-500 mt-1">Tambah stok ATK baru ke sistem</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Daftar Item</h3>
            <button 
              type="button" 
              onClick={addItem} 
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-medium"
            >
              + Tambah Item
            </button>
          </div>

          {inputItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-2">📦</p>
              <p>Belum ada item. Klik "Tambah Item" untuk mulai.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inputItems.map((item, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Pilih ATK</label>
                      <select
                        value={item.atk_id}
                        onChange={(e) => updateItem(index, 'atk_id', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                        required
                      >
                        <option value="">-- Pilih ATK --</option>
                        {atks.map(atk => (
                          <option key={atk.id} value={atk.id}>
                            {atk.nama} ({atk.kode})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Jumlah</label>
                      <input
                        type="number"
                        value={item.jumlah}
                        onChange={(e) => updateItem(index, 'jumlah', Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                        min="1"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Satuan</label>
                      <input
                        type="text"
                        value={item.satuan}
                        onChange={(e) => updateItem(index, 'satuan', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Harga</label>
                      <input
                        type="number"
                        value={item.harga}
                        onChange={(e) => updateItem(index, 'harga', Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                        min="0"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Kategori</label>
                      <select
                        value={item.kategori_pembiayaan}
                        onChange={(e) => updateItem(index, 'kategori_pembiayaan', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                        required
                      >
                        <option value="Kas Kecil">Kas Kecil</option>
                        <option value="Biaya Pemeliharaan">Biaya Pemeliharaan</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Keterangan (opsional)</label>
                    <input
                      type="text"
                      value={item.keterangan}
                      onChange={(e) => updateItem(index, 'keterangan', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Contoh: Pembelian bulan November"
                    />
                  </div>

                  <div className="mt-3 flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Subtotal: <span className="font-bold text-teal-700">Rp {(item.jumlah * item.harga).toLocaleString('id-ID')}</span>
                    </p>
                    <button 
                      type="button" 
                      onClick={() => removeItem(index)} 
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {inputItems.length > 0 && (
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-teal-800">
                  <strong>Total:</strong> {inputItems.length} item
                </p>
                <p className="text-lg font-bold text-teal-900">
                  Rp {inputItems.reduce((sum, item) => sum + (item.jumlah * item.harga), 0).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setInputItems([])} 
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Reset
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 font-medium disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : '💾 Simpan Input Stock'}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}