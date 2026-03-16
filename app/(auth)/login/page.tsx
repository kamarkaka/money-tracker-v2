"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FormField } from "@/app/components/ui/FormField";

export default function LoginPage() {
  const router = useRouter();
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
      setError("Invalid email or password");
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
          width={256}      // Adjust width as needed
          height={256}     // Adjust height as needed
          priority        // Ensures the logo loads quickly as an LCP element
          className="mb-4 rounded-lg shadow-lg"
        />
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Money Tracker 2
          <span className="relative -top-3 -right-1 rounded-full border border-red-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-500">
            alpha
          </span>
        </h1>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Personal Budgeting Helper
        </span>
      </div>
      
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
        <FormField label="Password" error="">
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
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            Forgot Password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
          Register
        </Link>
      </p>
    </>
  );
}
