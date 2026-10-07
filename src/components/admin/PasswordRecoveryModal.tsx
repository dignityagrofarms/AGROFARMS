import React, { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, ShieldAlert, X, CheckCircle2, Loader2 } from "lucide-react";
import { adminRecoverPasscode } from "@/lib/orders.functions";

interface PasswordRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPasscode: string) => void;
}

export function PasswordRecoveryModal({ isOpen, onClose, onSuccess }: PasswordRecoveryModalProps) {
  const [recoveryKey, setRecoveryKey] = useState("");
  const [targetUsername, setTargetUsername] = useState("owner");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recoverFn = useServerFn(adminRecoverPasscode);

  const recoverMut = useMutation({
    mutationFn: () =>
      recoverFn({
        data: {
          recoveryKey: recoveryKey.trim(),
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

  const canSubmit =
    recoveryKey.trim().length >= 4 &&
    targetUsername.trim().length >= 1 &&
    newPasscode.trim().length >= 6 &&
    newPasscode.trim() === confirmPasscode.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-[#0F3D24]/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0F3D24]/10 bg-[#0F3D24] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#3F8F3F]/30 p-2 text-[#A2E0A2]">
              <KeyRound size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold">Account Passcode Recovery</h3>
              <p className="text-xs text-white/70">Reset forgotten administrator or user credentials</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="rounded-2xl bg-amber-50 p-3.5 border border-amber-200 text-amber-900 flex items-start gap-2.5">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <p>
              Enter the farm's Master Recovery Key (or Master Passcode) to reset credentials safely.
            </p>
          </div>

          <label className="block font-bold text-[#0F3D24]">
            Master Recovery Key
            <input
              type="password"
              value={recoveryKey}
              onChange={(e) => setRecoveryKey(e.target.value)}
              placeholder="Enter recovery phrase or master key"
              className="mt-1 block w-full rounded-xl border border-[#0F3D24]/20 p-3 text-xs outline-none focus:border-[#3F8F3F]"
            />
          </label>

          <label className="block font-bold text-[#0F3D24]">
            Account Username to Reset
            <input
              type="text"
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              placeholder="e.g. owner, manager, staff"
              className="mt-1 block w-full rounded-xl border border-[#0F3D24]/20 p-3 text-xs outline-none focus:border-[#3F8F3F]"
            />
          </label>

          <label className="block font-bold text-[#0F3D24]">
            New Passcode (min 6 characters)
            <input
              type="password"
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value)}
              placeholder="Enter new passcode"
              className="mt-1 block w-full rounded-xl border border-[#0F3D24]/20 p-3 text-xs outline-none focus:border-[#3F8F3F]"
            />
          </label>

          <label className="block font-bold text-[#0F3D24]">
            Confirm New Passcode
            <input
              type="password"
              value={confirmPasscode}
              onChange={(e) => setConfirmPasscode(e.target.value)}
              placeholder="Confirm new passcode"
              className="mt-1 block w-full rounded-xl border border-[#0F3D24]/20 p-3 text-xs outline-none focus:border-[#3F8F3F]"
            />
          </label>

          {errorMsg && <p className="text-xs font-semibold text-red-600">{errorMsg}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-full bg-slate-100 py-3 font-semibold text-[#0F3D24]">
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit || recoverMut.isPending}
              onClick={() => recoverMut.mutate()}
              className="flex-1 flex items-center justify-center gap-2 rounded-full bg-[#0F3D24] py-3 font-bold text-white disabled:opacity-40 hover:bg-[#134a2c] transition"
            >
              {recoverMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {recoverMut.isPending ? "Recovering..." : "Recover Passcode"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
