/**
 * Controller PWA Login — /controller/login
 *
 * Modern code-based login for controllers with the new SmarticketS dark theme.
 * Uses phone number + 4-digit access code (sent via WhatsApp onboarding).
 * JWT tokens stored in localStorage for offline access.
 * Dark theme (#1a1a2e, #16213e) with emerald accent (#00d9a3).
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bus, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

type LoginStatus = 'idle' | 'loading' | 'error';

// Storage keys for JWT tokens
const STORAGE_KEYS = {
  accessToken: 'smartickets_staff_access_token',
  refreshToken: 'smartickets_staff_refresh_token',
  staffData: 'smartickets_staff_data',
};

export default function ControllerLoginPage() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<LoginStatus>('idle');
  const [error, setError] = useState('');
  const mounted = useRef(false);

  // Check for existing valid session on mount (runs once only)
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const token = localStorage.getItem(STORAGE_KEYS.accessToken);
    const staffData = localStorage.getItem(STORAGE_KEYS.staffData);
    if (token && staffData) {
      try {
        const data = JSON.parse(staffData);
        if (data.role === 'CONTROLLER') {
          routerRef.current.replace('/controller/validate');
        }
      } catch {
        localStorage.removeItem(STORAGE_KEYS.accessToken);
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        localStorage.removeItem(STORAGE_KEYS.staffData);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setStatus('loading');

      try {
        const res = await fetch('/api/auth/field-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, code }),
        });

        const data = await res.json();

        if (res.ok) {
          localStorage.setItem(STORAGE_KEYS.accessToken, data.accessToken);
          localStorage.setItem(STORAGE_KEYS.refreshToken, data.refreshToken);
          localStorage.setItem(
            STORAGE_KEYS.staffData,
            JSON.stringify(data.staff),
          );

          if (navigator.vibrate) navigator.vibrate(100);
          toast.success(`Bienvenue, ${data.staff.name} !`);
          routerRef.current.push('/controller/validate');
          return;
        }

        setError(data.error || 'Erreur de connexion');
        setStatus('error');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      } catch {
        setError('Erreur réseau. Vérifiez votre connexion.');
        setStatus('error');
      } finally {
        setStatus('idle');
      }
    },
    [phone, code] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = code.split('');
    newCode[index] = digit;
    const joined = newCode.join('').slice(0, 4);
    setCode(joined);

    if (digit && index < 3) {
      const next = document.getElementById(`code-digit-${index + 1}`);
      next?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prev = document.getElementById(`code-digit-${index - 1}`);
      prev?.focus();
    }
  };

  const isFormValid = phone.length >= 8 && code.length === 4;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] flex flex-col">
      {/* Header */}
      <header className="bg-[#0d1117]/60 backdrop-blur-xl border-b border-white/5 px-5 pt-4 pb-4 safe-top">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00d9a3] to-[#00b894] shadow-lg shadow-[#00d9a3]/20">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Smarticket<span className="text-[#00d9a3]">S</span>
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00d9a3]/15 text-[#00d9a3] border border-[#00d9a3]/20">
              CONTRÔLE
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm">
          {/* Login Card with glassmorphism */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl">
            {/* Icon */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#00d9a3]/10 border border-[#00d9a3]/20">
                <ShieldCheck className="w-10 h-10 text-[#00d9a3]" />
              </div>
              <h2 className="text-2xl font-extrabold text-white">
                Connexion Contrôleur
              </h2>
              <p className="text-sm text-gray-400">
                Entrez votre téléphone et votre code d&apos;accès
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Phone */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  <Smartphone className="w-4 h-4 inline mr-1.5 -mt-0.5 text-[#00d9a3]" />
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+221 77 123 45 67"
                  className="w-full h-14 px-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 text-base focus:outline-none focus:ring-2 focus:ring-[#00d9a3]/50 focus:border-[#00d9a3]/50 transition-colors"
                />
              </div>

              {/* Code (4 digits) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Code d&apos;accès
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <input
                      key={i}
                      id={`code-digit-${i}`}
                      type="tel"
                      inputMode="numeric"
                      maxLength={1}
                      value={code[i] || ''}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
                      className="w-full h-14 text-center text-2xl font-bold bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#00d9a3]/50 focus:border-[#00d9a3]/50 transition-colors"
                      aria-label={`Chiffre ${i + 1}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Code à 4 chiffres fourni par votre administrateur
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-sm text-red-400 flex items-center gap-2"
                  role="alert"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={status === 'loading' || !isFormValid}
                className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-base transition-all duration-200 min-h-[48px] ${
                  status !== 'loading' && isFormValid
                    ? 'bg-gradient-to-r from-[#00d9a3] to-[#00b894] text-white hover:shadow-xl hover:shadow-[#00d9a3]/25 active:scale-[0.97]'
                    : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/10'
                }`}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  'SE CONNECTER'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">
            Pas de code ? Contactez votre administrateur.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0d1117]/40 border-t border-white/5 px-5 py-4 safe-bottom">
        <p className="text-center text-xs text-gray-600">
          &copy; SmarticketS — Application Contrôleur
        </p>
      </footer>
    </div>
  );
}
