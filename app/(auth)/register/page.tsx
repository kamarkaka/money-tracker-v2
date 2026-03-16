"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormField } from "@/app/components/ui/FormField";

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

const INPUT_BASE =
  "rounded-md border px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 dark:bg-zinc-800 dark:text-zinc-50";
const INPUT_NORMAL =
  `${INPUT_BASE} border-zinc-300 focus:border-blue-500 focus:ring-blue-500 dark:border-zinc-600`;
const INPUT_ERROR =
  `${INPUT_BASE} border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-500`;

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Track which fields have been touched (blurred)
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const markTouched = (field: keyof typeof touched) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  // Field-level errors (only shown after blur)
  const nameError = touched.name && !name.trim() ? "Name is required" : "";
  const emailError = touched.email
    ? !email.trim()
      ? "Email is required"
      : !EMAIL_RE.test(email)
        ? "Please enter a valid email address"
        : ""
    : "";
  const passwordError = touched.password ? validatePassword(password) ?? "" : "";
  const confirmPasswordError =
    touched.confirmPassword && confirmPassword !== password
      ? "Passwords do not match"
      : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Touch all fields to show any remaining errors
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
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }

    // Auto sign-in after registration
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Registration succeeded but auto-login failed. Please log in manually.");
    } else {
      router.push("/overview");
    }
  };

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Create an account
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Name" error={nameError}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => markTouched("name")}
            className={nameError ? INPUT_ERROR : INPUT_NORMAL}
          />
        </FormField>
        <FormField label="Email" error={emailError}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => markTouched("email")}
            className={emailError ? INPUT_ERROR : INPUT_NORMAL}
          />
        </FormField>
        <FormField label="Password" error={passwordError}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => markTouched("password")}
            className={passwordError ? INPUT_ERROR : INPUT_NORMAL}
          />
        </FormField>
        <FormField label="Confirm Password" error={confirmPasswordError}>
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
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="cursor-pointer font-medium text-zinc-900 hover:underline dark:text-zinc-50">
          Log in
        </Link>
      </p>
    </>
  );
}
