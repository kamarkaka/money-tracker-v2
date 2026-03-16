"use client";

import { useState } from "react";
import Link from "next/link";
import { FormField } from "@/app/components/ui/FormField";

export default function ForgotPasswordPage() {
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
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Forgot Password
      </h1>
      {submitted ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            If an account with that email exists, we&apos;ve sent a reset link.
          </p>
          <Link
            href="/login"
            className="cursor-pointer text-center text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
          >
            Back to log in
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Enter your email address and we&apos;ll send you a link to reset
            your password.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField label="Email" error="">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </FormField>
            <button
              type="submit"
              disabled={loading}
              className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
            <Link
              href="/login"
              className="cursor-pointer font-medium text-zinc-900 hover:underline dark:text-zinc-50"
            >
              Back to log in
            </Link>
          </p>
        </>
      )}
    </>
  );
}
