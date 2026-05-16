'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Send, CheckCircle, RefreshCw } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      setSent(true);
    } catch {
      // Still show success to prevent email enumeration
      setSent(true);
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
          <p className="text-slate-500 mt-2">Réinitialisation du mot de passe</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {!sent ? (
            <>
              <div className="text-center mb-6">
                <Mail className="w-12 h-12 text-[#ff7f00] mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Mot de passe oublié ?</h2>
                <p className="text-slate-500 text-sm">
                  Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#ff7f00]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 bg-[#ff7f00] text-white rounded-xl font-medium hover:bg-[#ff6600] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Envoyer le lien
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Email envoyé !</h2>
              <p className="text-slate-600 mb-6">
                Si un compte existe avec l&apos;adresse <strong>{email}</strong>, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-[#ff7f00] font-medium hover:underline"
              >
                Renvoyer un autre email
              </button>
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
