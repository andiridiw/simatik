'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { getCurrentUser } from '@/lib/auth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface PembelianItem {
  atk_id: string;
  nama: string;
  jumlah: number;
  satuan: string;
  harga: number;
  kategori_pembiayaan: string;
  keterangan: string;
}

interface Pembelian {
  id: string;
  nomor_nota: string;
  nama_toko: string;
  nota_file: string;
  nota_file_name: string;
  items: PembelianItem[];
  total_nilai: number;
  status: 'pending' | 'diterima';
  input_by: string;
  input_nama: string;
  tanggal: any;
  tanggal_terima?: any;
  diterima_oleh?: string;
  created_at: any;
}

const terbilang = (angka: number): string => {
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  if (angka < 12) return satuan[angka];
  if (angka < 20) return terbilang(angka - 10) + ' Belas';
  if (angka < 100) return terbilang(Math.floor(angka / 10)) + ' Puluh ' + terbilang(angka % 10);
  if (angka < 200) return 'Seratus ' + terbilang(angka - 100);
  if (angka < 1000) return terbilang(Math.floor(angka / 100)) + ' Ratus ' + terbilang(angka % 100);
  if (angka < 2000) return 'Seribu ' + terbilang(angka - 1000);
  if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + ' Ribu ' + terbilang(angka % 1000);
  if (angka < 1000000000) return terbilang(Math.floor(angka / 1000000)) + ' Juta ' + terbilang(angka % 1000000);
  return terbilang(Math.floor(angka / 1000000000)) + ' Miliar ' + terbilang(angka % 1000000000);
};

const formatRupiah = (angka: number): string => {
  return 'Rp ' + angka.toLocaleString('id-ID');
};

const formatTanggal = (date: any): string => {
  if (!date) return '-';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

export default function PembelianPage() {
  const [user, setUser] = useState<any>(null);
  const [atks, setAtks] = useState<ATK[]>([]);
  const [pembelianList, setPembelianList] = useState<Pembelian[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<Pembelian | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  
  const [nomorNota, setNomorNota] = useState('');
  const [namaToko, setNamaToko] = useState('');
  const [notaFile, setNotaFile] = useState('');
  const [notaName, setNotaName] = useState('');
  const [items, setItems] = useState<PembelianItem[]>([]);
  
  const [filterStatus, setFilterStatus] = useState('semua');
  const [periodeStart, setPeriodeStart] = useState('');
  const [periodeEnd, setPeriodeEnd] = useState('');
  
  // Entry untuk laporan
  const [tanggalCetak, setTanggalCetak] = useState('');
  const [namaPenandatangan, setNamaPenandatangan] = useState('');
  const [jabatan, setJabatan] = useState('');

  useEffect(() => {
    const userData = getCurrentUser();
    if (userData) setUser(userData);
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubAtk = onSnapshot(collection(db, 'atks'), (snap) => {
      setAtks(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ATK[]);
    });
    const unsubPembelian = onSnapshot(collection(db, 'pembelian'), (snap) => {
      setPembelianList(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Pembelian[]);
    });
    return () => { unsubAtk(); unsubPembelian(); };
  }, [user]);

  const addItem = () => {
    setItems([...items, {
      atk_id: '', nama: '', jumlah: 1, satuan: 'buah',
      harga: 0, kategori_pembiayaan: 'Kas Kecil', keterangan: ''
    }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'atk_id' && value) {
      const atk = atks.find(a => a.id === value);
      if (atk) {
        newItems[index].nama = atk.nama;
        newItems[index].satuan = atk.satuan;
        newItems[index].harga = atk.harga_satuan;
      }
    }
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleNotaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
        alert('Hanya file PDF atau gambar (JPG/PNG) yang diperbolehkan!');
        e.target.value = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran file maksimal 2MB!');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setNotaFile(reader.result as string);
        setNotaName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPembelian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { alert('Tambahkan minimal 1 item!'); return; }
    if (items.some(item => !item.atk_id || item.jumlah <= 0)) { alert('Lengkapi semua data item!'); return; }
    if (!nomorNota.trim()) { alert('Nomor nota wajib diisi!'); return; }
    if (!namaToko.trim()) { alert('Nama toko wajib diisi!'); return; }
    if (!notaFile) { alert('Upload nota pembelian wajib!'); return; }

    setLoading(true);
    try {
      await addDoc(collection(db, 'pembelian'), {
        nomor_nota: nomorNota,
        nama_toko: namaToko,
        nota_file: notaFile,
        nota_file_name: notaName,
        items: items,
        total_nilai: items.reduce((sum, item) => sum + (item.jumlah * item.harga), 0),
        status: 'pending',
        input_by: user.username,
        input_nama: user.nama,
        tanggal: new Date(),
        created_at: new Date(),
      });
      alert('✅ Pembelian berhasil dicatat! Klik "Terima Barang" untuk menambah stok.');
      resetForm();
    } catch (error) {
      alert('Gagal: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleTerimaBarang = async (pembelian: Pembelian) => {
    if (!confirm(`Terima ${pembelian.items.length} item dan tambahkan ke stok?\n\nTotal: ${formatRupiah(pembelian.total_nilai)}`)) return;
    
    setLoading(true);
    try {
      for (const item of pembelian.items) {
        const atk = atks.find(a => a.nama.toLowerCase() === item.nama.toLowerCase());
        if (atk) {
          await updateDoc(doc(db, 'atks', atk.id), {
            stok_tersedia: atk.stok_tersedia + item.jumlah,
            updated_at: new Date()
          });
        } else {
          await addDoc(collection(db, 'atks'), {
            kode: `ATK-${Math.floor(Math.random() * 9000) + 1000}`,
            nama: item.nama,
            kategori: 'Alat Tulis',
            satuan: item.satuan,
            stok_tersedia: item.jumlah,
            stok_minimum: 10,
            harga_satuan: item.harga,
            aktif: true,
            created_at: new Date(),
          });
        }
      }
      
      await updateDoc(doc(db, 'pembelian', pembelian.id), {
        status: 'diterima',
        tanggal_terima: new Date(),
        diterima_oleh: user.nama,
        updated_at: new Date(),
      });
      
      alert('✅ Barang berhasil diterima dan stok ditambahkan!');
      setShowDetail(null);
    } catch (error) {
      alert('Gagal menerima barang: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNomorNota('');
    setNamaToko('');
    setNotaFile('');
    setNotaName('');
    setItems([]);
    setShowForm(false);
  };

  const filteredPembelian = pembelianList.filter(p => {
    if (filterStatus !== 'semua' && p.status !== filterStatus) return false;
    if (periodeStart && periodeEnd) {
      const t = p.tanggal?.toDate ? p.tanggal.toDate() : new Date(p.tanggal);
      const start = new Date(periodeStart);
      const end = new Date(periodeEnd);
      end.setHours(23, 59, 59);
      if (t < start || t > end) return false;
    }
    return true;
  });

  // ===== GENERATE PDF =====
  const generatePDF = (): jsPDF => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    // ===== HEADER =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('LAPORAN PEMBELIAN ATK', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('PT PLN (PERSERO) UP3 SANGGAU', pageWidth / 2, 27, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const periodeText = `PERIODE ${periodeStart ? formatTanggal(new Date(periodeStart)) : '.........'} S/D ${periodeEnd ? formatTanggal(new Date(periodeEnd)) : '.........'}`;
    doc.text(periodeText, pageWidth / 2, 34, { align: 'center' });

    // Garis bawah header
    doc.setLineWidth(0.5);
    doc.line(margin, 38, pageWidth - margin, 38);

    // ===== TABEL =====
    const allItems: any[] = [];
    filteredPembelian.forEach(p => {
      p.items?.forEach(item => {
        allItems.push({
          nama_barang: item.nama,
          nama_toko: p.nama_toko || '-',
          nomor_nota: p.nomor_nota || '-',
          vol: item.jumlah,
          satuan: item.satuan,
          total_harga: item.jumlah * item.harga,
        });
      });
    });

    const tableData = allItems.map((item, idx) => [
      idx + 1,
      item.nama_barang,
      item.nama_toko,
      item.nomor_nota,
      item.vol,
      item.satuan,
      formatRupiah(item.total_harga),
    ]);

    const totalHarga = allItems.reduce((sum, item) => sum + item.total_harga, 0);

    // Tambah baris JUMLAH HARGA
    tableData.push(['', 'JUMLAH HARGA', '', '', '', '', formatRupiah(totalHarga)]);

    autoTable(doc, {
      startY: 42,
      head: [['NO', 'NAMA BARANG', 'NAMA TOKO', 'NOMOR NOTA', 'VOL', 'SATUAN', 'TOTAL HARGA']],
      body: tableData,
      margin: { left: margin, right: margin },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [217, 225, 242],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 'auto' },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'right', cellWidth: 35 },
      },
      didParseCell: (data: any) => {
        // Bold baris JUMLAH HARGA
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    // ===== TERBILANG =====
    let currentY = (doc as any).lastAutoTable.finalY + 8;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TERBILANG:', margin, currentY);
    
    doc.setFont('helvetica', 'italic');
    doc.text(terbilang(totalHarga) + ' Rupiah', margin + 30, currentY);

    // ===== TANDA TANGAN =====
    const tanggalCetakObj = tanggalCetak ? new Date(tanggalCetak) : new Date();
    const tanggalStr = formatTanggal(tanggalCetakObj);
    const namaTTD = namaPenandatangan || '...........................';
    const jabatanTTD = jabatan || '...........................';

    const ttdX = pageWidth - margin - 70;
    currentY += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Sanggau, ${tanggalStr}`, ttdX, currentY);
    
    currentY += 6;
    doc.text(jabatanTTD, ttdX, currentY);
    
    currentY += 25; // Ruang untuk tanda tangan
    doc.setFont('helvetica', 'bold');
    doc.text(namaTTD.toUpperCase(), ttdX, currentY);
    
    // Garis bawah nama
    doc.setLineWidth(0.3);
    const namaWidth = doc.getTextWidth(namaTTD.toUpperCase());
    doc.line(ttdX, currentY + 1, ttdX + namaWidth, currentY + 1);

    return doc;
  };

  const handlePreview = () => {
    if (filteredPembelian.length === 0) {
      alert('Tidak ada data untuk dicetak!');
      return;
    }
    if (!namaPenandatangan.trim()) {
      alert('Nama Penandatangan wajib diisi!');
      return;
    }
    if (!jabatan.trim()) {
      alert('Jabatan wajib diisi!');
      return;
    }

    try {
      const doc = generatePDF();
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setShowPreview(true);
    } catch (error) {
      alert('Gagal generate PDF: ' + (error as Error).message);
    }
  };

  const handleDownload = () => {
    if (filteredPembelian.length === 0) {
      alert('Tidak ada data untuk dicetak!');
      return;
    }
    if (!namaPenandatangan.trim()) {
      alert('Nama Penandatangan wajib diisi!');
      return;
    }
    if (!jabatan.trim()) {
      alert('Jabatan wajib diisi!');
      return;
    }

    try {
      const doc = generatePDF();
      doc.save(`Laporan_Pembelian_ATK_${periodeStart || 'all'}_to_${periodeEnd || 'all'}.pdf`);
    } catch (error) {
      alert('Gagal download PDF: ' + (error as Error).message);
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  const totalPending = pembelianList.filter(p => p.status === 'pending').length;
  const totalDiterima = pembelianList.filter(p => p.status === 'diterima').length;
  const totalNilai = filteredPembelian.reduce((sum, p) => sum + (p.total_nilai || 0), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🛒 Pembelian ATK</h2>
          <p className="text-sm text-gray-500 mt-1">Catat pembelian dan terima barang ke stok</p>
        </div>
        <button 
          onClick={() => setShowForm(true)} 
          className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-medium"
        >
          + Catat Pembelian Baru
        </button>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Alur Pembelian:</strong> 
          (1) Catat pembelian + upload nota → (2) Status "Menunggu" → (3) Klik "Terima Barang" → Stok otomatis bertambah
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
          <p className="text-xs text-orange-700 font-medium">Menunggu Diterima</p>
          <p className="text-2xl font-bold text-orange-800">{totalPending}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
          <p className="text-xs text-green-700 font-medium">Sudah Diterima</p>
          <p className="text-2xl font-bold text-green-800">{totalDiterima}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
          <p className="text-xs text-blue-700 font-medium">Total Transaksi</p>
          <p className="text-2xl font-bold text-blue-800">{filteredPembelian.length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
          <p className="text-xs text-purple-700 font-medium">Total Nilai</p>
          <p className="text-lg font-bold text-purple-800">{formatRupiah(totalNilai)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="semua">Semua Status</option>
              <option value="pending">Menunggu Diterima</option>
              <option value="diterima">Sudah Diterima</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Mulai</label>
            <input type="date" value={periodeStart} onChange={(e) => setPeriodeStart(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Akhir</label>
            <input type="date" value={periodeEnd} onChange={(e) => setPeriodeEnd(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="flex items-end">
            <button 
              onClick={handlePreview}
              disabled={filteredPembelian.length === 0}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
            >
              👁️ Preview PDF
            </button>
          </div>
        </div>
      </div>

      {/* Entry Laporan */}
      <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-xl shadow p-4 mb-4">
        <h3 className="text-sm font-bold text-yellow-800 mb-3">📝 Entry Laporan (Wajib diisi sebelum cetak)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Cetak</label>
            <input 
              type="date" 
              value={tanggalCetak} 
              onChange={(e) => setTanggalCetak(e.target.value)} 
              className="w-full px-3 py-2 border rounded-lg text-sm" 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nama Penandatangan <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={namaPenandatangan} 
              onChange={(e) => setNamaPenandatangan(e.target.value)} 
              className="w-full px-3 py-2 border rounded-lg text-sm" 
              placeholder="Contoh: ANDI RIDWAN MAULANA"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Jabatan <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={jabatan} 
              onChange={(e) => setJabatan(e.target.value)} 
              className="w-full px-3 py-2 border rounded-lg text-sm" 
              placeholder="Contoh: Team Leader Administrasi Umum"
            />
          </div>
        </div>
      </div>

      {/* Tombol Download */}
      <div className="flex justify-end mb-4">
        <button 
          onClick={handleDownload}
          disabled={filteredPembelian.length === 0}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
        >
          📥 Download PDF
        </button>
      </div>

      {/* Tabel Pembelian */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tanggal</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No. Nota</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Toko</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nota</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Item</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Nilai</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredPembelian.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{p.tanggal?.toDate ? p.tanggal.toDate().toLocaleDateString('id-ID') : '-'}</td>
                  <td className="px-4 py-3 text-sm font-mono">{p.nomor_nota}</td>
                  <td className="px-4 py-3 text-sm">{p.nama_toko || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    {p.nota_file ? (
                      <a href={p.nota_file} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">📄 Lihat</a>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">{p.items?.length || 0}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold">{formatRupiah(p.total_nilai || 0)}</td>
                  <td className="px-4 py-3 text-center">
                    {p.status === 'diterima' ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✅ Diterima</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">⏳ Menunggu</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center space-x-1">
                    <button onClick={() => setShowDetail(p)} className="text-blue-600 hover:text-blue-800 text-sm">👁️ Detail</button>
                    {p.status === 'pending' && (
                      <button onClick={() => handleTerimaBarang(p)} className="text-green-600 hover:text-green-800 text-sm font-medium">✅ Terima</button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredPembelian.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Belum ada data pembelian</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Catat Pembelian */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">🛒 Catat Pembelian Baru</h3>
                <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>
              <form onSubmit={handleSubmitPembelian} className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-bold text-sm mb-3">📄 Informasi Nota Pembelian</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nomor Nota <span className="text-red-500">*</span></label>
                      <input type="text" value={nomorNota} onChange={(e) => setNomorNota(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Contoh: NOTA-001/2026" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nama Toko <span className="text-red-500">*</span></label>
                      <input type="text" value={namaToko} onChange={(e) => setNamaToko(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Contoh: Toko Jaya ATK" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Upload Nota (PDF/Gambar) <span className="text-red-500">*</span></label>
                      <input type="file" accept="application/pdf,image/*" onChange={handleNotaChange} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                      {notaName && <p className="text-xs text-green-600 mt-1">✅ {notaName}</p>}
                      <p className="text-xs text-gray-500 mt-1">Maks 2MB</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm">📦 Daftar Item</h4>
                    <button type="button" onClick={addItem} className="bg-teal-600 text-white px-3 py-1 rounded text-sm hover:bg-teal-700">+ Tambah Item</button>
                  </div>
                  {items.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg">
                      <p className="text-3xl mb-2">📦</p>
                      <p className="text-sm">Belum ada item</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border">
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-4">
                              <select value={item.atk_id} onChange={(e) => updateItem(idx, 'atk_id', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" required>
                                <option value="">-- Pilih ATK --</option>
                                {atks.map(atk => <option key={atk.id} value={atk.id}>{atk.nama} ({atk.kode})</option>)}
                              </select>
                            </div>
                            <div className="col-span-2">
                              <input type="number" value={item.jumlah} onChange={(e) => updateItem(idx, 'jumlah', Number(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" min="1" placeholder="Jumlah" required />
                            </div>
                            <div className="col-span-2">
                              <input type="text" value={item.satuan} onChange={(e) => updateItem(idx, 'satuan', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" placeholder="Satuan" required />
                            </div>
                            <div className="col-span-2">
                              <input type="number" value={item.harga} onChange={(e) => updateItem(idx, 'harga', Number(e.target.value))} className="w-full px-2 py-1 border rounded text-sm" min="0" placeholder="Harga" required />
                            </div>
                            <div className="col-span-2">
                              <select value={item.kategori_pembiayaan} onChange={(e) => updateItem(idx, 'kategori_pembiayaan', e.target.value)} className="w-full px-2 py-1 border rounded text-sm">
                                <option value="Kas Kecil">Kas Kecil</option>
                                <option value="Biaya Pemeliharaan">Biaya Pemeliharaan</option>
                              </select>
                            </div>
                          </div>
                          <div className="mt-2 flex justify-between items-center">
                            <input type="text" value={item.keterangan} onChange={(e) => updateItem(idx, 'keterangan', e.target.value)} className="flex-1 px-2 py-1 border rounded text-sm mr-2" placeholder="Keterangan (opsional)" />
                            <button type="button" onClick={() => removeItem(idx)} className="text-red-600 text-sm">🗑️</button>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">Subtotal: <span className="font-bold text-teal-700">{formatRupiah(item.jumlah * item.harga)}</span></p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {items.length > 0 && (
                  <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-teal-800"><strong>Total:</strong> {items.length} item</p>
                        <p className="text-lg font-bold text-teal-900">{formatRupiah(items.reduce((sum, item) => sum + (item.jumlah * item.harga), 0))}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={resetForm} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300">Batal</button>
                        <button type="submit" disabled={loading} className="bg-teal-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50">
                          {loading ? 'Menyimpan...' : '💾 Simpan Pembelian'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Pembelian */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">Detail Pembelian</h3>
                <button onClick={() => setShowDetail(null)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm"><strong>Nomor Nota:</strong> {showDetail.nomor_nota}</p>
                <p className="text-sm"><strong>Nama Toko:</strong> {showDetail.nama_toko || '-'}</p>
                <p className="text-sm"><strong>Tanggal:</strong> {formatTanggal(showDetail.tanggal)}</p>
                <p className="text-sm"><strong>Status:</strong> {showDetail.status === 'diterima' ? '✅ Diterima' : '⏳ Menunggu'}</p>
                {showDetail.diterima_oleh && <p className="text-sm"><strong>Diterima Oleh:</strong> {showDetail.diterima_oleh}</p>}
                {showDetail.nota_file && (
                  <p className="text-sm"><strong>File Nota:</strong> <a href={showDetail.nota_file} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">📄 {showDetail.nota_file_name}</a></p>
                )}
                <p className="text-sm"><strong>Total Nilai:</strong> {formatRupiah(showDetail.total_nilai || 0)}</p>
              </div>
              <h4 className="font-bold mb-2">Item:</h4>
              <table className="w-full mb-4 text-sm">
                <thead className="bg-gray-100">
                  <tr><th className="px-3 py-2 text-left">Nama</th><th className="px-3 py-2 text-center">Jumlah</th><th className="px-3 py-2 text-left">Satuan</th><th className="px-3 py-2 text-right">Harga</th><th className="px-3 py-2 text-right">Subtotal</th></tr>
                </thead>
                <tbody>
                  {showDetail.items?.map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{item.nama}</td>
                      <td className="px-3 py-2 text-center">{item.jumlah}</td>
                      <td className="px-3 py-2">{item.satuan}</td>
                      <td className="px-3 py-2 text-right">{formatRupiah(item.harga)}</td>
                      <td className="px-3 py-2 text-right font-bold">{formatRupiah(item.jumlah * item.harga)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-2">
                {showDetail.status === 'pending' && (
                  <button onClick={() => handleTerimaBarang(showDetail)} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium">
                    ✅ Terima Barang & Tambah Stok
                  </button>
                )}
                <button onClick={() => setShowDetail(null)} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300">Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview PDF Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">👁️ Preview Laporan Pembelian</h3>
              <div className="flex gap-2">
                <button 
                  onClick={handleDownload}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  📥 Download PDF
                </button>
                <button 
                  onClick={() => { setShowPreview(false); URL.revokeObjectURL(pdfUrl); }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm"
                >
                  ✕ Tutup
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
              <iframe 
                src={pdfUrl} 
                className="w-full h-full border rounded-lg"
                title="Preview PDF"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}