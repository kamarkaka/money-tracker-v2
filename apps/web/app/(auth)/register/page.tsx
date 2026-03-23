"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { UserIcon, EnvelopeIcon, LockClosedIcon } from "@heroicons/react/24/outline";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_DIGIT_RE = /\d/;
const PASSWORD_UPPER_RE = /[A-Z]/;
const PASSWORD_SPECIAL_RE = /[^A-Za-z0-9]/;

function validatePassword(pw: string): string | null {
  if (!pw) return "Password is required";
  const issues: string[] = [];
  if (pw.length < 8) issues.push("at least 8 characters");
  if (!PASSWORD_DIGIT_RE.test(pw)) issues.push("one digit");
  if (!PASSWORD_UPPER_RE.test(pw)) issues.push("one uppercase letter");
  if (!PASSWORD_SPECIAL_RE.test(pw)) issues.push("one special character");
  if (issues.length > 0) return `Password must contain ${issues.join(", ")}`;
  return null;
}

export default function RegisterPage() {
  const router = useRouter();
  const i18n = useTranslations("auth");
  const i18nc = useTranslations("common");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const markTouched = (field: keyof typeof touched) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const nameError = touched.name && !name.trim() ? i18nc("required") : "";
  const emailError = touched.email
    ? !email.trim()
      ? i18n("emailRequired")
      : !EMAIL_RE.test(email)
        ? i18nc("error")
        : ""
    : "";
  const passwordError = touched.password ? validatePassword(password) ?? "" : "";
  const confirmPasswordError =
    touched.confirmPassword && confirmPassword !== password
      ? i18nc("error")
      : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTouched({ name: true, email: true, password: true, confirmPassword: true });

    if (!name.trim() || !email.trim() || !EMAIL_RE.test(email)) return;
    const pwError = validatePassword(password);
    if (pwError) return;
    if (password !== confirmPassword) return;

    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || i18nc("error"));
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(i18nc("error"));
    } else {
      router.push("/overview");
    }
  };

  const inputWrapperClass = (hasError: string) =>
    `flex h-12 items-center gap-2 rounded-md border bg-input-bg px-3 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent ${
      hasError ? "border-red-500 dark:border-red-500" : "border-card-border"
    }`;

  const inputClass =
    "h-full w-full border-0 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none dark:text-zinc-50 dark:placeholder-zinc-500";

  return (
    <>
      <div className="mb-6 flex flex-col items-center">
        <div className="animate-bounce-in">
          <Image src="/logo.png" alt="App Logo" width={80} height={80} priority className="rounded-xl shadow-lg" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {i18n("register")}
        </h1>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <div className={inputWrapperClass(nameError)}>
            <UserIcon className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => markTouched("name")}
              placeholder={i18nc("name")}
              className={inputClass}
            />
          </div>
          {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
        </div>
        <div>
          <div className={inputWrapperClass(emailError)}>
            <EnvelopeIcon className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => markTouched("email")}
              placeholder={i18nc("email")}
              className={inputClass}
            />
          </div>
          {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
        </div>
        <div>
          <div className={inputWrapperClass(passwordError)}>
            <LockClosedIcon className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => markTouched("password")}
              placeholder={i18nc("password")}
              className={inputClass}
            />
          </div>
          {passwordError && <p className="mt-1 text-xs text-red-500">{passwordError}</p>}
        </div>
        <div>
          <div className={inputWrapperClass(confirmPasswordError)}>
            <LockClosedIcon className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => markTouched("confirmPassword")}
              placeholder={i18n("confirmPassword")}
              className={inputClass}
            />
          </div>
          {confirmPasswordError && <p className="mt-1 text-xs text-red-500">{confirmPasswordError}</p>}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="h-12 cursor-pointer rounded-md bg-accent px-4 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? i18nc("loading") : i18n("register")}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        {i18n("hasAccount")}{" "}
        <Link href="/login" className="cursor-pointer font-medium text-accent hover:underline">
          {i18n("login")}
        </Link>
      </p>
    </>
  );
}
