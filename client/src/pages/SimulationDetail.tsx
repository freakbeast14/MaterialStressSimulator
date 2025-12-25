import { useParams } from "wouter";
import type { ElementType } from "react";
import { useSimulation } from "@/hooks/use-simulations";
import { useMaterial } from "@/hooks/use-materials";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Activity,
  BarChart2,
  Box,
  ChevronLeft,
  Download,
  Gauge,
  Ruler,
  Share2,
  Thermometer,
  Timer,
  Waves,
  AlertCircle,
} from "lucide-react";
import { Link } from "wouter";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
import { motion } from "framer-motion";
import Plot from "react-plotly.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState } from "react";

export default function SimulationDetail() {
  const { id } = useParams();
  const { data: simulation, isLoading } = useSimulation(parseInt(id || "0"));
  const { data: material } = useMaterial(simulation?.materialId || 0);
  const [showConfigDetails, setShowConfigDetails] = useState(false);
  const { toast } = useToast();

  const results = simulation?.results as any;
  const isCompleted = simulation?.status === "completed";
  const isRunning =
    simulation?.status === "running" || simulation?.status === "pending";
  const solverSource = results?.source || "unknown";
  const solverBadge =
    solverSource === "fenics"
      ? "FEniCS"
      : solverSource === "fallback"
      ? "Fallback"
      : "Solver";
  const stressSeries = results?.timeSeriesData?.map((d: any) => d.stress) || [];
  const maxStress =
    stressSeries.length > 0
      ? Math.max(...stressSeries)
      : results?.maxStress ?? 0;
  const minStress =
    stressSeries.length > 0 ? Math.min(...stressSeries) : results?.minStress ?? 0;
  const avgStress =
    stressSeries.length > 0
      ? stressSeries.reduce((sum: number, value: number) => sum + value, 0) /
        stressSeries.length
      : results?.avgStress ?? 0;
  const stressRange =
    stressSeries.length > 0 ? maxStress - minStress : 0;
  const formatNumber = (value?: number, decimals = 3) =>
    typeof value === "number" && Number.isFinite(value)
      ? value.toFixed(decimals)
      : "N/A";
  const formatMicrostrain = (value?: number) =>
    typeof value === "number" && Number.isFinite(value)
      ? (value * 1_000_000).toFixed(2)
      : "N/A";
  const runDate = simulation?.createdAt
    ? new Date(simulation.createdAt).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  const primaryConfigItems = useMemo(
    () =>
      [
        { label: "Material", value: material?.name || "Unknown", icon: Box },
        { label: "Test Type", value: simulation?.type || "Unknown", icon: Activity },
      ] as {
        label: string;
        value: string;
        icon: ElementType;
      }[],
    [material?.name, simulation?.type]
  );

  const secondaryConfigItems = useMemo(
    () =>
      [
        material?.youngsModulus != null
          ? {
              label: "Young's Modulus",
              value: `${formatNumber(material.youngsModulus)} GPa`,
              icon: Ruler,
            }
          : null,
        simulation?.appliedLoad != null
          ? {
              label: "Applied Load",
              value: `${formatNumber(simulation.appliedLoad)} N`,
              icon: Gauge,
            }
          : null,
        simulation?.temperature != null
          ? {
              label: "Temperature",
              value: `${formatNumber(simulation.temperature)} C`,
              icon: Thermometer,
            }
          : null,
        simulation?.duration != null
          ? {
              label: "Duration",
              value: `${formatNumber(simulation.duration)} s`,
              icon: Timer,
            }
          : null,
        simulation?.frequency != null
          ? {
              label: "Frequency",
              value: `${formatNumber(simulation.frequency)} Hz`,
              icon: Waves,
            }
          : null,
      ].filter(Boolean) as {
        label: string;
        value: string;
        icon: ElementType;
      }[],
    [
      material?.youngsModulus,
      simulation?.appliedLoad,
      simulation?.temperature,
      simulation?.duration,
      simulation?.frequency,
    ]
  );

  const stressStrainData =
    (results?.stressStrainCurve as { strain: number; stress: number }[] | undefined) ||
    material?.stressStrainCurve ||
    [];
  const progressStage =
    (simulation?.progress ?? 0) < 20
      ? "Meshing"
      : (simulation?.progress ?? 0) < 70
      ? "Solving"
      : "Post-processing";
  const timeMax =
    results?.timeSeriesData?.length > 0
      ? Math.max(...results.timeSeriesData.map((point: any) => Number(point.time) || 0))
      : 0;
  const timeTickStep = (() => {
    if (timeMax <= 0.5) return 0.5;
    const candidates = [0.5, 1, 2, 5, 10, 15, 30, 60];
    const targetTicks = 6;
    const rawStep = timeMax / targetTicks;
    for (const step of candidates) {
      if (step >= rawStep) return step;
    }
    return 60;
  })();
  const timeTickMax = timeMax > 0 ? Math.ceil(timeMax / timeTickStep) * timeTickStep : 0;
  const timeTicks = Array.from(
    { length: Math.floor(timeTickMax / timeTickStep) + 1 },
    (_, idx) => Number((idx * timeTickStep).toFixed(2))
  );
  const formatTimeTick = (value: number) =>
    timeTickStep === 0.5 ? value.toFixed(1) : Math.round(value).toString();
  const handleExportCsv = () => {
    if (!results) return;
    const rows = [
      ["Simulation Name", simulation.name],
      ["Simulation ID", simulation.id],
      ["Material", material?.name || "Unknown"],
      ["Test Type", simulation.type],
      ["Max Stress (MPa)", results.maxStress ?? ""],
      ["Min Stress (MPa)", results.minStress ?? ""],
      ["Avg Stress (MPa)", results.avgStress ?? ""],
      ["Stress Range (MPa)", results.stressRange ?? ""],
      ["Max Deformation (mm)", results.maxDeformation ?? ""],
      ["Max Strain", results.maxStrain ?? ""],
      ["Avg Strain", results.avgStrain ?? ""],
      ["Safety Factor", results.safetyFactor ?? ""],
      [],
      ["Time (s)", "Stress (MPa)", "Displacement (mm)"],
      ...(results.timeSeriesData || []).map((point: any) => [
        point.time,
        point.stress,
        point.displacement,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) =>
            typeof cell === "string" && cell.includes(",")
              ? `"${cell.replace(/"/g, '""')}"`
              : String(cell ?? "")
          )
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${simulation.name || "simulation"}-results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/simulations/${simulation.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Simulation link copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy link. Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <div className="p-8">Loading simulation...</div>;
  if (!simulation) return <div className="p-8">Simulation not found</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        <Link
          href="/simulations"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to History
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display font-bold text-foreground">
                {simulation.name}
              </h1>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-1">
                #{simulation.id}
              </span>
              <StatusBadge status={simulation.status} />
              {isCompleted && results && (
                <span className="text-xs font-semibold tracking-wider bg-muted text-muted-foreground border border-border rounded-full px-2 py-1">
                  {solverBadge}
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              Run on {runDate}
            </p>
          </div>
          {!isRunning && (
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="hover:bg-primary/10 hover:text-primary" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" onClick={handleExportCsv} className="hover:bg-primary/10 hover:text-primary">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          )}
        </div>
      </div>

      {isRunning && (
        <div className="bg-card p-8 rounded-2xl border border-border shadow-sm space-y-6">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
            <div>
              <h3 className="text-xl font-medium">Simulation in Progress</h3>
              <p className="text-muted-foreground mt-2 max-w-md">
                The finite element solver is currently calculating stresses and deformations.
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              {/* <span className="text-sm font-semibold">Analyisis Progress</span> */}
              <span
                className={`text-xs font-semibold px-4 py-1 rounded-full border ${
                  progressStage === "Meshing"
                    ? "text-slate-900 bg-slate-200 border-slate-300"
                    : progressStage === "Solving"
                    ? "text-blue-900 bg-blue-200 border-blue-300"
                    : "text-emerald-900 bg-emerald-200 border-emerald-300"
                }`}
              >
                {progressStage}
              </span>
              <span className="text-lg font-bold text-primary">
                {simulation.progress || 0}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <motion.div 
                className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${simulation.progress || 0}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      )}

      {isCompleted && results && (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Configuration
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfigDetails((prev) => !prev)}
                  className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition"
                  aria-label="Toggle configuration details"
                >
                  <ChevronLeft
                    className={`h-4 w-4 transition-transform ${showConfigDetails ? "rotate-90" : "-rotate-90"}`}
                  />
                </button>
              </div>
              <div className="space-y-3">
                {primaryConfigItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-3"
                  >
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                        item.label === "Material"
                          ? "bg-sky-100 text-sky-700"
                          : item.label === "Test Type"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="font-semibold text-foreground">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {showConfigDetails && secondaryConfigItems.length > 0 && (
                <div className="space-y-3 pt-2">
                  {secondaryConfigItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-xl bg-muted/20 px-4 py-3"
                    >
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                          item.label === "Young's Modulus"
                            ? "bg-amber-100 text-amber-700"
                            : item.label === "Applied Load"
                            ? "bg-rose-100 text-rose-700"
                            : item.label === "Temperature"
                            ? "bg-orange-100 text-orange-700"
                            : item.label === "Duration"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.label === "Frequency"
                            ? "bg-violet-100 text-violet-700"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="font-semibold text-foreground">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 space-y-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                Key Metrics
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Max Stress</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(maxStress)} MPa
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Stress</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(avgStress)} MPa
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="stress-strain" className="space-y-6">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="stress-strain">Stress-Strain Curve</TabsTrigger>
              <TabsTrigger value="stress-distribution">Stress Distribution</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              <TabsTrigger value="surface">3D Surface</TabsTrigger>
            </TabsList>

            <TabsContent value="stress-strain">
              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <h3 className="text-lg font-semibold font-display">
                  Stress vs. Strain Curve
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Real-time simulation output plotting mechanical response.
                </p>
                <div className="h-[420px] mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stressStrainData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--muted-foreground))"
                        opacity={0.2}
                      />
                      <XAxis
                        dataKey="strain"
                        label={{
                          value: "Strain (e)",
                          position: "insideBottom",
                          offset: -5,
                        }}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        label={{
                          value: "Stress (MPa)",
                          angle: -90,
                          position: "insideLeft",
                        }}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="stress"
                        name="Stress Response"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stress-distribution" className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                Stress Over Time
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={results.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="time"
                    label={{ value: "Time (s)", position: "insideBottomRight", offset: -5 }}
                    ticks={timeTicks}
                    interval={0}
                    allowDecimals={timeTickStep === 0.5}
                    domain={[0, timeTickMax]}
                    tickFormatter={(value) => formatTimeTick(Number(value))}
                  />
                  <YAxis label={{ value: "Stress (MPa)", angle: -90, position: "insideLeft" }} />
                  <Tooltip labelFormatter={(value) => `Time: ${formatTimeTick(Number(value))} s`} />
                  <Line type="monotone" dataKey="stress" stroke="#3b82f6" name="Stress" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                Displacement Over Time
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={results.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="time"
                    label={{ value: "Time (s)", position: "insideBottomRight", offset: -5 }}
                    ticks={timeTicks}
                    interval={0}
                    allowDecimals={timeTickStep === 0.5}
                    domain={[0, timeTickMax]}
                    tickFormatter={(value) => formatTimeTick(Number(value))}
                  />
                  <YAxis label={{ value: "Displacement (mm)", angle: -90, position: "insideLeft" }} />
                  <Tooltip labelFormatter={(value) => `Time: ${formatTimeTick(Number(value))} s`} />
                  <Area type="monotone" dataKey="displacement" fill="#8b5cf6" stroke="#8b5cf6" name="Displacement" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            </TabsContent>

            <TabsContent value="statistics">
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-muted/30 rounded-2xl p-6">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Maximum Stress
                    </p>
                    <p className="text-3xl font-bold text-primary mt-3">
                      {formatNumber(maxStress)} MPa
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Peak stress encountered during simulation
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-2xl p-6">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Minimum Stress
                    </p>
                    <p className="text-3xl font-bold text-indigo-500 mt-3">
                      {formatNumber(minStress)} MPa
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Baseline stress at zero strain
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-2xl p-6">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Average Stress
                    </p>
                    <p className="text-3xl font-bold text-orange-500 mt-3">
                      {formatNumber(avgStress)} MPa
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Mean stress across all strain points
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-2xl p-6">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Stress Range
                    </p>
                    <p className="text-3xl font-bold text-emerald-500 mt-3">
                      {formatNumber(stressRange)} MPa
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Total variation in stress values
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-2xl p-6">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Maximum Strain
                    </p>
                    <p className="text-3xl font-bold text-sky-500 mt-3">
                      {formatMicrostrain(results?.maxStrain)} με
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Peak strain during simulation
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-2xl p-6">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Average Strain
                    </p>
                    <p className="text-3xl font-bold text-slate-500 mt-3">
                      {formatMicrostrain(results?.avgStrain)} με
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Mean strain across all points
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-2xl p-6">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Safety Factor
                    </p>
                    <p className="text-3xl font-bold text-emerald-600 mt-3">
                      {formatNumber(results?.safetyFactor)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Estimated margin to failure
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="surface">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-semibold mb-4">3D Stress-Displacement Surface</h3>
                <Plot
                  data={[
                    {
                      x: results.timeSeriesData.map((d: any) => d.time),
                      y: [0, 1],
                      z: [
                        results.timeSeriesData.map((d: any) => d.stress),
                        results.timeSeriesData.map((d: any) => d.displacement * 100),
                      ],
                      type: "surface",
                      colorscale: "Viridis",
                    } as any
                  ]}
              layout={{
                title: "3D Analysis Surface",
                scene: {
                  xaxis: {
                    title: "Time (s)",
                    tickformat: timeTickStep === 0.5 ? ".1f" : ".0f",
                    dtick: timeTickStep,
                  },
                  yaxis: { title: "Type" },
                  zaxis: { title: "Value" },
                },
                    autosize: true,
                    height: 450,
                    paper_bgcolor: "transparent",
                    plot_bgcolor: "transparent",
                    font: { color: "var(--foreground)" },
                  }}
                  style={{ width: "100%" }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {simulation.status === "failed" && (
        <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-2xl flex items-center gap-4 text-destructive">
          <AlertCircle className="h-6 w-6" />
          <div>
            <h3 className="font-semibold">Simulation Failed</h3>
            <p className="text-sm opacity-90">
              The solver encountered a divergence error. Please check your
              boundary conditions and try again.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
