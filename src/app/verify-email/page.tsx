'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, RefreshCw, Mail, ArrowLeft } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (token) {
      verifyWithToken(token);
    }
  }, [token]);

  const verifyWithToken = async (token: string) => {
    setStatus('loading');
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatus('success');
        setMessage('Votre email a été vérifié avec succès !');
      } else {
        setStatus('error');
        setMessage(data.error || 'Erreur lors de la vérification');
      }
    } catch {
      setStatus('error');
      setMessage('Erreur de connexion');
    }
  };

  const verifyWithCode = async () => {
    if (!code || !email) return;
    
    setVerifying(true);
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatus('success');
        setMessage('Votre email a été vérifié avec succès !');
      } else {
        setMessage(data.error || 'Code invalide');
      }
    } catch {
      setMessage('Erreur de connexion');
    } finally {
      setVerifying(false);
    }
  };

  const resendVerification = async () => {
    if (!email) return;
    
    setVerifying(true);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      setMessage('Si un compte existe, un nouveau code a été envoyé');
    } catch {
      setMessage('Erreur lors de l\'envoi');
    } finally {
      setVerifying(false);
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
          <p className="text-slate-500 mt-2">Vérification de l'email</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {status === 'loading' && token && (
            <div className="text-center py-8">
              <RefreshCw className="w-12 h-12 text-[#ff7f00] animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Vérification en cours...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Email vérifié !</h2>
              <p className="text-slate-600 mb-6">{message}</p>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-3 bg-[#ff7f00] text-white rounded-xl font-medium hover:bg-[#ff6600] transition-colors"
              >
                Se connecter
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Erreur</h2>
              <p className="text-slate-600 mb-6">{message}</p>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Retour à la connexion
              </button>
            </div>
          )}

          {/* Code verification form */}
          {status !== 'success' && (!token || status === 'error') && (
            <div>
              <div className="text-center mb-6">
                <Mail className="w-12 h-12 text-[#ff7f00] mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Entrez votre code</h2>
                <p className="text-slate-500 text-sm">
                  Entrez votre email et le code à 6 chiffres reçu par email
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#ff7f00]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Code de vérification</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-[#ff7f00]"
                    maxLength={6}
                  />
                </div>

                <button
                  onClick={verifyWithCode}
                  disabled={verifying || code.length !== 6 || !email}
                  className="w-full py-3 bg-[#ff7f00] text-white rounded-xl font-medium hover:bg-[#ff6600] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? 'Vérification...' : 'Vérifier'}
                </button>

                {message && status !== 'success' && (
                  <p className="text-center text-red-500 text-sm">{message}</p>
                )}

                <button
                  onClick={resendVerification}
                  disabled={verifying || !email}
                  className="w-full py-3 text-[#ff7f00] font-medium hover:underline"
                >
                  Renvoyer le code
                </button>
              </div>
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#ff7f00] animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
