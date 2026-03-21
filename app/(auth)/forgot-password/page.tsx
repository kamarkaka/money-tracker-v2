"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { EnvelopeIcon } from "@heroicons/react/24/outline";

export default function ForgotPasswordPage() {
  const i18n = useTranslations("auth");
  const i18nc = useTranslations("common");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);
    setSubmitted(true);
  };

  return (
    <>
      <div className="mb-6 flex flex-col items-center">
        <div className="animate-bounce-in">
          <Image src="/logo.png" alt="App Logo" width={80} height={80} priority className="rounded-xl shadow-lg" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {i18n("forgotPassword")}
        </h1>
      </div>
      {submitted ? (
        <div className="flex flex-col gap-4">
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            {i18n("resetSent")}
          </p>
          <Link
            href="/login"
            className="cursor-pointer text-center text-sm font-medium text-accent hover:underline"
          >
            {i18n("backToLogin")}
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex h-12 items-center gap-2 rounded-md border border-card-border bg-input-bg px-3 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
              <EnvelopeIcon className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={i18nc("email")}
                required
                className="h-full w-full border-0 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none dark:text-zinc-50 dark:placeholder-zinc-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-12 cursor-pointer rounded-md bg-accent px-4 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? i18nc("loading") : i18n("sendResetLink")}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            <Link
              href="/login"
              className="cursor-pointer font-medium text-accent hover:underline"
            >
              {i18n("backToLogin")}
            </Link>
          </p>
        </>
      )}
    </>
  );
}
