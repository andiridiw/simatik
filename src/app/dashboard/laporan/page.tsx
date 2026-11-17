'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { getCurrentUser } from '@/lib/auth';
import * as XLSX from 'xlsx';

interface ATK {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  satuan: string;
  stok_tersedia: number;
  stok_minimum: number;
  harga_satuan: number;
}

interface BAItem {
  nama?: string;
  atk_nama?: string;
  jumlah?: number;
  satuan?: string;
}

interface BASerahTerima {
  id: string;
  nomor?: string;
  nama_penerima?: string;
  divisi_penerima?: string;
  items?: BAItem[];
  tanggal_serah_terima: any;
  created_at: any;
}

export default function LaporanPage() {
  const [user, setUser] = useState<any>(null);
  const [atks, setAtks] = useState<ATK[]>([]);
  const [baList, setBaList] = useState<BASerahTerima[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stok' | 'penyerahan'>('stok');
  const [periodeStart, setPeriodeStart] = useState('');
  const [periodeEnd, setPeriodeEnd] = useState('');

  useEffect(() => {
    const userData = getCurrentUser();
    if (userData) setUser(userData);
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubAtk = onSnapshot(collection(db, 'atks'), (snap) => {
      setAtks(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ATK[]);
      setLoading(false);
    });
    const unsubBA = onSnapshot(collection(db, 'ba_serah_terima'), (snap) => {
      setBaList(snap.docs.map(d => ({ id: d.id, ...d.data() })) as BASerahTerima[]);
    });
    return () => { unsubAtk(); unsubBA(); };
  }, [user]);

  const filterByPeriode = (data: BASerahTerima[], tanggalField: string) => {
    if (!periodeStart || !periodeEnd) return data;
    const start = new Date(periodeStart);
    const end = new Date(periodeEnd);
    end.setHours(23, 59, 59);
    return data.filter(item => {
      const t = (item as any)[tanggalField]?.toDate ? (item as any)[tanggalField].toDate() : new Date((item as any)[tanggalField]);
      return t >= start && t <= end;
    });
  };

  const filteredBA = filterByPeriode(baList, 'tanggal_serah_terima');

  const exportStokToExcel = () => {
    const wb = XLSX.utils.book_new();
    const laporanData = atks.map((atk, idx) => ({
      'No': idx + 1,
      'Kode': atk.kode,
      'Nama Barang': atk.nama,
      'Kategori': atk.kategori,
      'Satuan': atk.satuan,
      'Stok Fisik': atk.stok_tersedia,
      'Stok Minimum': atk.stok_minimum,
      'Harga Satuan': atk.harga_satuan,
      'Total Nilai': atk.stok_tersedia * atk.harga_satuan,
      'Status': atk.stok_tersedia === 0 ? 'Habis' : atk.stok_tersedia <= atk.stok_minimum ? 'Menipis' : 'Tersedia'
    }));
    const ws = XLSX.utils.json_to_sheet(laporanData);
    XLSX.utils.book_append_sheet(wb, ws, 'Stok ATK');
    XLSX.writeFile(wb, `Laporan_Stok_ATK_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportBAToExcel = () => {
    const wb = XLSX.utils.book_new();
    const summaryData = filteredBA.map((item, idx) => ({
      'No': idx + 1,
      'Tanggal': item.tanggal_serah_terima?.toDate ? item.tanggal_serah_terima.toDate().toLocaleDateString('id-ID') : '-',
      'Nomor BA': item.nomor || '-',
      'Nama Penerima': item.nama_penerima || '-',
      'Divisi': item.divisi_penerima || '-',
      'Total Item': item.items?.length || 0,
    }));
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan BA');

    const detailData: any[] = [];
    filteredBA.forEach((item, idx) => {
      item.items?.forEach((subItem: BAItem, subIdx: number) => {
        detailData.push({
          'No': `${idx + 1}.${subIdx + 1}`,
          'Tanggal': item.tanggal_serah_terima?.toDate ? item.tanggal_serah_terima.toDate().toLocaleDateString('id-ID') : '-',
          'Nomor BA': item.nomor || '-',
          'Nama Barang': subItem.nama || subItem.atk_nama || '-',
          'Jumlah': subItem.jumlah || 0,
          'Satuan': subItem.satuan || '-',
          'Penerima': item.nama_penerima || '-',
          'Divisi': item.divisi_penerima || '-',
        });
      });
    });
    const wsDetail = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Item');

    const today = new Date();
    const tanggalStr = `${today.getDate()} ${today.toLocaleDateString('id-ID', { month: 'long' })} ${today.getFullYear()}`;
    const ttdData = [
      { A: 'LAPORAN PENYERAHAN BARANG ATK', B: '', C: '' },
      { A: 'PLN UP3 SANGGAU', B: '', C: '' },
      { A: '', B: '', C: '' },
      { A: 'Periode', B: `${periodeStart || '-'} s/d ${periodeEnd || '-'}`, C: '' },
      { A: 'Tanggal Cetak', B: tanggalStr, C: '' },
      { A: '', B: '', C: '' },
      { A: 'Disetujui oleh:', B: '', C: 'Diketahui oleh:' },
      { A: 'Team Leader', B: '', C: 'Asisten Manajer' },
      { A: '', B: '', C: '' },
      { A: '', B: '', C: '' },
      { A: '', B: '', C: '' },
      { A: '(...........................)', B: '', C: '(...........................)' },
      { A: 'TL Administrasi Umum', B: '', C: 'Asman UP3 Sanggau' },
    ];
    const wsTtd = XLSX.utils.json_to_sheet(ttdData);
    wsTtd['!cols'] = [{ wch: 30 }, { wch: 5 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsTtd, 'Tanda Tangan');

    XLSX.writeFile(wb, `Laporan_Penyerahan_${periodeStart || 'all'}_to_${periodeEnd || 'all'}.xlsx`);
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
  if (loading) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  const totalJenis = atks.length;
  const totalStok = atks.reduce((sum, atk) => sum + atk.stok_tersedia, 0);
  const totalNilai = atks.reduce((sum, atk) => sum + (atk.stok_tersedia * atk.harga_satuan), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📊 Laporan</h2>
          <p className="text-sm text-gray-500 mt-1">Laporan Stok & Penyerahan ATK</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab('stok')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'stok' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
          📦 Laporan Stok
        </button>
        <button onClick={() => setActiveTab('penyerahan')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'penyerahan' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
          📤 Laporan Penyerahan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Mulai</label>
            <input type="date" value={periodeStart} onChange={(e) => setPeriodeStart(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Akhir</label>
            <input type="date" value={periodeEnd} onChange={(e) => setPeriodeEnd(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
      </div>

      {activeTab === 'stok' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">📦 Data Stok ATK ({totalJenis} jenis)</h3>
            <button onClick={exportStokToExcel} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium">📥 Export Excel</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-xl border border-teal-200">
              <p className="text-xs text-teal-700 font-medium">Total Jenis ATK</p>
              <p className="text-2xl font-bold text-teal-800">{totalJenis}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <p className="text-xs text-blue-700 font-medium">Total Stok Fisik</p>
              <p className="text-2xl font-bold text-blue-800">{totalStok.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
              <p className="text-xs text-purple-700 font-medium">Nilai Inventaris</p>
              <p className="text-lg font-bold text-purple-800">Rp {totalNilai.toLocaleString('id-ID')}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kode</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Barang</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kategori</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Stok</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Satuan</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Harga</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {atks.map((atk, idx) => {
                    let statusBadge = 'bg-green-100 text-green-700';
                    let statusText = 'Tersedia';
                    if (atk.stok_tersedia === 0) { statusBadge = 'bg-red-100 text-red-700'; statusText = 'Habis'; }
                    else if (atk.stok_tersedia <= atk.stok_minimum) { statusBadge = 'bg-orange-100 text-orange-700'; statusText = 'Menipis'; }
                    return (
                      <tr key={atk.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-mono">{atk.kode}</td>
                        <td className="px-4 py-3 text-sm font-medium">{atk.nama}</td>
                        <td className="px-4 py-3 text-sm">{atk.kategori}</td>
                        <td className="px-4 py-3 text-sm text-center font-bold">{atk.stok_tersedia}</td>
                        <td className="px-4 py-3 text-sm">{atk.satuan}</td>
                        <td className="px-4 py-3 text-sm text-right">Rp {atk.harga_satuan.toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge}`}>{statusText}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'penyerahan' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">📤 Data Penyerahan ({filteredBA.length} transaksi)</h3>
            <button onClick={exportBAToExcel} disabled={filteredBA.length === 0} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">📥 Export Excel</button>
          </div>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tanggal</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nomor BA</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Penerima</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Divisi</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Item</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBA.map((item, idx) => (
                    <tr key={item.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm">{item.tanggal_serah_terima?.toDate ? item.tanggal_serah_terima.toDate().toLocaleDateString('id-ID') : '-'}</td>
                      <td className="px-4 py-3 text-sm font-mono">{item.nomor || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium">{item.nama_penerima || '-'}</td>
                      <td className="px-4 py-3 text-sm">{item.divisi_penerima || '-'}</td>
                      <td className="px-4 py-3 text-sm text-center">{item.items?.length || 0}</td>
                    </tr>
                  ))}
                  {filteredBA.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Tidak ada data penyerahan</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}