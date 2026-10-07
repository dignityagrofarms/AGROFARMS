import React, { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  UserPlus,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Lock,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  adminGetPasscode,
  adminSetPasscode,
  adminListUserAccounts,
  adminCreateUserAccount,
  adminResetUserPasscode,
  adminToggleUserActive,
  type AdminRole,
  type UserAccountItem,
} from "@/lib/orders.functions";

interface UserAccountsPanelProps {
  passcode: string;
  role: AdminRole;
  onPasscodeChanged: (newPasscode: string) => void;
}

export function UserAccountsPanel({ passcode, role, onPasscodeChanged }: UserAccountsPanelProps) {
  const [nextPasscode, setNextPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  // New Account Form State
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AdminRole>("staff");
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  // Reset User Passcode State
  const [resetTargetUser, setResetTargetUser] = useState<string | null>(null);
  const [resetPasscodeVal, setResetPasscodeVal] = useState("");

  const listAccountsFn = useServerFn(adminListUserAccounts);
  const createAccountFn = useServerFn(adminCreateUserAccount);
  const resetPasscodeFn = useServerFn(adminResetUserPasscode);
  const toggleActiveFn = useServerFn(adminToggleUserActive);
  const setPasscodeFn = useServerFn(adminSetPasscode);

  const accountsQuery = useQuery({
    queryKey: ["admin-user-accounts", passcode],
    queryFn: () => listAccountsFn({ data: { passcode } }),
    enabled: role === "owner" && Boolean(passcode),
  });

  const saveOwnPasscode = useMutation({
    mutationFn: () => setPasscodeFn({ data: { passcode, newPasscode: nextPasscode.trim() } }),
    onSuccess: () => {
      setMsg("Passcode updated successfully!");
      onPasscodeChanged(nextPasscode.trim());
      setNextPasscode("");
      setConfirmPasscode("");
    },
    onError: (e: Error) => setMsg("Error: " + e.message),
  });

  const createAccountMut = useMutation({
    mutationFn: () =>
      createAccountFn({
        data: {
          passcode,
          targetUsername: newUsername.trim(),
          targetPasscode: newPassword.trim(),
          targetRole: newRole,
        },
      }),
    onSuccess: () => {
      setCreateMsg(`Account "${newUsername.trim()}" created successfully!`);
      setNewUsername("");
      setNewPassword("");
      accountsQuery.refetch();
    },
    onError: (e: Error) => setCreateMsg("Error: " + e.message),
  });

  const resetPasscodeMut = useMutation({
    mutationFn: () =>
      resetPasscodeFn({
        data: {
          passcode,
          targetUsername: resetTargetUser!,
          newPasscode: resetPasscodeVal.trim(),
        },
      }),
    onSuccess: () => {
      alert(`Passcode for ${resetTargetUser} has been reset.`);
      setResetTargetUser(null);
      setResetPasscodeVal("");
      accountsQuery.refetch();
    },
    onError: (e: Error) => alert("Reset error: " + e.message),
  });

  const toggleActiveMut = useMutation({
    mutationFn: (vars: { username: string; active: boolean }) =>
      toggleActiveFn({ data: { passcode, targetUsername: vars.username, active: vars.active } }),
    onSuccess: () => accountsQuery.refetch(),
    onError: (e: Error) => alert(e.message),
  });

  const canSaveOwn = nextPasscode.trim().length >= 6 && nextPasscode.trim() === confirmPasscode.trim();

  return (
    <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0F3D24]/10 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#0F3D24]">
            <ShieldCheck size={20} className="text-[#3F8F3F]" /> Password & User Accounts Management
          </h2>
          <p className="mt-0.5 text-xs text-[#0F3D24]/70">
            {role === "owner"
              ? "Administrator Panel: Full authority to manage accounts, reset passwords, and assign roles."
              : `Signed in as ${role}. Password changes must be authorized by your Administrator.`}
          </p>
        </div>
        <span className="rounded-full bg-[#0F3D24]/10 px-3 py-1 text-xs font-bold text-[#0F3D24] uppercase">
          Role: {role}
        </span>
      </div>

      {/* Section 1: Change Own Password (Available to current user) */}
      <div className="rounded-2xl bg-[#F7F5F0] p-5 space-y-3">
        <h3 className="text-sm font-bold text-[#0F3D24] flex items-center gap-2">
          <Key size={16} className="text-[#3F8F3F]" /> Change My Account Passcode
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="password"
            value={nextPasscode}
            onChange={(e) => setNextPasscode(e.target.value)}
            placeholder="New passcode (min 6 chars)"
            className="rounded-xl border border-[#0F3D24]/15 bg-white px-4 py-2.5 text-xs outline-none focus:border-[#3F8F3F]"
          />
          <input
            type="password"
            value={confirmPasscode}
            onChange={(e) => setConfirmPasscode(e.target.value)}
            placeholder="Confirm new passcode"
            className="rounded-xl border border-[#0F3D24]/15 bg-white px-4 py-2.5 text-xs outline-none focus:border-[#3F8F3F]"
          />
          <button
            disabled={!canSaveOwn || saveOwnPasscode.isPending}
            onClick={() => saveOwnPasscode.mutate()}
            className="rounded-full bg-[#0F3D24] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-40 hover:bg-[#134a2c] transition"
          >
            {saveOwnPasscode.isPending ? "Saving..." : "Update My Passcode"}
          </button>
        </div>
        {msg && <p className="text-xs font-medium text-[#3F8F3F]">{msg}</p>}
      </div>

      {/* Section 2: Manage Accounts & RBAC Roles (Administrator Only) */}
      {role === "owner" && (
        <div className="space-y-6 pt-2">
          {/* Create User Form */}
          <div className="rounded-2xl border border-[#0F3D24]/15 p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#0F3D24] flex items-center gap-2">
              <UserPlus size={16} className="text-[#3F8F3F]" /> Create Manager or Staff Account
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Username (e.g. manager1)"
                className="rounded-xl border border-[#0F3D24]/15 px-3.5 py-2 text-xs outline-none focus:border-[#3F8F3F]"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Passcode (min 6 chars)"
                className="rounded-xl border border-[#0F3D24]/15 px-3.5 py-2 text-xs outline-none focus:border-[#3F8F3F]"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminRole)}
                className="rounded-xl border border-[#0F3D24]/15 bg-white px-3.5 py-2 text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
              >
                <option value="manager">Manager (Read & Monitoring Access)</option>
                <option value="staff">Staff (Operational Data Entry Only)</option>
                <option value="owner">Administrator (Full Access)</option>
              </select>
            </div>
            <button
              onClick={() => createAccountMut.mutate()}
              disabled={!newUsername.trim() || newPassword.trim().length < 6 || createAccountMut.isPending}
              className="rounded-full bg-[#3F8F3F] px-5 py-2 text-xs font-bold text-white disabled:opacity-40 hover:bg-[#4ea94e] transition"
            >
              {createAccountMut.isPending ? "Creating..." : "Create Account"}
            </button>
            {createMsg && <p className="text-xs font-medium text-[#0F3D24]">{createMsg}</p>}
          </div>

          {/* Accounts List Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F3D24]/70 flex items-center gap-2">
              <Users size={15} /> Active System Accounts ({accountsQuery.data?.length || 0})
            </h3>
            {accountsQuery.isLoading ? (
              <div className="py-6 text-center text-xs text-[#0F3D24]/50">
                <Loader2 size={18} className="animate-spin mx-auto mb-1" /> Loading accounts...
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#0F3D24]/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F5F0] text-[#0F3D24]/70 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Username</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0F3D24]/10">
                    {(accountsQuery.data || []).map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-[#0F3D24]">{acc.username}</td>
                        <td className="p-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                            acc.role === "owner" ? "bg-purple-100 text-purple-800" :
                            acc.role === "manager" ? "bg-blue-100 text-blue-800" :
                            "bg-amber-100 text-amber-800"
                          }`}>
                            {acc.role}
                          </span>
                        </td>
                        <td className="p-3">
                          {acc.active ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1"><UserCheck size={13} /> Active</span>
                          ) : (
                            <span className="text-red-600 font-semibold flex items-center gap-1"><UserX size={13} /> Deactivated</span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              setResetTargetUser(acc.username);
                              setResetPasscodeVal("");
                            }}
                            className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-[#0F3D24] hover:bg-slate-200"
                          >
                            Reset Password
                          </button>
                          {acc.username !== "owner" && acc.username !== "admin" && (
                            <button
                              onClick={() => toggleActiveMut.mutate({ username: acc.username, active: !acc.active })}
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                acc.active ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {acc.active ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal for Resetting a Target Account Password */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#0F3D24]">Reset Passcode for "{resetTargetUser}"</h3>
            <input
              type="password"
              value={resetPasscodeVal}
              onChange={(e) => setResetPasscodeVal(e.target.value)}
              placeholder="Enter new passcode (min 6 chars)"
              className="w-full rounded-xl border border-[#0F3D24]/20 p-3 text-xs outline-none focus:border-[#3F8F3F]"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setResetTargetUser(null)} className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold">Cancel</button>
              <button
                disabled={resetPasscodeVal.trim().length < 6 || resetPasscodeMut.isPending}
                onClick={() => resetPasscodeMut.mutate()}
                className="rounded-full bg-[#0F3D24] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
