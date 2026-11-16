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
      // 1. Ambil data user dari Firestore
      const userDoc = await getDoc(doc(db, 'users', username));
      
      if (!userDoc.exists()) { 
        throw new Error('Username tidak ditemukan');
      }

      const data = userDoc.data();
      console.log('Data Firestore:', data);

      // 2. Ambil email (coba berbagai kemungkinan nama field)
      const email = data.Email || data.email;
      const nama = data.nama || data.Nama || 'User';
      const role = data.role || 'user';
      const divisi = data.Divisi || data.divisi || '-';
      const nip = data.NIP || data.nip || '-';

      if (!email) {
        throw new Error('Email tidak ditemukan di data user');
      }

      console.log('Login dengan email:', email);

      // 3. Login ke Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Login berhasil!');

      // 4. Simpan ke localStorage
      const userData = { username, nama, role, divisi, nip, email };
      localStorage.setItem('currentUser', JSON.stringify(userData));
      console.log('Data tersimpan:', userData);

      // 5. Redirect ke dashboard
      console.log('Redirect ke dashboard...');
      window.location.href = '/dashboard';
      
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Login gagal');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-400 to-red-500 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="mb-6">
          <img src="/header-simatik.png" alt="SIMATIK" className="w-full h-auto max-h-32 object-contain rounded-lg" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="admin" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="P@ssw0rd123#" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" 
              required 
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-medium"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">Default: <strong>admin</strong> / <strong>P@ssw0rd123#</strong></p>
        </div>
      </div>
    </div>
  );
}