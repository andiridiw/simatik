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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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

      if (rememberMe) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      } else {
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
      }

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
    <div className="min-h-screen flex flex-col bg-white">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo SIMATIK di atas */}
          <div className="flex justify-center mb-6">
            <img 
              src="/logo-simatik.png" 
              alt="SIMATIK" 
              className="w-24 h-24 object-contain"
            />
          </div>

          {/* Card Login */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign In</h2>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-sm"
                  placeholder="Username"
                  required
                />
              </div>

              {/* Password */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-sm pr-10"
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-600"
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-gray-700">
                  Remember Me?
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                  <p className="text-sm text-red-700">❌ {error}</p>
                </div>
              )}

              {/* Tombol Sign In */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 text-white py-3 rounded-md hover:bg-teal-700 font-medium transition disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'Sign In'}
              </button>

              {/* Forgot Password */}
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => alert('Silakan hubungi Administrator SIMATIK untuk reset password.\n\nEmail: admin@pln-up3-sanggau.co.id')}
                  className="text-sm text-teal-600 hover:text-teal-800"
                >
                  Forgot Password
                </button>
              </div>
            </form>
          </div>

          {/* Privacy & Terms */}
          <div className="flex justify-between mt-4 px-2">
            <button
              type="button"
              onClick={() => alert('Kebijakan Privasi SIMATIK\n\nData Anda dilindungi dan hanya digunakan untuk keperluan monitoring ATK PLN UP3 Sanggau.')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => alert('Syarat & Ketentuan SIMATIK\n\nDengan menggunakan SIMATIK, Anda menyetujui untuk mematuhi tata tertib pengelolaan ATK PLN UP3 Sanggau.')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Terms
            </button>
          </div>
        </div>
      </div>

      {/* Footer Bar - Style IAM PLN */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-pln.png" alt="PLN" className="w-8 h-8 object-contain" />
            <div>
              <p className="text-sm font-semibold">SIMATIK Identity and Access Management</p>
              <p className="text-xs text-teal-100">Copyright © 2018 - 2026 PT PLN (Persero) UP3 Sanggau</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="bg-teal-500 text-xs px-2 py-1 rounded">v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}