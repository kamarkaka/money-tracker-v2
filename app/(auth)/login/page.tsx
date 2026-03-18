"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FormField } from "@/app/components/ui/FormField";

export default function LoginPage() {
  const router = useRouter();
  const i18n = useTranslations("auth");
  const i18nc = useTranslations("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(i18n("invalidCredentials"));
    } else {
      router.push("/overview");
    }
  };

  return (
    <>
      <div className="mb-8 flex flex-col items-center">
        <Image
          src="/logo.png"
          alt="App Logo"
          width={256}
          height={256}
          priority
          className="mb-4 rounded-lg shadow-lg"
        />
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Money Tracker 2
          <span className="relative -top-3 -right-1 rounded-full border border-red-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-500">
            alpha
          </span>
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={i18nc("email")} error="">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </FormField>
        <FormField label={i18nc("password")} error="">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </FormField>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="cursor-pointer text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            {i18n("forgotPassword")}
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? i18nc("loading") : i18n("login")}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-300 dark:border-zinc-600" />
        </div>
      </div>

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/overview" })}
        className="flex w-full items-center justify-center gap-2 rounded-md border-zinc-300 px-4 py-2 text-sm font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-300 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
      >
        <svg className="h-6 w-6" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
          <path fill="none" d="M0 0h48v48H0z"></path>
        </svg>
        {i18n("signInWithGoogle")}
      </button>

      <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
        {i18n("noAccount")}{" "}
        <Link href="/register" className="cursor-pointer font-medium text-zinc-900 hover:underline dark:text-zinc-50">
          {i18n("register")}
        </Link>
      </p>
    </>
  );
}
