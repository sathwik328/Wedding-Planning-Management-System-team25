import React, { useState } from "react";
import { Crown, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
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
    <div className="min-h-screen bg-[#FAF7F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Soft Romantic Ambient Background Accents */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#FDF2F4] rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[450px] h-[450px] bg-[#BFA064]/10 rounded-full blur-3xl translate-y-1/3 pointer-events-none" />

      {/* Header Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        <div className="w-16 h-16 rounded-2xl bg-[#3D1420] border border-[#BFA064]/30 flex items-center justify-center mx-auto shadow-md transition-transform hover:scale-105 duration-300">
          <Crown className="w-8 h-8 text-[#BFA064]" />
        </div>
        <h2 className="mt-5 font-serif text-3xl sm:text-4xl font-normal tracking-wide text-[#3D1420]">
          The Royal Knot
        </h2>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#EDE6DF] shadow-xs">
          <Sparkles className="w-3 h-3 text-[#BFA064]" />
          <span className="text-[11px] tracking-[0.2em] font-medium text-[#736B63] uppercase">
            Rajasthan Luxury Wedding Operations
          </span>
        </div>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white/90 backdrop-blur-md py-8 px-6 sm:px-10 shadow-[0_12px_40px_rgba(36,32,29,0.04)] rounded-3xl border border-[#EDE6DF]">
          <div className="mb-6 border-b border-[#EDE6DF]/80 pb-4 text-center sm:text-left">
            <h3 className="font-serif text-xl font-normal text-[#24201D]">
              Member Authentication
            </h3>
            <p className="text-xs text-[#736B63] mt-1">
              Access the unified operations cockpit, day-of timeline, and ledger.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-[#FDF2F4] border border-rose-200 flex items-start gap-2.5 text-xs text-rose-900">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[11px] font-semibold uppercase tracking-wider text-[#736B63] mb-1.5 ml-1">
                Corporate Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#A89F91]" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@royalknot.in"
                  className="block w-full pl-10 pr-4 py-2.5 text-sm bg-[#FAF7F4]/60 border border-[#EDE6DF] rounded-full placeholder-[#A89F91] text-[#24201D] focus:outline-hidden focus:border-[#BFA064] focus:ring-2 focus:ring-[#BFA064]/20 transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[11px] font-semibold uppercase tracking-wider text-[#736B63] mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#A89F91]" />
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-4 py-2.5 text-sm bg-[#FAF7F4]/60 border border-[#EDE6DF] rounded-full placeholder-[#A89F91] text-[#24201D] focus:outline-hidden focus:border-[#BFA064] focus:ring-2 focus:ring-[#BFA064]/20 transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full shadow-xs hover:shadow-md text-xs font-semibold uppercase tracking-wider text-white bg-[#3D1420] hover:bg-[#2A0E16] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#BFA064] transition-all disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <span>Verifying credentials...</span>
                ) : (
                  <>
                    <span>Sign In to Workstation</span>
                    <ArrowRight className="w-4 h-4 text-[#BFA064]" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Assurance Footer */}
          <div className="mt-6 pt-4 border-t border-[#EDE6DF]/80 flex items-center justify-center gap-2 text-[11px] text-[#736B63]">
            <ShieldCheck className="w-4 h-4 text-[#BFA064]" />
            <span>Encrypted with Scrypt &bull; Secure HTTP-Only Sessions</span>
          </div>
        </div>
      </div>
    </div>
  );
};