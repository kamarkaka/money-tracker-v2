"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { BookOpenIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { useMode } from "@/app/components/ModeProvider";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  authProvider: string;
  hasPassword: boolean;
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
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [purgeMessage, setPurgeMessage] = useState("");
  const [purgeError, setPurgeError] = useState("");

  const [showPurgeFirst, setShowPurgeFirst] = useState(false);
  const [showPurgeFinal, setShowPurgeFinal] = useState(false);
  const [purging, setPurging] = useState(false);

  const i18n = useTranslations("profile");
  const i18nc = useTranslations("common");
  const i18nSetting = useTranslations("setting");
  const { mode } = useMode();

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
      setProfileMessage(i18nc("noChanges"));
      return;
    }

    setSaving(true);
    setProfileMessage("");
    setProfileError("");

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error);
      } else {
        setProfile(data);
        setProfileMessage(i18n("profileUpdated"));
      }
    } catch {
      setProfileError(i18nc("error"));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMessage("");
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError(i18n("passwordMismatch"));
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
        setPasswordError(data.error);
      } else {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordMessage(i18n("passwordChanged"));
      }
    } catch {
      setPasswordError(i18nc("error"));
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
    setPurgeError("");
    setPurgeMessage("");
    try {
      const res = await fetch("/api/profile/purge", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setPurgeError(data.error || i18nc("error"));
      } else {
        setPurgeMessage(i18n("purgeSuccess"));
      }
    } catch {
      setPurgeError(i18nc("error"));
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
    "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 bg-input-bg dark:text-zinc-50";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{i18n("title")}</h1>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* User Information */}
        <div className="flex-1 rounded-lg border border-card-border bg-card-bg p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{i18n("userInfo")}</h2>
          {profileMessage && (
            <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
              {profileMessage}
            </div>
          )}
          {profileError && (
            <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {profileError}
            </div>
          )}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-zinc-500 dark:text-zinc-400">{i18n("userId")}</label>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300">{profile?.id}</p>
              <button
                onClick={() => window.dispatchEvent(new Event("start-tutorial"))}
                className="cursor-pointer rounded-md p-1.5 text-zinc-400 hover:bg-accent-subtle hover:text-accent"
                title={i18n("startTutorial")}
              >
                <BookOpenIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{i18nc("name")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{i18nc("email")}</label>
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
            className="w-full cursor-pointer rounded-md bg-accent px-4 py-3 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50 md:w-auto md:py-2"
          >
            {saving ? i18nc("saving") : i18nc("saveChanges")}
          </button>
        </div>

        {/* Change Password - only for credentials users */}
        {profile?.hasPassword && (
          <div className="flex-1 rounded-lg border border-card-border bg-card-bg p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{i18n("changePassword")}</h2>
            {passwordMessage && (
              <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                {passwordMessage}
              </div>
            )}
            {passwordError && (
              <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                {passwordError}
              </div>
            )}

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{i18n("currentPassword")}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{i18n("newPassword")}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{i18n("confirmPassword")}</label>
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
              className="w-full cursor-pointer rounded-md bg-accent px-4 py-3 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50 md:w-auto md:py-2"
            >
              {saving ? i18nc("changing") : i18n("changePassword")}
            </button>
          </div>
        )}
      </div>

      {mode === "casual" && (
        <div className="mt-6 rounded-lg border border-card-border bg-gradient-to-r from-blue-50 to-white p-6 dark:from-blue-950 dark:to-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white">
              <ChartBarIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{i18nSetting("switchToPro")}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{i18nSetting("switchToProDesc")}</p>
            </div>
          </div>
          <button
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-md bg-accent px-4 py-3 text-sm font-medium text-accent-text opacity-50 md:w-auto md:py-2"
          >
            {i18nSetting("switchToPro")}
          </button>
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">Coming soon</p>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-red-200 bg-card-bg p-6 dark:border-red-900">
        <h2 className="mb-2 text-lg font-semibold text-red-600 dark:text-red-400">{i18n("dangerZone")}</h2>
        {purgeMessage && (
          <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {purgeMessage}
          </div>
        )}
        {purgeError && (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {purgeError}
          </div>
        )}
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          {i18n("purgeDescription")}
        </p>
        <button
          onClick={() => setShowPurgeFirst(true)}
          className="w-full cursor-pointer rounded-md bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 md:w-auto md:py-2"
        >
          {i18n("purgeButton")}
        </button>
      </div>

      <ConfirmDialog
        open={showPurgeFirst}
        onClose={() => setShowPurgeFirst(false)}
        onConfirm={handlePurgeFirstConfirm}
        title={i18n("purgeButton")}
        message={i18n("purgeFirstConfirm")}
        confirmLabel={i18nc("continue")}
      />

      <ConfirmDialog
        open={showPurgeFinal}
        onClose={() => setShowPurgeFinal(false)}
        onConfirm={handlePurgeFinal}
        title={i18n("purgeButton")}
        message={i18n("purgeFinalConfirm")}
        confirmLabel={i18n("purgeEverything")}
        loading={purging}
      />
    </div>
  );
}
