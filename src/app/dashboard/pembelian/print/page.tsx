'use client';

import { getCurrentUser } from '@/lib/auth';
import { Suspense, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';

function PrintContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPO = async () => {
      if (!id) { setLoading(false); return; }
      try {
        const docSnap = await getDoc(doc(db, 'pembelian', id));
        if (docSnap.exists()) {
          setPo({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPO();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const formatTanggalLengkap = (timestamp: any): string => {
    if (!timestamp) return '....................';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.getDate()} ${date.toLocaleDateString('id-ID', { month: 'long' })} ${date.getFullYear()}`;
  };

  const formatRupiah = (angka: number) => 'Rp ' + angka.toLocaleString('id-ID');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
  }

  if (!po) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">PO tidak ditemukan</p>
          <button onClick={() => router.push('/dashboard/pembelian')} className="bg-teal-600 text-white px-4 py-2 rounded-lg">← Kembali</button>
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
        <h1 className="font-bold text-lg">Preview PO: {po.nomor}</h1>
        <button onClick={handlePrint} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">
          🖨️ Cetak PO
        </button>
      </div>

      <div className="po-document bg-white max-w-4xl mx-auto my-8 shadow-lg">
        <div className="po-content p-12">
          <div className="flex items-center gap-6 pb-4 border-b-4 border-black mb-8">
            <img src="/logo-pln.png" alt="Logo PLN" className="w-24 h-24 object-contain flex-shrink-0" />
            <div className="flex-1">
              <h1 className="text-xl font-bold">PT PLN (PERSERO)</h1>
              <h2 className="text-base font-semibold">UP3 SANGGAU</h2>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-xl font-bold underline tracking-wide">PURCHASE ORDER</h2>
            <p className="text-sm mt-3">Nomor: <span className="font-mono font-bold">{po.nomor}</span></p>
          </div>

          <div className="mb-6 text-sm">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500">Tanggal PO</p>
                <p className="font-medium">{formatTanggalLengkap(po.tanggal_po)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Dibuat Oleh</p>
                <p className="font-medium">{po.nama_admin || 'Admin'}</p>
              </div>
            </div>
          </div>

          <table className="w-full border-collapse border-2 border-black mb-6 text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border-2 border-black px-3 py-2 text-center w-12 font-bold">No.</th>
                <th className="border-2 border-black px-3 py-2 text-left font-bold">Nama Barang</th>
                <th className="border-2 border-black px-3 py-2 text-center w-20 font-bold">Jumlah</th>
                <th className="border-2 border-black px-3 py-2 text-left w-24 font-bold">Satuan</th>
                <th className="border-2 border-black px-3 py-2 text-right w-32 font-bold">Harga Satuan</th>
                <th className="border-2 border-black px-3 py-2 text-right w-32 font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="border-2 border-black px-3 py-2 text-center">{index + 1}</td>
                  <td className="border-2 border-black px-3 py-2">{item.nama}</td>
                  <td className="border-2 border-black px-3 py-2 text-center">{item.jumlah}</td>
                  <td className="border-2 border-black px-3 py-2">{item.satuan}</td>
                  <td className="border-2 border-black px-3 py-2 text-right">{formatRupiah(item.harga)}</td>
                  <td className="border-2 border-black px-3 py-2 text-right font-bold">{formatRupiah(item.total)}</td>
                </tr>
              ))}
              <tr className="bg-teal-50 font-bold">
                <td colSpan={5} className="border-2 border-black px-3 py-2 text-right">TOTAL</td>
                <td className="border-2 border-black px-3 py-2 text-right text-teal-800">{formatRupiah(po.total_nilai || 0)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mb-16 text-sm leading-relaxed text-justify">
            <p>
              Demikian Purchase Order ini dibuat untuk dipergunakan sebagai dasar pembelian Alat Tulis Kantor (ATK) sesuai dengan rincian di atas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 mt-20">
            <div className="text-center">
              <p className="font-bold mb-2">Dibuat oleh,</p>
              <p className="text-xs mb-20">Admin UP3 Sanggau</p>
              <p className="font-bold underline">(....................................)</p>
              <p className="text-sm mt-2 font-semibold">{po.nama_admin || 'Admin'}</p>
              <p className="text-xs italic">Admin UP3</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-2">Disetujui oleh,</p>
              <p className="text-xs mb-20">Tanggal: {formatTanggalLengkap(po.tanggal_po)}</p>
              <p className="font-bold underline">(....................................)</p>
              <p className="text-sm mt-2 font-semibold">{po.nama_tl}</p>
              <p className="text-xs italic">{po.jabatan_tl}</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body * { visibility: hidden !important; }
          .po-document, .po-document * { visibility: visible !important; }
          .po-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
          .po-content { padding: 20mm !important; }
          .no-print { display: none !important; }
          aside, header, nav { display: none !important; }
        }
      `}</style>
    </>
  );
}

export default function PrintPOPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Memuat...</div>}>
      <PrintContent />
    </Suspense>
  );
}