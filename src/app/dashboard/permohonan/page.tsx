'use client';

import { getCurrentUser } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { generateNomorPermohonan, formatTanggal, getStatusBadge } from '@/lib/helpers';

interface Item { atk_id: string; atk_nama: string; jumlah: number; satuan: string; }
interface Permohonan {
  id: string; nomor: string; nomor_nota_dinas: string; file_nota_dinas_base64: string;
  file_nota_dinas_name: string; nama_pemohon: string; divisi: string; username: string;
  nip_pemohon: string; tanggal_pengajuan: any; status: string; items: Item[]; catatan: string;
  approval_admin: any; approval_tl: any; approval_asman: any; created_at: any;
}
interface ATK { id: string; kode: string; nama: string; satuan: string; stok_tersedia: number; }

export default function PermohonanPage() {
  const [user, setUser] = useState<any>(null);
  const [permohonans, setPermohonans] = useState<Permohonan[]>([]);
  const [atks, setAtks] = useState<ATK[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<Permohonan | null>(null);
  const [filterStatus, setFilterStatus] = useState('semua');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nomor_nota_dinas: '', file_nota_dinas_base64: '', file_nota_dinas_name: '',
    file_nota_dinas_original: '', catatan: '', items: [] as Item[],
  });

  useEffect(() => {
    const userData = getCurrentUser();
    if (userData) setUser(userData);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'permohonans'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Permohonan[];
      if (user.role === 'user') setPermohonans(data.filter(p => p.username === user.username));
      else setPermohonans(data);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'atks'), (snapshot) => {
      setAtks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ATK[]);
    });
    return () => unsubscribe();
  }, []);

  const addItem = () => setFormData({ ...formData, items: [...formData.items, { atk_id: '', atk_nama: '', jumlah: 1, satuan: 'buah' }] });

  const updateItem = (index: number, field: keyof Item, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'atk_id') {
      const atk = atks.find(a => a.id === value);
      if (atk) { newItems[index].atk_nama = atk.nama; newItems[index].satuan = atk.satuan; }
    }
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') { alert('Hanya file PDF yang diperbolehkan!'); e.target.value = ''; return; }
      if (file.size > 500 * 1024) { alert('Ukuran file maksimal 500KB!'); e.target.value = ''; return; }
      const reader = new FileReader();
      reader.onload = () => {
        setFormData({ ...formData, file_nota_dinas_base64: reader.result as string, file_nota_dinas_name: file.name, file_nota_dinas_original: file.name });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateFileName = (nomor: string, divisi: string) => {
    const now = new Date();
    return `${nomor.split('/')[0]}/NODIN/${divisi}/${now.getMonth() + 1}/${now.getFullYear()}.pdf`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) { alert('Tambahkan minimal 1 item ATK!'); return; }
    if (!formData.nomor_nota_dinas.trim()) { alert('Nomor Nota Dinas wajib diisi!'); return; }
    if (!formData.file_nota_dinas_base64) { alert('File Nota Dinas (PDF) wajib diupload!'); return; }
    if (!user || !user.nama) { alert('Data user tidak lengkap. Silakan login ulang.'); return; }

    setLoading(true);
    try {
      const nomor = await generateNomorPermohonan(user.divisi || 'UMUM');
      const fileName = generateFileName(nomor, user.divisi || 'UMUM');

      await addDoc(collection(db, 'permohonans'), {
        nomor, nomor_nota_dinas: formData.nomor_nota_dinas,
        file_nota_dinas_base64: formData.file_nota_dinas_base64,
        file_nota_dinas_name: fileName, file_nota_dinas_original: formData.file_nota_dinas_original,
        nama_pemohon: user.nama, divisi: user.divisi || 'UMUM', username: user.username || 'unknown',
        nip_pemohon: user.nip || '-', tanggal_pengajuan: new Date(), status: 'pending_admin',
        items: formData.items, catatan: formData.catatan,
        approval_admin: { status: 'pending', by: null, tanggal: null, catatan: null },
        approval_tl: { status: 'pending', by: null, tanggal: null, catatan: null },
        approval_asman: { status: 'pending', by: null, tanggal: null, catatan: null },
        created_at: new Date(), updated_at: new Date(),
      });

      alert(`✅ Permohonan berhasil diajukan!\n\nNomor: ${nomor}\nFile: ${fileName}`);
      resetForm();
    } catch (error) { alert('Gagal mengajukan permohonan: ' + (error as Error).message); }
    finally { setLoading(false); }
  };

  const handleApproval = async (permohonan: Permohonan, action: 'approve' | 'reject', level: 'admin' | 'tl' | 'asman') => {
    const catatan = prompt(`Catatan ${action === 'approve' ? 'persetujuan' : 'penolakan'}:`);
    if (catatan === null) return;
    setLoading(true);
    try {
      const approvalData = { status: action === 'approve' ? 'approved' : 'rejected', by: user.nama, tanggal: new Date(), catatan };
      let nextStatus = permohonan.status;
      if (action === 'reject') nextStatus = 'rejected';
      else if (level === 'admin') nextStatus = 'pending_tl';
      else if (level === 'tl') nextStatus = 'pending_asman';
      else if (level === 'asman') nextStatus = 'approved';

      await updateDoc(doc(db, 'permohonans', permohonan.id), { [`approval_${level}`]: approvalData, status: nextStatus, updated_at: new Date() });
      alert(`Permohonan ${action === 'approve' ? 'disetujui' : 'ditolak'}!`);
    } catch (error) { alert('Gagal memproses approval'); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormData({ nomor_nota_dinas: '', file_nota_dinas_base64: '', file_nota_dinas_name: '', file_nota_dinas_original: '', catatan: '', items: [] });
    setShowForm(false);
  };

  const filteredPermohonans = filterStatus === 'semua' ? permohonans : permohonans.filter(p => p.status === filterStatus);

  const canApprove = (p: Permohonan, level: string) => {
    if (!user || user.role !== level) return false;
    if (level === 'admin' && p.status !== 'pending_admin') return false;
    if (level === 'tl' && p.status !== 'pending_tl') return false;
    if (level === 'asman' && p.status !== 'pending_asman') return false;
    return true;
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">📝 Permohonan ATK</h2>
        {user.role === 'user' && (
          <button onClick={() => setShowForm(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium">+ Ajukan Permohonan</button>
        )}
      </div>

      {user.role === 'user' && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Informasi:</strong> Sebelum mengajukan permohonan, pastikan Anda sudah membuat <strong>Nota Dinas Permohonan ATK</strong> melalui <strong>AMS Korporat</strong> dan memiliki <strong>nomor nota dinas</strong> serta <strong>file PDF</strong>-nya (maks 500KB).
          </p>
          <p className="text-xs text-blue-600 mt-1">📁 File akan disimpan dengan format: <strong>1234/NODIN/DIVISI/BULAN/2026.pdf</strong></p>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <label className="text-sm font-medium text-gray-700 mr-2">Filter Status:</label>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500">
          <option value="semua">Semua Status</option>
          <option value="draft">Draft</option><option value="pending_admin">Menunggu Admin</option>
          <option value="pending_tl">Menunggu TL</option><option value="pending_asman">Menunggu Asman</option>
          <option value="approved">Disetujui</option><option value="rejected">Ditolak</option>
          <option value="delivered">Diserahkan</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nomor</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No. Nota Dinas</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama File</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Pemohon</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Divisi</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tanggal</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredPermohonans.map((p) => {
                const badge = getStatusBadge(p.status);
                return (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono">{p.nomor}</td>
                    <td className="px-4 py-3 text-sm font-mono text-blue-700">{p.nomor_nota_dinas || '-'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">{p.file_nota_dinas_name || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{p.nama_pemohon}</td>
                    <td className="px-4 py-3 text-sm">{p.divisi}</td>
                    <td className="px-4 py-3 text-sm">{formatTanggal(p.tanggal_pengajuan)}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.label}</span></td>
                    <td className="px-4 py-3 text-center space-x-1">
                      <button onClick={() => setShowDetail(p)} className="text-blue-600 hover:text-blue-800 text-sm">👁️ Detail</button>
                      {canApprove(p, 'admin') && (<><button onClick={() => handleApproval(p, 'approve', 'admin')} className="text-green-600 hover:text-green-800 text-sm">✅</button><button onClick={() => handleApproval(p, 'reject', 'admin')} className="text-red-600 hover:text-red-800 text-sm">❌</button></>)}
                      {canApprove(p, 'tl') && (<><button onClick={() => handleApproval(p, 'approve', 'tl')} className="text-green-600 hover:text-green-800 text-sm">✅</button><button onClick={() => handleApproval(p, 'reject', 'tl')} className="text-red-600 hover:text-red-800 text-sm">❌</button></>)}
                      {canApprove(p, 'asman') && (<><button onClick={() => handleApproval(p, 'approve', 'asman')} className="text-green-600 hover:text-green-800 text-sm">✅</button><button onClick={() => handleApproval(p, 'reject', 'asman')} className="text-red-600 hover:text-red-800 text-sm">❌</button></>)}
                    </td>
                  </tr>
                );
              })}
              {filteredPermohonans.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">Belum ada permohonan</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">📝 Ajukan Permohonan ATK Baru</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Info Pemohon */}
                <div className="bg-blue-50 p-3 rounded-lg text-sm">
                  <p><strong>Pemohon:</strong> {user.nama || '-'}</p>
                  <p><strong>Divisi:</strong> {user.divisi || '-'}</p>
                  <p><strong>Nomor Permohonan:</strong> Akan digenerate otomatis</p>
                </div>

                {/* 2. Nomor Nota Dinas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Nota Dinas <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.nomor_nota_dinas} onChange={(e) => setFormData({ ...formData, nomor_nota_dinas: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" placeholder="Contoh: ND/001/KKU/11/2026" required />
                </div>

                {/* 3. Item ATK */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Item ATK</label>
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 mb-2 items-start">
                      <select value={item.atk_id} onChange={(e) => updateItem(index, 'atk_id', e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" required>
                        <option value="">Pilih ATK...</option>
                        {atks.map(atk => <option key={atk.id} value={atk.id}>{atk.nama} (Stok: {atk.stok_tersedia} {atk.satuan})</option>)}
                      </select>
                      <input type="number" value={item.jumlah} onChange={(e) => updateItem(index, 'jumlah', Number(e.target.value))} className="w-20 px-3 py-2 border rounded-lg text-sm" min="1" required />
                      <button type="button" onClick={() => removeItem(index)} className="text-red-600 px-2">🗑️</button>
                    </div>
                  ))}
                  <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:text-blue-800 mt-2">+ Tambah Item</button>
                </div>

                {/* 4. Catatan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                  <textarea value={formData.catatan} onChange={(e) => setFormData({ ...formData, catatan: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} placeholder="Contoh: Untuk kebutuhan rapat koordinasi..." />
                </div>

                {/* 5. File Nota Dinas (PDF) - DIPINDAH KE BAWAH */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">File Nota Dinas (PDF) <span className="text-red-500">*</span></label>
                  <input type="file" accept="application/pdf" onChange={handleFileChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" required />
                  {formData.file_nota_dinas_original && <p className="text-xs text-green-600 mt-1">✅ File asli: {formData.file_nota_dinas_original}</p>}
                  <p className="text-xs text-gray-500 mt-1">Maksimal 500KB, format PDF saja</p>
                </div>

                {/* 6. Tombol Submit */}
                <div className="flex gap-2 pt-2 border-t">
                  <button type="submit" disabled={loading} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">{loading ? 'Mengajukan...' : 'Ajukan Permohonan'}</button>
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
                <h3 className="text-xl font-bold">Detail Permohonan</h3>
                <button onClick={() => setShowDetail(null)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm"><strong>Nomor Permohonan:</strong> {showDetail.nomor}</p>
                <p className="text-sm"><strong>Nomor Nota Dinas:</strong> <span className="text-blue-700 font-mono">{showDetail.nomor_nota_dinas || '-'}</span></p>
                <p className="text-sm"><strong>Nama File:</strong> <span className="font-mono text-xs">{showDetail.file_nota_dinas_name || '-'}</span></p>
                {showDetail.file_nota_dinas_base64 && (
                  <p className="text-sm"><strong>File Nota Dinas:</strong> <a href={showDetail.file_nota_dinas_base64} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">📄 {showDetail.file_nota_dinas_name || 'Lihat PDF'}</a></p>
                )}
                <p className="text-sm"><strong>Pemohon:</strong> {showDetail.nama_pemohon} ({showDetail.divisi})</p>
                <p className="text-sm"><strong>NIP:</strong> {showDetail.nip_pemohon}</p>
                <p className="text-sm"><strong>Tanggal:</strong> {formatTanggal(showDetail.tanggal_pengajuan)}</p>
                <p className="text-sm"><strong>Catatan:</strong> {showDetail.catatan || '-'}</p>
              </div>
              <h4 className="font-bold mb-2">Item ATK:</h4>
              <table className="w-full mb-4 text-sm">
                <thead className="bg-gray-100"><tr><th className="px-3 py-2 text-left">Nama</th><th className="px-3 py-2 text-center">Jumlah</th><th className="px-3 py-2 text-left">Satuan</th></tr></thead>
                <tbody>{showDetail.items.map((item, i) => (<tr key={i} className="border-t"><td className="px-3 py-2">{item.atk_nama}</td><td className="px-3 py-2 text-center">{item.jumlah}</td><td className="px-3 py-2">{item.satuan}</td></tr>))}</tbody>
              </table>
              <h4 className="font-bold mb-2">Tracking Approval:</h4>
              <div className="space-y-2 mb-4">
                <div className={`p-3 rounded-lg ${showDetail.approval_admin?.status === 'approved' ? 'bg-green-50' : showDetail.approval_admin?.status === 'rejected' ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className="text-sm font-medium">1️⃣ Admin (Verifikasi)</p>
                  <p className="text-xs">{showDetail.approval_admin?.status === 'pending' ? '⏳ Menunggu' : showDetail.approval_admin?.status === 'approved' ? `✅ ${showDetail.approval_admin.by} - ${formatTanggal(showDetail.approval_admin.tanggal)}` : '❌ Ditolak'}</p>
                  {showDetail.approval_admin?.catatan && <p className="text-xs text-gray-600">Catatan: {showDetail.approval_admin.catatan}</p>}
                </div>
                <div className={`p-3 rounded-lg ${showDetail.approval_tl?.status === 'approved' ? 'bg-green-50' : showDetail.approval_tl?.status === 'rejected' ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className="text-sm font-medium">2️⃣ TL (Approval 1)</p>
                  <p className="text-xs">{showDetail.approval_tl?.status === 'pending' ? '⏳ Menunggu' : showDetail.approval_tl?.status === 'approved' ? `✅ ${showDetail.approval_tl.by} - ${formatTanggal(showDetail.approval_tl.tanggal)}` : '❌ Ditolak'}</p>
                  {showDetail.approval_tl?.catatan && <p className="text-xs text-gray-600">Catatan: {showDetail.approval_tl.catatan}</p>}
                </div>
                <div className={`p-3 rounded-lg ${showDetail.approval_asman?.status === 'approved' ? 'bg-green-50' : showDetail.approval_asman?.status === 'rejected' ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className="text-sm font-medium">3️⃣ Asman (Approval Akhir)</p>
                  <p className="text-xs">{showDetail.approval_asman?.status === 'pending' ? '⏳ Menunggu' : showDetail.approval_asman?.status === 'approved' ? `✅ ${showDetail.approval_asman.by} - ${formatTanggal(showDetail.approval_asman.tanggal)}` : '❌ Ditolak'}</p>
                  {showDetail.approval_asman?.catatan && <p className="text-xs text-gray-600">Catatan: {showDetail.approval_asman.catatan}</p>}
                </div>
              </div>
              <button onClick={() => setShowDetail(null)} className="w-full bg-gray-200 py-2 rounded-lg hover:bg-gray-300">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}