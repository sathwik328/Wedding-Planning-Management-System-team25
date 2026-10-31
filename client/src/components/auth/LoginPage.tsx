import React, { useState } from "react";
import { Crown, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { LoginSchema } from "shared";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side Zod validation
    const validation = LoginSchema.safeParse({ email, password });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setError(issue ? issue.message : "Please check your login details.");
      return;
    }

    setIsLoading(true);
    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please verify your corporate credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Regal Background Accents */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#5B1424]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      {/* Header Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="w-16 h-16 rounded-xl bg-[#5B1424] border-2 border-[#C5A059] flex items-center justify-center mx-auto shadow-md">
          <Crown className="w-9 h-9 text-[#C5A059]" />
        </div>
        <h2 className="mt-4 font-serif text-3xl font-bold tracking-wider text-[#5B1424] uppercase">
          The Royal Knot
        </h2>
        <p className="mt-1 text-xs tracking-[0.25em] font-medium text-[#C5A059] uppercase">
          Luxury Wedding Operations & Planning System
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-xl border border-[#E7E2D8]">
          <div className="mb-6 border-b border-[#F0EAE1] pb-4">
            <h3 className="font-serif text-lg font-bold text-[#1E2229]">
              Team Member Authentication
            </h3>
            <p className="text-xs text-[#718096] mt-0.5">
              Access the unified CRM, day-of cockpit, and financial ledger.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[#4A5568]">
                Corporate Email
              </label>
              <div className="mt-1.5 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#A0AEC0]" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@royalknot.in"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-[#CBD5E0] rounded-md placeholder-[#A0AEC0] focus:outline-hidden focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-[#4A5568]">
                Password
              </label>
              <div className="mt-1.5 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#A0AEC0]" />
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-[#CBD5E0] rounded-md placeholder-[#A0AEC0] focus:outline-hidden focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-[#C5A059] rounded-md shadow-sm text-sm font-medium text-white bg-[#5B1424] hover:bg-[#48101C] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#C5A059] transition-all disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <span>Sign In to Workstation</span>
                  <ArrowRight className="w-4 h-4 text-[#C5A059]" />
                </>
              )}
            </button>
          </form>

          {/* Security Assurance Footer */}
          <div className="mt-6 pt-4 border-t border-[#F0EAE1] flex items-center justify-center gap-2 text-[11px] text-[#718096]">
            <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
            <span>Encrypted with Scrypt &bull; Secure HTTP-Only Sessions</span>
          </div>
        </div>
      </div>
    </div>
  );
};
