import clsx from "clsx";

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const normalized = status.toLowerCase();
  
  const styles = {
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400",
    running: "bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse dark:bg-blue-500/20 dark:text-blue-400",
    completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400",
    failed: "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400",
  };

  const currentStyle = styles[normalized as keyof typeof styles] || styles.pending;

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider",
        currentStyle,
        className
      )}
    >
      {status}
    </span>
  );
}
