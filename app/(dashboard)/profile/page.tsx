"use client";

import { useState, useEffect, useCallback } from "react";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  authProvider: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showPurgeFirst, setShowPurgeFirst] = useState(false);
  const [showPurgeFinal, setShowPurgeFinal] = useState(false);
  const [purging, setPurging] = useState(false);

  const fetchProfile = useCallback(async () => {
    const res = await fetch("/api/profile");
    const data = await res.json();
    setProfile(data);
    setName(data.name || "");
    setEmail(data.email || "");
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async () => {
    const nameUnchanged = name === (profile?.name || "");
    const emailUnchanged = email === (profile?.email || "");
    if (nameUnchanged && emailUnchanged) {
      setMessage("No changes to save.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setProfile(data);
        setMessage("Profile updated successfully.");
      }
    } catch {
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setMessage("Password changed successfully.");
      }
    } catch {
      setError("Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  const handlePurgeFirstConfirm = () => {
    setShowPurgeFirst(false);
    setShowPurgeFinal(true);
  };

  const handlePurgeFinal = async () => {
    setPurging(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/profile/purge", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to purge data.");
      } else {
        setMessage("All data has been purged successfully.");
      }
    } catch {
      setError("Failed to purge data.");
    } finally {
      setPurging(false);
      setShowPurgeFinal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const inputClass =
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Profile</h1>
      </div>

      {message && (
        <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-row gap-6">
        {/* User ID (read-only) */}
        <div className="flex-1 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">User Information</h2>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-zinc-500 dark:text-zinc-400">User ID</label>
            <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300">{profile?.id}</p>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Change Password - only for credentials users */}
        {profile?.authProvider === "credentials" && (
          <div className="flex-1 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Change Password</h2>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={saving || !currentPassword || !newPassword || !confirmPassword}
              className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {saving ? "Changing..." : "Change Password"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-red-200 bg-white p-6 dark:border-red-900 dark:bg-zinc-900">
        <h2 className="mb-2 text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Permanently delete all your transactions, accounts, institutions, categories, budgets, and settings.
          Your user account will be kept but all data will be erased. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowPurgeFirst(true)}
          className="cursor-pointer rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          Purge All Data
        </button>
      </div>

      <ConfirmDialog
        open={showPurgeFirst}
        onClose={() => setShowPurgeFirst(false)}
        onConfirm={handlePurgeFirstConfirm}
        title="Purge All Data"
        message="This will permanently delete all your transactions, accounts, institutions, categories, budgets, and settings. Are you sure you want to continue?"
        confirmLabel="Continue"
      />

      <ConfirmDialog
        open={showPurgeFinal}
        onClose={() => setShowPurgeFinal(false)}
        onConfirm={handlePurgeFinal}
        title="Final Confirmation"
        message="This is your last chance. All your data will be permanently erased and cannot be recovered. Are you absolutely sure?"
        confirmLabel="Purge Everything"
        loading={purging}
      />
    </div>
  );
}
