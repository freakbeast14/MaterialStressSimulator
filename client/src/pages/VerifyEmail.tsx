import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Link } from "wouter";

type VerifyState = "idle" | "success" | "error";

export default function VerifyEmail() {
  const [status, setStatus] = useState<VerifyState>("idle");
  const [message, setMessage] = useState("Verifying your email...");
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const token = query.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message ?? "Verification failed.");
        }
        setStatus("success");
        setMessage("Email verified! You can now sign in.");
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed.");
      }
    };

    void verify();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Verify Email
        </h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{message}</p>
        {status !== "idle" && (
          <div className="mt-6">
            <Link href="/login">
              <Button>Go to Sign In</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
