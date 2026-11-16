'use client';

import { Suspense, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';

function PrintContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const [ba, setBa] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBA = async () => {
      if (!id) { setLoading(false); return; }
      try {
        const docSnap = await getDoc(doc(db, 'ba_serah_terima', id));
        if (docSnap.exists()) {
          setBa({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBA();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const formatTanggalLengkap = (timestamp: any): string => {
    if (!timestamp) return '....................';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.getDate()} ${date.toLocaleDateString('id-ID', { month: 'long' })} ${date.getFullYear()}`;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
  }

  if (!ba) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">BA tidak ditemukan</p>
          <button onClick={() => router.push('/dashboard/ba')} className="bg-teal-600 text-white px-4 py-2 rounded-lg">← Kembali</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="no-print bg-white border-b sticky top-0 z-50 p-4 flex justify-between items-center shadow-lg">
        <button onClick={() => router.back()} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium">
          ← Kembali
        </button>
        <h1 className="font-bold text-lg">Preview BA: {ba.nomor}</h1>
        <button onClick={handlePrint} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">
          🖨️ Cetak BA
        </button>
      </div>

      <div className="ba-document bg-white max-w-4xl mx-auto my-8 shadow-lg">
        <div className="ba-content p-12">
          <div className="flex items-center gap-6 pb-4 border-b-4 border-black mb-8">
            <img src="/logo-pln.png" alt="Logo PLN" className="w-24 h-24 object-contain flex-shrink-0" />
            <div className="flex-1">
              <h1 className="text-xl font-bold">PT PLN (PERSERO)</h1>
              <h2 className="text-base font-semibold">UP3 SANGGAU</h2>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-xl font-bold underline tracking-wide">BERITA ACARA SERAH TERIMA BARANG</h2>
            <p className="text-sm mt-3">Nomor: <span className="font-mono font-bold">{ba.nomor}</span></p>
          </div>

          <div className="mb-6 text-sm leading-relaxed text-justify">
            <p>
              Pada hari ini, <span className="inline-block border-b border-black w-32"></span>, tanggal{' '}
              <span className="inline-block border-b border-black w-16"></span> bulan{' '}
              <span className="inline-block border-b border-black w-32"></span> tahun{' '}
              <span className="inline-block border-b border-black w-20"></span>, telah dilaksanakan serah terima barang berupa Alat Tulis Kantor (ATK), dengan rincian sebagai berikut:
            </p>
          </div>

          <table className="w-full border-collapse border-2 border-black mb-6 text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border-2 border-black px-3 py-2 text-center w-12 font-bold">No.</th>
                <th className="border-2 border-black px-3 py-2 text-left font-bold">Nama Barang</th>
                <th className="border-2 border-black px-3 py-2 text-center w-20 font-bold">Jumlah</th>
                <th className="border-2 border-black px-3 py-2 text-left w-24 font-bold">Satuan</th>
              </tr>
            </thead>
            <tbody>
              {ba.items.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="border-2 border-black px-3 py-2 text-center">{index + 1}</td>
                  <td className="border-2 border-black px-3 py-2">{item.nama}</td>
                  <td className="border-2 border-black px-3 py-2 text-center">{item.diterima || item.jumlah}</td>
                  <td className="border-2 border-black px-3 py-2">{item.satuan}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mb-16 text-sm leading-relaxed text-justify">
            <p>
              Demikian Berita Acara Serah Terima Barang ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 mt-20">
            <div className="text-center">
              <p className="font-bold mb-2">Yang Menyerahkan</p>
              <p className="text-xs mb-20">Tanggal: {formatTanggalLengkap(ba.tanggal_serah_terima)}</p>
              <p className="font-bold underline">(....................................)</p>
              <p className="text-sm mt-2 font-semibold">{ba.nama_penyerah || 'Admin'}</p>
              <p className="text-xs italic">{ba.jabatan_penyerah || 'Admin UP3'}</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-2">Yang Menerima</p>
              <p className="text-xs mb-20">Tanggal: {formatTanggalLengkap(ba.tanggal_serah_terima)}</p>
              <p className="font-bold underline">(....................................)</p>
              <p className="text-sm mt-2 font-semibold">{ba.tanda_terima}</p>
              <p className="text-xs italic">{ba.divisi}</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body * { visibility: hidden !important; }
          .ba-document, .ba-document * { visibility: visible !important; }
          .ba-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
          .ba-content { padding: 20mm !important; }
          .no-print { display: none !important; }
          aside, header, nav { display: none !important; }
        }
      `}</style>
    </>
  );
}

export default function PrintBAPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Memuat...</div>}>
      <PrintContent />
    </Suspense>
  );
}