import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  ArrowLeft,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { PasswordRecoveryModal } from "@/components/admin/PasswordRecoveryModal";

interface AdminLoginViewProps {
  onLogin: (credentials: { username: string; passcode: string; rememberMe: boolean }) => Promise<void>;
  isLoggingIn: boolean;
  authError: string | null;
  onClearError?: () => void;
  initialUsername?: string;
}

export function AdminLoginView({
  onLogin,
  isLoggingIn,
  authError,
  onClearError,
  initialUsername = "",
}: AdminLoginViewProps) {
  const [username, setUsername] = useState(initialUsername);
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (onClearError) onClearError();

    const u = username.trim().toLowerCase();
    const p = passcode.trim();

    if (!u) {
      setLocalError("Please enter your username.");
      return;
    }
    if (!p) {
      setLocalError("Please enter your passcode or password.");
      return;
    }

    await onLogin({ username: u, passcode: p, rememberMe });
  };

  const displayError = localError || authError;

  return (
    <>
      {/* Recovery Modal */}
      <PasswordRecoveryModal
        isOpen={showRecoveryModal}
        onClose={() => setShowRecoveryModal(false)}
        onSuccess={(newCode) => {
          setPasscode(newCode);
          setLocalError(null);
        }}
      />

      <div className="min-h-screen w-full flex bg-[#F7F5F0]">
        {/* ========================================================= */}
        {/* DESKTOP LEFT PANEL: Chicken Farm Inspo Visual (hidden on mobile) */}
        {/* ========================================================= */}
        <div className="hidden md:flex md:w-1/2 lg:w-5/12 xl:w-1/2 relative bg-[#0b2918] select-none overflow-hidden flex-col justify-between">
          {/* Background Hero Image */}
          <img
            src="/assets/dignity-login-hero.png"
            alt="Dignity Agro Farms Healthy Broiler"
            className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[1.02]"
            loading="eager"
          />

          {/* Subtle gradient vignette to blend edges cleanly */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

          {/* Top subtle back-to-website chip overlay */}
          <div className="relative z-10 p-6 lg:p-8 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 text-xs font-semibold text-white shadow-sm border border-white/20 transition-all hover:scale-105"
            >
              <ArrowLeft size={14} /> Back to Website
            </Link>
          </div>

          {/* Bottom Accreditation Badge */}
          <div className="relative z-10 p-6 lg:p-8 flex items-center justify-between text-white/80 text-xs">
            <div className="flex items-center gap-2 backdrop-blur-sm bg-black/20 px-3.5 py-1.5 rounded-full border border-white/10">
              <Sparkles size={14} className="text-[#A2E0A2]" />
              <span>Premium Organic Poultry & Livestock</span>
            </div>
            <span className="text-white/60 text-[11px]">© Dignity Agro Farms</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PANEL: Admin Login Form (Responsive on Desktop & Mobile) */}
        {/* ========================================================= */}
        <div className="w-full md:w-1/2 lg:w-7/12 xl:w-1/2 flex flex-col justify-between bg-gradient-to-b from-[#092314] via-[#0F3D24] to-[#07190e] md:bg-white md:from-white md:via-white md:to-white min-h-screen p-4 sm:p-8 lg:p-12 xl:p-16 relative overflow-y-auto">
          
          {/* Top Bar Navigation */}
          <div className="w-full flex items-center justify-between mb-4 sm:mb-8">
            <Link
              to="/"
              className="inline-flex md:inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 md:bg-[#F7F5F0] md:hover:bg-[#EFECE5] text-white/90 md:text-[#0F3D24] px-3.5 py-1.5 md:px-4 md:py-2 text-xs font-semibold border border-white/15 md:border-transparent transition"
            >
              <ArrowLeft size={14} /> Back to Website
            </Link>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 md:bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-300 md:text-emerald-700 border border-emerald-500/30 md:border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 md:bg-emerald-600 animate-pulse" />
              Admin Portal
            </span>
          </div>

          {/* ========================================================= */}
          {/* MOBILE ONLY: Spectacular Brand Header (hidden on desktop) */}
          {/* ========================================================= */}
          <div className="flex md:hidden flex-col items-center text-center my-3">
            <div className="relative mb-2">
              <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl scale-125" />
              <img
                src="/assets/logo.png"
                alt="Dignity Agro Farms Limited"
                className="h-16 w-auto relative drop-shadow-md"
              />
            </div>
            <p className="font-serif italic text-white/90 text-sm tracking-wide mt-1">
              Healthy Birds, Better Tomorrow
            </p>
          </div>

          {/* ========================================================= */}
          {/* Form Card Container */}
          {/* ========================================================= */}
          <div className="w-full max-w-md mx-auto my-auto bg-white rounded-3xl p-6 sm:p-8 md:p-0 shadow-2xl md:shadow-none ring-1 ring-black/5 md:ring-0">
            {/* Header Text */}
            <div className="text-left md:text-left mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0F3D24] tracking-tight">
                Admin Login
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1.5">
                Welcome back! Please login to your admin dashboard.
              </p>
            </div>

            {/* Error Message Alert */}
            {displayError && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1 font-medium">{displayError}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Username
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    autoFocus
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    placeholder="Username"
                    autoComplete="username"
                    disabled={isLoggingIn}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#15803d] focus:ring-4 focus:ring-[#15803d]/10 transition-all disabled:bg-gray-50"
                  />
                </div>
              </div>

              {/* Password / Passcode Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passcode}
                    onChange={(e) => {
                      setPasscode(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    placeholder="Password"
                    autoComplete="current-password"
                    disabled={isLoggingIn}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-11 pr-11 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#15803d] focus:ring-4 focus:ring-[#15803d]/10 transition-all disabled:bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-gray-600 hover:text-gray-800">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#15803d] focus:ring-[#15803d] accent-[#15803d] cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(true)}
                  className="font-medium text-[#15803d] hover:text-[#166534] hover:underline transition cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Primary Green Login Button */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full mt-2 rounded-xl bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] text-white py-3.5 px-4 font-semibold text-sm sm:text-base shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Login</span>
                )}
              </button>
            </form>

            {/* Bottom Security Seal */}
            <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
              <ShieldCheck size={16} className="text-[#15803d]" />
              <span>Secure • Role-based Access</span>
            </div>
          </div>

          {/* Bottom subtle text for mobile / desktop footer */}
          <div className="text-center mt-6 text-[11px] text-white/50 md:text-gray-400">
            Dignity Agro Farms Management Portal • Version 2.4
          </div>
        </div>
      </div>
    </>
  );
}
