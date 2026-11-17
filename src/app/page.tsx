'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userDoc = await getDoc(doc(db, 'users', username));
      if (!userDoc.exists()) {
        setError('Username tidak ditemukan');
        setLoading(false);
        return;
      }

      const userData = userDoc.data() as any;
      const email = userData.Email;

      if (!email) {
        setError('Email tidak terdaftar di sistem');
        setLoading(false);
        return;
      }

      await signInWithEmailAndPassword(auth, email, password);

      const currentUser = {
        username,
        nama: userData.nama,
        role: userData.role,
        jabatan: userData.jabatan,
        divisi: userData.divisi,
        nip: userData.NIP,
        email: email,
      };

      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      router.push('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Password salah');
      } else {
        setError('Login gagal: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-600 via-teal-700 to-blue-800 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header dengan Logo Baru */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-8 text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo-simatik.png" 
              alt="SIMATIK" 
              className="w-32 h-32 object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">SIMATIK</h1>
          <p className="text-teal-100 text-sm">Sistem Informasi Monitoring Alat Tulis Kantor</p>
          <p className="text-teal-200 text-xs mt-1">PLN UP3 Sanggau</p>
        </div>

        {/* Form Login */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Masuk ke Akun Anda</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Masukkan username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Masukkan password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                <p className="text-sm text-red-700">❌ {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 font-medium transition disabled:opacity-50"
            >
              {loading ? 'Memproses...' : '🔐 Masuk'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-gray-500 text-center font-medium mb-2">Akun Demo:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-purple-50 p-2 rounded text-center">
                <p className="font-bold text-purple-700">fitri.lestari</p>
                <p className="text-gray-500">Admin</p>
              </div>
              <div className="bg-blue-50 p-2 rounded text-center">
                <p className="font-bold text-blue-700">andi.maulana</p>
                <p className="text-gray-500">TL</p>
              </div>
              <div className="bg-orange-50 p-2 rounded text-center">
                <p className="font-bold text-orange-700">maulana.alfarisiy</p>
                <p className="text-gray-500">Asman</p>
              </div>
              <div className="bg-green-50 p-2 rounded text-center">
                <p className="font-bold text-green-700">ahmad.gusti</p>
                <p className="text-gray-500">Officer</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">Password: <strong>P@ssw0rd123#</strong></p>
          </div>
        </div>

        <div className="bg-gray-50 px-8 py-4 text-center">
          <p className="text-xs text-gray-500">Tatakelola ATK Lebih Efisien</p>
          <p className="text-xs text-teal-700 font-medium">Mendukung Energi untuk Negeri ⚡</p>
          <p className="text-xs text-gray-400 mt-1">© 2026 PLN UP3 Sanggau</p>
        </div>
      </div>
    </div>
  );
}