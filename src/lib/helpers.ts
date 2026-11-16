import { db } from './firebase';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';

// Generate nomor permohonan: NNNN/ATK/DIVISI/BULAN/TAHUN
export async function generateNomorPermohonan(divisi: string): Promise<string> {
  const now = new Date();
  const tahun = now.getFullYear();
  const bulan = now.getMonth() + 1;
  const docId = `permohonan_${tahun}`;
  
  const docRef = doc(db, 'nomor_kontrol', docId);
  const docSnap = await getDoc(docRef);
  
  let urutan = 1;
  if (docSnap.exists()) {
    urutan = docSnap.data().urutan_terakhir + 1;
    await setDoc(docRef, { urutan_terakhir: urutan }, { merge: true });
  } else {
    await setDoc(docRef, { jenis: 'permohonan', tahun, urutan_terakhir: 1 });
  }
  
  const nomorUrut = String(urutan).padStart(4, '0');
  return `${nomorUrut}/ATK/${divisi}/${bulan}/${tahun}`;
}

// Format tanggal Indonesia
export function formatTanggal(timestamp: any): string {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

// Format status dengan warna
export function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; color: string }> = {
    'draft': { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
    'pending_admin': { label: 'Menunggu Admin', color: 'bg-yellow-100 text-yellow-700' },
    'pending_tl': { label: 'Menunggu TL', color: 'bg-blue-100 text-blue-700' },
    'pending_asman': { label: 'Menunggu Asman', color: 'bg-purple-100 text-purple-700' },
    'approved': { label: 'Disetujui', color: 'bg-green-100 text-green-700' },
    'rejected': { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
    'delivered': { label: 'Diserahkan', color: 'bg-indigo-100 text-indigo-700' },
  };
  return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
}