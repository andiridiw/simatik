'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
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

interface ImportItem {
  kode: string;
  nama: string;
  kategori: string;
  satuan: string;
  stok: number;
  stok_minimum: number;
  harga: number;
  status: 'baru' | 'update' | 'error';
  message?: string;
}

export default function UploadStokPage() {
  const [user, setUser] = useState<any>(null);
  const [atks, setAtks] = useState<ATK[]>([]);
  const [importData, setImportData] = useState<ImportItem[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      
      // ✅ CEK AKSES: Hanya admin dan tl yang boleh
      if (parsed.role !== 'admin' && parsed.role !== 'tl') {
        alert('⛔ Akses Ditolak!\n\nHanya Admin dan TL yang dapat mengakses menu Upload Stok.');
        router.push('/dashboard');
      }
    } else {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'atks'), (snapshot) => {
      setAtks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ATK[]);
    });
    return () => unsubscribe();
  }, [user]);

  const downloadTemplate = () => {
    const template = [
      {
        'Kode': 'ATK-001',
        'Nama Barang': 'Kertas A4 80gr',
        'Kategori': 'Kertas',
        'Satuan': 'Rim',
        'Stok Fisik': 50,
        'Stok Minimum': 10,
        'Harga Satuan': 50000,
      },
      {
        'Kode': 'ATK-002',
        'Nama Barang': 'Pulpen Standard',
        'Kategori': 'Alat Tulis',
        'Satuan': 'Buah',
        'Stok Fisik': 100,
        'Stok Minimum': 20,
        'Harga Satuan': 3000,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Stok');
    XLSX.writeFile(wb, 'Template_Stok_ATK.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet) as any[];

      const processed: ImportItem[] = json.map((row) => {
        const nama = String(row['Nama Barang'] || row['nama'] || '').trim();
        const kode = String(row['Kode'] || row['kode'] || '').trim();
        const kategori = String(row['Kategori'] || row['kategori'] || 'Alat Tulis').trim();
        const satuan = String(row['Satuan'] || row['satuan'] || 'Buah').trim();
        const stok = Number(row['Stok Fisik'] || row['stok'] || 0);
        const stok_minimum = Number(row['Stok Minimum'] || row['stok_minimum'] || 10);
        const harga = Number(row['Harga Satuan'] || row['harga'] || 0);

        if (!nama) {
          return { kode, nama, kategori, satuan, stok, stok_minimum, harga, status: 'error', message: 'Nama barang kosong' };
        }

        const existing = atks.find(a => a.nama.toLowerCase() === nama.toLowerCase());
        return {
          kode: kode || existing?.kode || `ATK-${Math.floor(Math.random() * 9000) + 1000}`,
          nama,
          kategori,
          satuan,
          stok,
          stok_minimum,
          harga,
          status: existing ? 'update' : 'baru',
          message: existing ? `Update stok: ${existing.stok_tersedia} → ${stok}` : 'Barang baru',
        };
      });

      setImportData(processed);
      setStep('preview');
    };
    reader.readAsBinaryString(file);
  };

  const processImport = async () => {
    if (!confirm(`Proses ${importData.length} item? (${importData.filter(i => i.status === 'baru').length} baru, ${importData.filter(i => i.status === 'update').length} update)`)) return;

    setLoading(true);
    try {
      let success = 0;
      let error = 0;

      for (const item of importData) {
        if (item.status === 'error') { error++; continue; }

        try {
          const existing = atks.find(a => a.nama.toLowerCase() === item.nama.toLowerCase());
          
          if (existing) {
            await updateDoc(doc(db, 'atks', existing.id), {
              stok_tersedia: item.stok,
              stok_minimum: item.stok_minimum,
              harga_satuan: item.harga,
              kategori: item.kategori,
              satuan: item.satuan,
              updated_at: new Date(),
            });
          } else {
            await addDoc(collection(db, 'atks'), {
              kode: item.kode,
              nama: item.nama,
              kategori: item.kategori,
              satuan: item.satuan,
              stok_tersedia: item.stok,
              stok_minimum: item.stok_minimum,
              harga_satuan: item.harga,
              aktif: true,
              created_at: new Date(),
            });
          }
          success++;
        } catch (err) {
          error++;
          console.error('Error import item:', item.nama, err);
        }
      }

      alert(`✅ Import selesai!\n\n✅ Berhasil: ${success} item\n❌ Gagal: ${error} item`);
      setStep('done');
    } catch (err) {
      alert('Gagal import: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetUpload = () => {
    setImportData([]);
    setFileName('');
    setStep('upload');
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  const stats = {
    total: importData.length,
    baru: importData.filter(i => i.status === 'baru').length,
    update: importData.filter(i => i.status === 'update').length,
    error: importData.filter(i => i.status === 'error').length,
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📤 Upload Stok via Excel</h2>
          <p className="text-sm text-gray-500 mt-1">Import stok awal dari file Excel dengan cepat</p>
        </div>
        <button onClick={downloadTemplate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
          📥 Download Template
        </button>
      </div>

      <div className="bg-gradient-to-r from-teal-50 to-blue-50 border-l-4 border-teal-500 p-4 mb-4 rounded">
        <p className="text-sm text-teal-800">
          <strong>💡 Cara Pakai:</strong> 
          (1) Download template Excel → (2) Isi data stok → (3) Upload file → (4) Preview → (5) Simpan
        </p>
      </div>

      {/* STEP 1: UPLOAD */}
      {step === 'upload' && (
        <div className="bg-white rounded-xl shadow p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Upload File Excel</h3>
            <p className="text-gray-500 mb-6">Pilih file Excel (.xlsx, .xls) yang berisi data stok ATK</p>
            
            <label className="inline-block cursor-pointer">
              <div className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 font-medium transition">
                📁 Pilih File Excel
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="mt-6 text-left bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-bold mb-2">📋 Format Kolom Excel:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Kode</strong> — Kode barang (opsional, auto-generate jika kosong)</li>
                <li>• <strong>Nama Barang</strong> — Nama lengkap barang (wajib)</li>
                <li>• <strong>Kategori</strong> — Kategori barang (Alat Tulis, Kertas, dll)</li>
                <li>• <strong>Satuan</strong> — Satuan (Buah, Rim, Box, dll)</li>
                <li>• <strong>Stok Fisik</strong> — Jumlah stok saat ini</li>
                <li>• <strong>Stok Minimum</strong> — Batas minimum stok</li>
                <li>• <strong>Harga Satuan</strong> — Harga per satuan (Rp)</li>
              </ul>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Data stok saat ini: <strong>{atks.length} item</strong> terdaftar
            </p>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW */}
      {step === 'preview' && (
        <div>
          <div className="bg-white rounded-xl shadow p-6 mb-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold">Preview Import: {fileName}</h3>
                <p className="text-sm text-gray-500">{stats.total} item terdeteksi</p>
              </div>
              <div className="flex gap-2">
                <button onClick={resetUpload} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium">
                  🔄 Upload Ulang
                </button>
                <button
                  onClick={processImport}
                  disabled={loading || stats.error === stats.total}
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 font-medium disabled:opacity-50"
                >
                  {loading ? 'Memproses...' : `💾 Simpan (${stats.total} item)`}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">Total</p>
                <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="text-xs text-green-700">Barang Baru</p>
                <p className="text-2xl font-bold text-green-800">{stats.baru}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <p className="text-xs text-orange-700">Update Stok</p>
                <p className="text-2xl font-bold text-orange-800">{stats.update}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <p className="text-xs text-red-700">Error</p>
                <p className="text-2xl font-bold text-red-800">{stats.error}</p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Kode</th>
                    <th className="px-3 py-2 text-left">Nama</th>
                    <th className="px-3 py-2 text-left">Kategori</th>
                    <th className="px-3 py-2 text-center">Stok</th>
                    <th className="px-3 py-2 text-left">Satuan</th>
                    <th className="px-3 py-2 text-right">Harga</th>
                    <th className="px-3 py-2 text-left">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.map((item, i) => (
                    <tr key={i} className={`border-t ${item.status === 'error' ? 'bg-red-50' : item.status === 'baru' ? 'bg-green-50' : 'bg-orange-50'}`}>
                      <td className="px-3 py-2">
                        {item.status === 'baru' && <span className="text-green-600">🆕</span>}
                        {item.status === 'update' && <span className="text-orange-600">🔄</span>}
                        {item.status === 'error' && <span className="text-red-600">❌</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{item.kode}</td>
                      <td className="px-3 py-2 font-medium">{item.nama}</td>
                      <td className="px-3 py-2 text-xs">{item.kategori}</td>
                      <td className="px-3 py-2 text-center font-bold">{item.stok}</td>
                      <td className="px-3 py-2 text-xs">{item.satuan}</td>
                      <td className="px-3 py-2 text-right text-xs">Rp {item.harga.toLocaleString('id-ID')}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{item.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: DONE */}
      {step === 'done' && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-bold mb-2 text-green-700">Import Berhasil!</h3>
          <p className="text-gray-600 mb-6">Data stok sudah tersimpan ke sistem</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => router.push('/dashboard/atk')} className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 font-medium">
              📦 Lihat Data Persediaan
            </button>
            <button onClick={resetUpload} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium">
              📤 Upload File Lain
            </button>
          </div>
        </div>
      )}
    </div>
  );
}