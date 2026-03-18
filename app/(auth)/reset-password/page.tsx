"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FormField } from "@/app/components/ui/FormField";

const PASSWORD_DIGIT_RE = /\d/;
const PASSWORD_UPPER_RE = /[A-Z]/;
const PASSWORD_SPECIAL_RE = /[^A-Za-z0-9]/;

function validatePassword(pw: string): string | null {
  if (!pw) return "Password is required";
  const issues: string[] = [];
  if (pw.length < 16) issues.push("at least 16 characters");
  if (!PASSWORD_DIGIT_RE.test(pw)) issues.push("one digit");
  if (!PASSWORD_UPPER_RE.test(pw)) issues.push("one uppercase letter");
  if (!PASSWORD_SPECIAL_RE.test(pw)) issues.push("one special character");
  if (issues.length > 0) return `Password must contain ${issues.join(", ")}`;
  return null;
}

const INPUT_BASE =
  "rounded-md border px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 dark:bg-zinc-800 dark:text-zinc-50";
const INPUT_NORMAL =
  `${INPUT_BASE} border-zinc-300 focus:border-blue-500 focus:ring-blue-500 dark:border-zinc-600`;
const INPUT_ERROR =
  `${INPUT_BASE} border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-500`;


function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const i18n = useTranslations("auth");
  const i18nc = useTranslations("common");
  const i18nProfile = useTranslations("profile");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  });

  const markTouched = (field: keyof typeof touched) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const passwordError = touched.password ? validatePassword(password) ?? "" : "";
  const confirmPasswordError =
    touched.confirmPassword && confirmPassword !== password
      ? i18nc("error")
      : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTouched({ password: true, confirmPassword: true });
    const pwError = validatePassword(password);
    if (pwError) return;
    if (password !== confirmPassword) return;

    setLoading(true);
    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || i18nc("error"));
      return;
    }
    setSuccess(true);
  };

  if (!token) {
    return (
      <>
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{i18n("resetPassword")}</h1>
        <p className="text-sm text-red-500">{i18nc("error")}</p>
        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/forgot-password" className="cursor-pointer font-medium text-zinc-900 hover:underline dark:text-zinc-50">
            {i18n("forgotPassword")}
          </Link>
        </p>
      </>
    );
  }

  if (success) {
    return (
      <>
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{i18n("resetPassword")}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{i18n("passwordResetSuccess")}</p>
        <p className="mt-4 text-center">
          <Link href="/login" className="cursor-pointer text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50">
            {i18n("login")}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{i18n("resetPassword")}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={i18nProfile("newPassword")} error={passwordError}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => markTouched("password")}
            className={passwordError ? INPUT_ERROR : INPUT_NORMAL}
          />
        </FormField>
        <FormField label={i18n("confirmPassword")} error={confirmPasswordError}>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={() => markTouched("confirmPassword")}
            className={confirmPasswordError ? INPUT_ERROR : INPUT_NORMAL}
          />
        </FormField>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? i18nc("loading") : i18n("setNewPassword")}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p>...</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
