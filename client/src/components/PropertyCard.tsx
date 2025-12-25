interface PropertyCardProps {
  label: string;
  value: string | number;
  unit?: string;
}

export function PropertyCard({ label, value, unit }: PropertyCardProps) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border hover:border-primary/50 transition-colors shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-xl font-mono font-semibold text-foreground">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
