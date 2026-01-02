import { Mail } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function CheckEmail() {
  const [location] = useLocation();
  const emailMatch = /[?&]email=([^&]+)/.exec(location);
  const email = emailMatch ? decodeURIComponent(emailMatch[1]) : "your email";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          We just sent a verification link to{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {email}
          </span>
          .
        </p>
        <div className="mt-6">
          <Link href="/login" className="text-sm font-semibold text-primary">
            Go to login
          </Link>
        </div>
      </div>
    </div>
  );
}
