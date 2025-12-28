import { motion } from "framer-motion";
import { useMaterials } from "@/hooks/use-materials";
import { useSimulations } from "@/hooks/use-simulations";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Layers,
  Zap,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
  Play,
} from "lucide-react";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const { data: materials, isLoading: loadingMaterials } = useMaterials();
  const { data: simulations, isLoading: loadingSimulations } = useSimulations();

  const activeSimulations =
    simulations?.filter((s) => s.status === "running").length || 0;
  const completedSimulations =
    simulations?.filter((s) => s.status === "completed").length || 0;
  const failedSimulations =
    simulations?.filter((s) => s.status === "failed").length || 0;
  const pendingSimulations =
    simulations?.filter((s) => s.status === "pending").length || 0;

  const stats = [
    {
      label: "Total Materials",
      value: materials?.length || 0,
      icon: Layers,
      color: "text-blue-500",
    },
    {
      label: "Active Simulations",
      value: activeSimulations,
      icon: Activity,
      color: "text-amber-500",
    },
    {
      label: "Completed Runs",
      value: completedSimulations,
      icon: Clock,
      color: "text-emerald-500",
    },
    {
      label: "Queued Jobs",
      value: pendingSimulations,
      icon: TrendingUp,
      color: "text-purple-500",
    },
  ];

  // Chart data for simulation types
  const simTypeData =
    simulations?.reduce((acc: any[], sim) => {
      const existing = acc.find((x) => x.type === sim.type);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ type: sim.type, count: 1 });
      }
      return acc;
    }, []) || [];

  if (loadingMaterials || loadingSimulations) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of your material database and simulation jobs.
          </p>
        </div>
        <Link href="/simulations/create">
          <Button className="w-full sm:w-auto font-semibold opacity-90 hover:opacity-100">
            <Zap className="h-4 w-4 fill-current" />
            Create
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <h3 className="text-3xl font-bold font-display mt-2">
                  {stat.value}
                </h3>
              </div>
              <div
                className={`p-3 rounded-xl bg-background border border-border ${stat.color}`}
              >
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Simulation Types Chart */}
      {/* <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-card rounded-2xl border border-border p-6"
      >
        <h2 className="text-lg font-semibold font-display mb-4">
          Simulation Distribution
        </h2>
        {simTypeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={simTypeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No simulations yet
          </p>
        )}
      </motion.div> */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Simulations - Active First */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border overflow-hidden"
        >
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold font-display">
              Recent Simulations
            </h2>
            <Link
              href="/simulations"
              className="text-sm text-primary hover:underline cursor-pointer"
            >
              View All →
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {simulations?.slice(0, 6).map((sim) => (
              <Link key={sim.id} href={`/simulations/${sim.id}`}>
                <div className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {sim.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {sim.type}
                      </p>
                    </div>
                    <StatusBadge status={sim.status} />
                  </div>
                  {sim.status === "running" && sim.progress != null && (
                    <div className="mt-3 w-full">
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className={`text-[10px] font-semibold px-3 py-0.5 rounded-full border ${
                            sim.progress < 20
                              ? "text-slate-900 bg-slate-200 border-slate-300"
                              : sim.progress < 70
                              ? "text-blue-900 bg-blue-200 border-blue-300"
                              : "text-emerald-900 bg-emerald-200 border-emerald-300"
                          }`}
                        >
                          {sim.progress < 20
                            ? "Meshing"
                            : sim.progress < 70
                            ? "Solving"
                            : "Post-processing"}
                        </span>
                        <span className="text-xs font-semibold text-primary">
                          {sim.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all duration-300"
                          style={{ width: `${sim.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
            {(!simulations || simulations.length === 0) && (
              <div className="p-8 text-center text-muted-foreground">
                No simulations found.
              </div>
            )}
          </div>
        </motion.div>

        {/* Materials Library */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-2xl border border-border overflow-hidden"
        >
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold font-display">
              Material Library
            </h2>
            <Link
              href="/materials"
              className="text-sm text-primary hover:underline cursor-pointer"
            >
              View All →
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {materials?.slice(0, 6).map((mat) => (
              <Link key={mat.id} href={`/materials/${mat.id}`}>
                <div className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {mat.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {mat.category} • {mat.density} kg/m³
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-semibold">
                        {mat.youngsModulus} GPa
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Young's Mod.
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {(!materials || materials.length === 0) && (
              <div className="p-8 text-center text-muted-foreground">
                No materials in database.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
