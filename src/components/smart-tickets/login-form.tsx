"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bus,
  Eye,
  EyeOff,
  Loader2,
  Database,
  ArrowLeft,
  Mail,
  Phone,
  Truck,
} from "lucide-react";
import { BRAND } from "@/lib/constants";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuthStore } from "@/stores/auth-store";

type LoginMode = "email" | "phone";

interface LoginFormProps {
  onBack?: () => void;
}

export function LoginForm({ onBack }: LoginFormProps) {
  const [mode, setMode] = useState<LoginMode>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const loginByPhone = useAuthStore((s) => s.loginByPhone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "email") {
      if (!email.trim() || !password.trim()) {
        toast.error("Veuillez remplir tous les champs obligatoires.");
        return;
      }
    } else {
      if (!phone.trim() || !password.trim()) {
        toast.error("Veuillez remplir tous les champs obligatoires.");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === "phone") {
        await loginByPhone(phone, password);
      } else {
        await login(email, password);
      }
      toast.success("Connexion réussie !");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur de connexion.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode((prev) => (prev === "email" ? "phone" : "email"));
    // Reset fields when switching modes
    setEmail("");
    setPhone("");
    setPassword("");
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Back to Landing */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Retour à l&apos;accueil
          </button>
        )}

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white mb-4 shadow-lg shadow-emerald-600/25">
            <Bus className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Smart<span className="text-emerald-600">Ticket</span>QR
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {BRAND.tagline}
          </p>
        </div>

        <Card className="border-0 shadow-xl shadow-gray-900/5 dark:shadow-black/20">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Connexion</CardTitle>
            <CardDescription>
              {mode === "email"
                ? "Entrez vos identifiants pour accéder à votre espace"
                : "Connexion Chauffeur par numéro de téléphone"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mode Toggle */}
            <div className="flex rounded-lg bg-muted p-1 mb-5">
              <button
                type="button"
                onClick={() => { if (mode !== "email") switchMode(); }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  mode === "email"
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Mail className="h-4 w-4" />
                Email
              </button>
              <button
                type="button"
                onClick={() => { if (mode !== "phone") switchMode(); }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  mode === "phone"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Phone className="h-4 w-4" />
                Chauffeur
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === "phone" ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === "phone" ? -20 : 20 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "email" ? (
                    <div className="space-y-2">
                      <Label htmlFor="email">Adresse e-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@smarttickets.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        autoComplete="email"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="phone">
                          <span className="flex items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5" />
                            Numéro de téléphone
                          </span>
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+221 77 123 45 67"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={isLoading}
                          autoComplete="tel"
                          inputMode="numeric"
                        />
                      </div>
                      <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 p-3 text-xs text-violet-700 dark:text-violet-300">
                        <p className="font-medium mb-1">Accès Chauffeur</p>
                        <p>
                          Utilisez votre numéro de téléphone enregistré et votre
                          code d&apos;accès pour vous connecter.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password">
                      {mode === "phone" ? "Code d&apos;accès" : "Mot de passe"}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={mode === "phone" ? "••••••" : "••••••••"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className={`w-full text-white ${
                      mode === "phone"
                        ? "bg-violet-600 hover:bg-violet-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mode === "phone" ? (
                      <span className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Connexion Chauffeur
                      </span>
                    ) : (
                      "Se connecter"
                    )}
                  </Button>
                </form>
              </motion.div>
            </AnimatePresence>

            {/* Demo credentials — DEV ONLY */}
            {process.env.NODE_ENV === "development" && (
              <div className="mt-6 pt-4 border-t">
                <Accordion type="single" collapsible>
                  <AccordionItem value="demo" className="border-none">
                    <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">
                      <span className="flex items-center gap-1.5">
                        <Database className="h-3.5 w-3.5" />
                        Identifiants de démonstration (dev only)
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 rounded-lg bg-muted/50 p-3 text-xs">
                        <div>
                          <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                            Super Admin
                          </p>
                          <p className="text-muted-foreground">
                            admin@smarttickets.com / Admin@1234
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                            Admin STMB
                          </p>
                          <p className="text-muted-foreground">
                            admin@stmb.com / Admin@1234
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                            Opérateur STMB
                          </p>
                          <p className="text-muted-foreground">
                            operator@stmb.com / Oper@1234
                          </p>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <p className="font-semibold text-violet-700 dark:text-violet-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> Chauffeur (login par téléphone)
                          </p>
                          <p className="text-muted-foreground">
                            771234567 / Drive@1234
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()} {BRAND.name} — Tous droits réservés
        </p>
      </motion.div>
    </div>
  );
}
