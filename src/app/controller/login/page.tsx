/**
 * Controller PWA Login — /controller/login
 *
 * Minimalist code-based login for controllers.
 * Uses phone number + 4-digit access code (sent via WhatsApp onboarding).
 * JWT tokens stored in localStorage for offline access.
 * Dark theme with emerald-500 accent matching controller pages.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScanSearch, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
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
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<LoginStatus>('idle');
  const [error, setError] = useState('');

  // Check for existing valid session on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken);
    const staffData = localStorage.getItem(STORAGE_KEYS.staffData);
    if (token && staffData) {
      try {
        const data = JSON.parse(staffData);
        if (data.role === 'CONTROLLER') {
          router.replace('/controller/validate');
        }
      } catch {
        // Invalid data, clear and show login
        localStorage.removeItem(STORAGE_KEYS.accessToken);
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        localStorage.removeItem(STORAGE_KEYS.staffData);
      }
    }
  }, [router]);

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
          // Store JWT tokens + staff data in localStorage
          localStorage.setItem(STORAGE_KEYS.accessToken, data.accessToken);
          localStorage.setItem(STORAGE_KEYS.refreshToken, data.refreshToken);
          localStorage.setItem(
            STORAGE_KEYS.staffData,
            JSON.stringify(data.staff)
          );

          // Haptic feedback if available
          if (navigator.vibrate) navigator.vibrate(100);

          toast.success(`Bienvenue, ${data.staff.name} !`);
          router.push('/controller/validate');
          return;
        }

        setError(data.error || 'Erreur de connexion');
        setStatus('error');

        // Error vibration
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      } catch {
        setError('Erreur réseau. Vérifiez votre connexion.');
        setStatus('error');
      } finally {
        setStatus('idle');
      }
    },
    [phone, code, router]
  );

  // Handle individual digit inputs for the code
  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = code.split('');
    newCode[index] = digit;
    const joined = newCode.join('').slice(0, 4);
    setCode(joined);

    // Auto-focus next input
    if (digit && index < 3) {
      const next = document.getElementById(`code-digit-${index + 1}`);
      next?.focus();
    }
  };

  // Handle backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prev = document.getElementById(`code-digit-${index - 1}`);
      prev?.focus();
    }
  };

  const isFormValid = phone.length >= 8 && code.length === 4;

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      {/* Header */}
      <header className="bg-[#0d1117] border-b border-gray-800 px-4 py-3 safe-top">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20">
            <ScanSearch className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">
              Smarticket<span className="text-emerald-400">S</span>
            </h1>
            <p className="text-[11px] text-gray-400 -mt-0.5">
              Espace Contrôleur
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="bg-[#1f2937] border border-gray-700 rounded-2xl p-6 space-y-6">
            {/* Icon */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">
                Connexion Contrôleur
              </h2>
              <p className="text-sm text-gray-400">
                Entrez votre téléphone et votre code d&apos;accès
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Phone */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">
                  <Smartphone className="w-4 h-4 inline mr-1.5 -mt-0.5" />
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
                  className="w-full h-14 px-4 bg-[#111827] border border-gray-600 rounded-xl text-white placeholder-gray-500 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Code (4 digits) */}
              <div className="space-y-1.5">
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
                      onFocus={(e) => e.target.select()}
                      className="w-full h-14 text-center text-2xl font-bold bg-[#111827] border border-gray-600 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
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
                  className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={status === 'loading' || !isFormValid}
                className={`w-full h-14 rounded-xl flex items-center justify-center gap-2 font-bold text-base transition-all duration-200 min-h-[44px] ${
                  status !== 'loading' && isFormValid
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 active:scale-[0.98] shadow-lg shadow-emerald-500/25'
                    : 'bg-[#374151] text-gray-500 cursor-not-allowed'
                }`}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />{' '}
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
      <footer className="bg-[#0d1117] border-t border-gray-800 px-4 py-4 safe-bottom">
        <p className="text-center text-xs text-gray-500">
          © SmarticketS — Application Contrôleur
        </p>
      </footer>
    </div>
  );
}
