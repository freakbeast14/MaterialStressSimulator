import { motion } from "framer-motion";
import { useMaterials } from "@/hooks/use-materials";
import { useSimulations } from "@/hooks/use-simulations";
import { useGeometries } from "@/hooks/use-geometries";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Layers,
  Zap,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
  Play,
  Box,
  Ban
} from "lucide-react";
import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Plot from "react-plotly.js";

type GeometryMiniPreviewProps = {
  geometryId: number;
  format: string;
  refreshToken?: string;
};

function GeometryMiniPreview({
  geometryId,
  format,
  refreshToken,
}: GeometryMiniPreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!geometryId || format.toLowerCase() !== "stl") {
      setContent(null);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetch(`/api/geometries/${geometryId}/content?ts=${Date.now()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load geometry");
        return res.json();
      })
      .then((data) => {
        setContent(data.contentBase64 || null);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load geometry");
        setContent(null);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [geometryId, format, refreshToken]);

  const mesh = useMemo(() => {
    if (!content) return null;
    const normalized = content.includes(",") ? content.split(",")[1] : content;
    let decoded = "";
    try {
      decoded = atob(normalized);
    } catch {
      return null;
    }
    if (!decoded.trim().startsWith("solid")) return null;
    const vertexRegex =
      /vertex\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)/g;
    const x: number[] = [];
    const y: number[] = [];
    const z: number[] = [];
    const i: number[] = [];
    const j: number[] = [];
    const k: number[] = [];
    let match: RegExpExecArray | null;
    let idx = 0;
    while ((match = vertexRegex.exec(decoded)) !== null) {
      x.push(parseFloat(match[1]));
      y.push(parseFloat(match[2]));
      z.push(parseFloat(match[3]));
      if (x.length % 3 === 0) {
        i.push(idx);
        j.push(idx + 1);
        k.push(idx + 2);
        idx += 3;
      }
    }
    if (x.length < 3) return null;
    return { x, y, z, i, j, k };
  }, [content]);

  return (
    <div className="h-12 w-12 rounded-lg p-1 m-[-4px]">
      {isLoading ? (
        <div className="h-full w-full rounded-md bg-muted/40 animate-pulse" />
      ) : error || !mesh ? (
        <div className="flex h-full w-full items-center justify-center rounded-md bg-muted/30 text-[10px] font-semibold text-muted-foreground">
          STL
        </div>
      ) : (
        <Plot
          data={[
            {
              type: "mesh3d",
              x: mesh.x,
              y: mesh.y,
              z: mesh.z,
              i: mesh.i,
              j: mesh.j,
              k: mesh.k,
              color: "#60a5fa",
              opacity: 0.8,
              hoverinfo: "skip",
              // hovertemplate: "",
            } as any,
          ]}
          layout={{
            margin: { l: 0, r: 0, t: 0, b: 0 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            scene: {
              aspectmode: "data",
              xaxis: { visible: false },
              yaxis: { visible: false },
              zaxis: { visible: false },
            },
          }}
          style={{ width: "100%", height: "100%" }}
          config={{ displayModeBar: false }}
        />
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: materials, isLoading: loadingMaterials } = useMaterials();
  const { data: simulations, isLoading: loadingSimulations } = useSimulations();
  const { data: geometries, isLoading: loadingGeometries } = useGeometries();

  const activeSimulations =
    simulations?.filter((s) => s.status === "running").length || 0;
  const completedSimulations =
    simulations?.filter((s) => s.status === "completed").length || 0;
  const failedSimulations =
    simulations?.filter((s) => s.status === "failed").length || 0;
  const pendingSimulations =
    simulations?.filter((s) => s.status === "pending").length || 0;
  const truncateText = (value: string, max: number) =>
    value.length > max ? `${value.slice(0, max)}…` : value;

  const stats = [
    // {
    //   label: "Total Materials",
    //   value: materials?.length || 0,
    //   icon: Layers,
    //   color: "text-blue-500",
    // },
    // {
    //   label: "Total Geometries",
    //   value: geometries?.length || 0,
    //   icon: Box,
    //   color: "text-blue-500",
    // },
    {
      label: "Completed Runs",
      value: completedSimulations,
      icon: Clock,
      color: "text-emerald-500",
    },
    {
      label: "Active Simulations",
      value: activeSimulations,
      icon: Activity,
      color: "text-amber-500",
    },
    {
      label: "Queued Jobs",
      value: pendingSimulations,
      icon: TrendingUp,
      color: "text-purple-500",
    },
    {
      label: "Failed Jobs",
      value: failedSimulations,
      icon: Ban,
      color: "text-red-500",
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

  const recentSimulations =
    simulations
      ? [...simulations].sort((a, b) => {
          const statusRank = (status: string) => {
            if (status === "running") return 0;
            if (status === "pending") return 1;
            return 2;
          };
          const statusDelta = statusRank(a.status) - statusRank(b.status);
          if (statusDelta !== 0) return statusDelta;
          const aTime =
            (a.updatedAt && Date.parse(a.updatedAt)) ||
            (a.completedAt && Date.parse(a.completedAt)) ||
            (a.createdAt && Date.parse(a.createdAt)) ||
            0;
          const bTime =
            (b.updatedAt && Date.parse(b.updatedAt)) ||
            (b.completedAt && Date.parse(b.completedAt)) ||
            (b.createdAt && Date.parse(b.createdAt)) ||
            0;
          return bTime - aTime;
        })
      : [];

  if (loadingMaterials || loadingSimulations || loadingGeometries) {
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

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Recent Simulations - Active First */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border overflow-hidden lg:w-1/2"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold font-display">
              Recent Simulations
            </h2>
            <Link
              href="/simulations"
              className="group inline-flex items-center gap-1 text-xs font-semibold text-primary/85 transition-colors hover:text-primary"
            >
              View All
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {recentSimulations.slice(0, 6).map((sim) => (
              <Link key={sim.id} href={`/simulations/${sim.id}`}>
                <div className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate" title={sim.name}>
                        {truncateText(sim.name, 30)}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1" title={sim.type}>
                        {truncateText(sim.type, 30)}
                      </p>
                    </div>
                    <StatusBadge status={sim.paramsDirty ? "Updated" : sim.status} />
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

        <div className="flex w-full gap-8 lg:w-1/2">
          {/* Materials Library */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-card w-full rounded-2xl border border-border overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold font-display">
                Materials
              </h2>
              <Link
                href="/materials"
                className="group inline-flex items-center gap-1 text-xs font-semibold text-primary/85 transition-colors hover:text-primary"
              >
                View All
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="divide-y divide-border/50">
              {materials?.slice(0, 6).map((mat) => (
                <Link key={mat.id} href={`/materials/${mat.id}`}>
                  <div className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate" title={mat.name}>
                          {truncateText(mat.name, 30)}
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

          {/* Geometry Library */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-card w-full rounded-2xl border border-border overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold font-display">
                Geometries
              </h2>
              <Link
                href="/geometries"
                className="group inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
              >
                View All
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="divide-y divide-border/50">
              {geometries?.slice(0, 6).map((geom) => (
                <Link key={geom.id} href="/geometries">
                  <div className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4
                          className="font-medium text-foreground group-hover:text-primary transition-colors truncate"
                          title={geom.name}
                        >
                          {truncateText(geom.name, 30)}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {geom.format.toUpperCase()} • {geom.sizeBytes > 0 ? `${Math.round(geom.sizeBytes / 1024)} KB` : "—"}
                        </p>
                      </div>
                      <GeometryMiniPreview
                        geometryId={geom.id}
                        format={geom.format}
                        refreshToken={`${geom.originalName}-${geom.sizeBytes}`}
                      />
                    </div>
                  </div>
                </Link>
              ))}
              {(!geometries || geometries.length === 0) && (
                <div className="p-8 text-center text-muted-foreground">
                  No geometries in library.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
