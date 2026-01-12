import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Info, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";

type ResetState = "idle" | "success" | "error";

export default function ResetPassword() {
  const [status, setStatus] = useState<ResetState>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const passwordRule = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const tokenParam = query.get("token");
    setToken(tokenParam);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token) {
      setStatus("error");
      setError("Missing reset token.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!passwordRule.test(password)) {
      setError("Password must include at least a number and a special character.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Reset failed.");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Reset Password
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Missing reset token.
          </p>
          <div className="mt-6">
            <Link href="/login">
              <Button>Go to Sign In</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
            Password updated
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Your password has been reset. You can now sign in.
          </p>
          <div className="mt-6">
            <Link href="/login" className="text-sm font-semibold text-primary hover:underline">
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Reset password
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Set a new password for your account.
        </p>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>New password</span>
              <span className="relative inline-flex items-center justify-center group">
                <Info className="h-3.5 w-3.5 text-slate-400 cursor-pointer" />
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 w-max -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <span className="relative rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
                    Password must be at least 8 characters and include a number and a special character.
                    <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-900" />
                  </span>
                </span>
              </span>
            </label>
            <div className="relative mt-2">
              <Input
                className="pr-10"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Confirm password
            </label>
            <div className="relative mt-2">
              <Input
                className="pr-10"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Repeat your password"
                minLength={8}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                onClick={() => setShowConfirm((prev) => !prev)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
