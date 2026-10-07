import React, { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, ShieldAlert, X, CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { adminRecoverPasscode } from "@/lib/orders.functions";

interface PasswordRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPasscode: string) => void;
}

export function PasswordRecoveryModal({ isOpen, onClose, onSuccess }: PasswordRecoveryModalProps) {
  const [recoveryMethod, setRecoveryMethod] = useState<"key" | "totp">("key");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [targetUsername, setTargetUsername] = useState("owner");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recoverFn = useServerFn(adminRecoverPasscode);

  const recoverMut = useMutation({
    mutationFn: () =>
      recoverFn({
        data: {
          recoveryMethod,
          recoveryKey: recoveryKey.trim() || null,
          totpCode: totpCode.trim() || null,
          targetUsername: targetUsername.trim().toLowerCase(),
          newPasscode: newPasscode.trim(),
        },
      }),
    onSuccess: () => {
      alert("Passcode recovered & updated successfully! You can now sign in with your new passcode.");
      onSuccess(newPasscode.trim());
      onClose();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to recover passcode.");
    },
  });

  if (!isOpen) return null;

  const isKeyValid = recoveryMethod === "key" ? recoveryKey.trim().length >= 4 : totpCode.trim().length === 6;
  const canSubmit =
    isKeyValid &&
    targetUsername.trim().length >= 1 &&
    newPasscode.trim().length >= 6 &&
    newPasscode.trim() === confirmPasscode.trim();

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden">
      <div className="w-full h-[96dvh] sm:h-auto sm:max-h-[90vh] max-w-md flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl ring-1 ring-[#0F3D24]/10">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0F3D24]/10 bg-[#0F3D24] px-5 sm:px-6 py-4 sm:py-5 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#3F8F3F]/30 p-2 text-[#A2E0A2] shrink-0">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold leading-tight">Account Passcode Recovery</h3>
              <p className="text-[11px] sm:text-xs text-white/70 leading-tight mt-0.5">
                Reset forgotten administrator or user credentials
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body - Scrollable on small screens */}
        <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto">
          {/* Recovery Method Selector */}
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#F7F5F0] p-1.5 border border-[#0F3D24]/10">
            <button
              type="button"
              onClick={() => {
                setRecoveryMethod("key");
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 font-bold text-[11px] sm:text-xs transition text-center min-h-[42px] leading-tight ${
                recoveryMethod === "key"
                  ? "bg-[#0F3D24] text-white shadow-xs"
                  : "text-[#0F3D24]/70 hover:bg-[#0F3D24]/5"
              }`}
            >
              <KeyRound size={14} className="shrink-0" />
              <span>Master Key / Phrase</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRecoveryMethod("totp");
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 font-bold text-[11px] sm:text-xs transition text-center min-h-[42px] leading-tight ${
                recoveryMethod === "totp"
                  ? "bg-[#0F3D24] text-white shadow-xs"
                  : "text-[#0F3D24]/70 hover:bg-[#0F3D24]/5"
              }`}
            >
              <Smartphone size={14} className="shrink-0" />
              <span>Authenticator App (TOTP)</span>
            </button>
          </div>

          {recoveryMethod === "key" ? (
            <div className="rounded-2xl bg-amber-50 p-3 sm:p-3.5 border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Enter the farm's Master Recovery Key (or Master Passcode) configured in your environment to reset credentials safely.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-blue-50 p-3 sm:p-3.5 border border-blue-200 text-blue-900 flex items-start gap-2.5">
              <Smartphone size={18} className="shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Open Google Authenticator, Authy, or Apple Passwords on your phone and enter the 6-digit code.
              </p>
            </div>
          )}

          {recoveryMethod === "key" ? (
            <label className="block font-bold text-[#0F3D24]">
              Master Recovery Key / Phrase
              <input
                type="password"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                placeholder="Enter recovery phrase or master key"
                className="mt-1 block w-full rounded-xl border border-[#0F3D24]/20 p-3 text-sm sm:text-xs outline-none focus:border-[#3F8F3F] min-h-[44px]"
              />
            </label>
          ) : (
            <label className="block font-bold text-[#0F3D24]">
              6-Digit Authenticator Code (TOTP)
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 123456"
                className="mt-1 block w-full rounded-xl border border-[#0F3D24]/20 p-3 text-center text-xl font-mono font-bold tracking-widest outline-none focus:border-[#3F8F3F] min-h-[48px] bg-slate-50 focus:bg-white"
              />
            </label>
          )}

          <label className="block font-bold text-[#0F3D24]">
            Account Username to Reset
            <input
              type="text"
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              placeholder="e.g. owner, manager, staff"
              className="mt-1 block w-full rounded-xl border border-[#0F3D24]/20 p-3 text-sm sm:text-xs outline-none focus:border-[#3F8F3F] min-h-[44px]"
            />
          </label>

          <label className="block font-bold text-[#0F3D24]">
            New Passcode (min 6 characters)
            <input
              type="password"
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value)}
              placeholder="Enter new passcode"
              className="mt-1 block w-full rounded-xl border border-[#0F3D24]/20 p-3 text-sm sm:text-xs outline-none focus:border-[#3F8F3F] min-h-[44px]"
            />
          </label>

          <label className="block font-bold text-[#0F3D24]">
            Confirm New Passcode
            <input
              type="password"
              value={confirmPasscode}
              onChange={(e) => setConfirmPasscode(e.target.value)}
              placeholder="Re-enter new passcode"
              className="mt-1 block w-full rounded-xl border border-[#0F3D24]/20 p-3 text-sm sm:text-xs outline-none focus:border-[#3F8F3F] min-h-[44px]"
            />
          </label>

          {errorMsg && (
            <div className="rounded-xl bg-rose-50 p-3 text-rose-700 font-semibold border border-rose-200">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-h-[44px] flex items-center justify-center rounded-full bg-gray-100 px-5 py-2.5 font-semibold text-gray-600 hover:bg-gray-200 transition text-xs sm:text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit || recoverMut.isPending}
              onClick={() => recoverMut.mutate()}
              className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 rounded-full bg-[#0F3D24] px-6 py-2.5 font-bold text-white shadow-md hover:bg-[#134a2c] disabled:opacity-50 transition text-xs sm:text-sm"
            >
              {recoverMut.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin shrink-0" /> Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} className="shrink-0" /> Recover & Reset Credentials
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
