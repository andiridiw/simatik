'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
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
  aktif: boolean;
}

export default function LaporanPage() {
  const [user, setUser] = useState<any>(null);
  const [atks, setAtks] = useState<ATK[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (userData) setUser(JSON.parse(userData));
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'atks'), (snapshot) => {
      setAtks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ATK[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const exportToExcel = () => {
    // Data laporan
    const laporanData = atks.map((atk, index) => ({
      'No': index + 1,
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

    // Summary
    const totalJenis = atks.length;
    const totalStok = atks.reduce((sum, atk) => sum + atk.stok_tersedia, 0);
    const totalNilai = atks.reduce((sum, atk) => sum + (atk.stok_tersedia * atk.harga_satuan), 0);
    const stokMenipis = atks.filter(a => a.stok_tersedia > 0 && a.stok_tersedia <= a.stok_minimum).length;
    const stokHabis = atks.filter(a => a.stok_tersedia === 0).length;

    // Buat workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Detail Laporan
    const wsDetail = XLSX.utils.json_to_sheet(laporanData);
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Laporan');

    // Sheet 2: Ringkasan
    const summaryData = [
      { 'Item': 'Total Jenis ATK', 'Nilai': totalJenis },
      { 'Item': 'Total Stok Fisik', 'Nilai': totalStok },
      { 'Item': 'Nilai Inventaris', 'Nilai': totalNilai },
      { 'Item': 'Stok Menipis', 'Nilai': stokMenipis },
      { 'Item': 'Stok Habis', 'Nilai': stokHabis },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

    // Sheet 3: Tanda Tangan
    const today = new Date();
    const tanggalStr = `${today.getDate()} ${today.toLocaleDateString('id-ID', { month: 'long' })} ${today.getFullYear()}`;
    
    // ✅ FIX: Pakai nama key unik (A, B, C) bukan '' duplikat
    const ttdData = [
      { A: 'LAPORAN STOK ATK', B: '', C: '' },
      { A: 'PLN UP3 SANGGAU', B: '', C: '' },
      { A: '', B: '', C: '' },
      { A: 'Tanggal Laporan', B: tanggalStr, C: '' },
      { A: '', B: '', C: '' },
      { A: 'Dibuat oleh:', B: '', C: 'Disetujui oleh:' },
      { A: 'Admin', B: '', C: 'Team Leader' },
      { A: '', B: '', C: '' },
      { A: '', B: '', C: '' },
      { A: '', B: '', C: '' },
      { A: '(...........................)', B: '', C: '(...........................)' },
      { A: 'Admin UP3 Sanggau', B: '', C: 'TL Administrasi Umum' },
      { A: '', B: '', C: '' },
      { A: 'Diketahui oleh:', B: '', C: '' },
      { A: 'Asisten Manajer', B: '', C: '' },
      { A: '', B: '', C: '' },
      { A: '', B: '', C: '' },
      { A: '', B: '', C: '' },
      { A: '(...........................)', B: '', C: '' },
      { A: 'Asman UP3 Sanggau', B: '', C: '' },
    ];
    const wsTtd = XLSX.utils.json_to_sheet(ttdData);
    
    // Set column widths
    wsTtd['!cols'] = [{ wch: 25 }, { wch: 5 }, { wch: 25 }];
    
    XLSX.utils.book_append_sheet(wb, wsTtd, 'Tanda Tangan');

    // Download file
    const fileName = `Laporan_Stok_ATK_${today.toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
  if (loading) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  const totalJenis = atks.length;
  const totalStok = atks.reduce((sum, atk) => sum + atk.stok_tersedia, 0);
  const totalNilai = atks.reduce((sum, atk) => sum + (atk.stok_tersedia * atk.harga_satuan), 0);
  const stokMenipis = atks.filter(a => a.stok_tersedia > 0 && a.stok_tersedia <= a.stok_minimum).length;
  const stokHabis = atks.filter(a => a.stok_tersedia === 0).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📊 Laporan Stok ATK</h2>
          <p className="text-sm text-gray-500 mt-1">Ringkasan persediaan dan nilai inventaris ATK</p>
        </div>
        <button 
          onClick={exportToExcel} 
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
        >
          📥 Export Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-xl border border-teal-200">
          <p className="text-xs text-teal-700 font-medium">Total Jenis ATK</p>
          <p className="text-3xl font-bold text-teal-800 mt-2">{totalJenis}</p>
          <p className="text-xs text-teal-600 mt-1">item berbeda</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <p className="text-xs text-blue-700 font-medium">Total Stok Fisik</p>
          <p className="text-3xl font-bold text-blue-800 mt-2">{totalStok.toLocaleString('id-ID')}</p>
          <p className="text-xs text-blue-600 mt-1">unit tersedia</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <p className="text-xs text-purple-700 font-medium">Nilai Inventaris</p>
          <p className="text-2xl font-bold text-purple-800 mt-2">Rp {totalNilai.toLocaleString('id-ID')}</p>
          <p className="text-xs text-purple-600 mt-1">total aset ATK</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
          <p className="text-xs text-orange-700 font-medium">Stok Menipis</p>
          <p className="text-3xl font-bold text-orange-800 mt-2">{stokMenipis}</p>
          <p className="text-xs text-orange-600 mt-1">perlu restock</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
          <p className="text-xs text-red-700 font-medium">Stok Habis</p>
          <p className="text-3xl font-bold text-red-800 mt-2">{stokHabis}</p>
          <p className="text-xs text-red-600 mt-1">harus segera dibeli</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-800">📦 Daftar Stok ATK</h3>
        </div>
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
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {atks.map((atk, index) => {
                const total = atk.stok_tersedia * atk.harga_satuan;
                let statusBadge = 'bg-green-100 text-green-700';
                let statusText = 'Tersedia';
                if (atk.stok_tersedia === 0) { statusBadge = 'bg-red-100 text-red-700'; statusText = 'Habis'; }
                else if (atk.stok_tersedia <= atk.stok_minimum) { statusBadge = 'bg-orange-100 text-orange-700'; statusText = 'Menipis'; }

                return (
                  <tr key={atk.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-mono">{atk.kode}</td>
                    <td className="px-4 py-3 text-sm font-medium">{atk.nama}</td>
                    <td className="px-4 py-3 text-sm">{atk.kategori}</td>
                    <td className="px-4 py-3 text-sm text-center font-bold">{atk.stok_tersedia}</td>
                    <td className="px-4 py-3 text-sm">{atk.satuan}</td>
                    <td className="px-4 py-3 text-sm text-right">Rp {atk.harga_satuan.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold">Rp {total.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge}`}>
                        {statusText}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right">TOTAL</td>
                <td className="px-4 py-3 text-center">{totalStok.toLocaleString('id-ID')}</td>
                <td colSpan={2}></td>
                <td className="px-4 py-3 text-right">Rp {totalNilai.toLocaleString('id-ID')}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}