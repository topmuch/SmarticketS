'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (!token) {
      setError('Token manquant');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.error || 'Erreur lors de la réinitialisation');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-[#ff7f00]">QRTrans</h1>
          </Link>
          <p className="text-slate-500 mt-2">Nouveau mot de passe</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {!success ? (
            <>
              <div className="text-center mb-6">
                <Lock className="w-12 h-12 text-[#ff7f00] mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Définir un nouveau mot de passe</h2>
                <p className="text-slate-500 text-sm">
                  Entrez votre nouveau mot de passe ci-dessous.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl focus:outline-none focus:border-[#ff7f00]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Confirmer le mot de passe</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#ff7f00]"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full py-3 bg-[#ff7f00] text-white rounded-xl font-medium hover:bg-[#ff6600] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Réinitialisation...
                    </>
                  ) : (
                    'Réinitialiser le mot de passe'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Mot de passe réinitialisé !</h2>
              <p className="text-slate-600 mb-4">
                Votre mot de passe a été modifié avec succès. Vous allez être redirigé vers la page de connexion.
              </p>
            </div>
          )}

          {/* Back link */}
          <div className="mt-6 text-center">
            <Link href="/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#ff7f00] animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
