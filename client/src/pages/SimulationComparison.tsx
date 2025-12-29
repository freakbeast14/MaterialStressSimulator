import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSimulations } from "@/hooks/use-simulations";
import { useMaterials } from "@/hooks/use-materials";
import { useGeometries } from "@/hooks/use-geometries";
import { StatusBadge } from "@/components/StatusBadge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart } from "recharts";
import Plot from "react-plotly.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function SimulationComparison() {
  const { data: simulations } = useSimulations();
  const { data: materials } = useMaterials();
  const { data: geometries } = useGeometries();
  const [selectedSims, setSelectedSims] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState("comparison");
//   const scrollRef = useRef<number | null>(null);
  const initialRender = useRef(true);
  const [search, setSearch] = useState("");
  const [weights, setWeights] = useState({ stress: 1, deformation: 1, safety: 1 });

  const getMaterialName = (id: number) => materials?.find(m => m.id === id)?.name || "Unknown";
  const getGeometryName = (id?: number | null) =>
    geometries?.find((geom) => geom.id === id)?.name || "Unknown";
  const truncateText = (value: string, max = 10) =>
    value.length > max ? `${value.slice(0, max)}…` : value;
  const materialHueMap = useMemo(() => {
    const list = materials ?? [];
    const map = new Map<number, number>();
    const count = Math.max(list.length, 1);
    list.forEach((material, index) => {
      const hue = Math.round((index * 360) / count);
      map.set(material.id, hue);
    });
    return map;
  }, [materials]);
  const geometryHueMap = useMemo(() => {
    const list = geometries ?? [];
    const map = new Map<number, number>();
    const count = Math.max(list.length, 1);
    list.forEach((geometry, index) => {
      const hue = Math.round((index * 360) / count);
      map.set(geometry.id, hue);
    });
    return map;
  }, [geometries]);

  const getTypeBadgeClass = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized.includes("tensile")) return "bg-sky-100 text-sky-700";
    if (normalized.includes("thermal")) return "bg-orange-100 text-orange-700";
    if (normalized.includes("fatigue")) return "bg-indigo-100 text-indigo-700";
    return "bg-muted text-muted-foreground";
  };

  const toggleSimulation = (id: number) => {
    setSelectedSims(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const completedSims = simulations?.filter(s => s.status === "completed" && s.results) || [];
  const formatMetric = (value: number) =>
    Number.isFinite(value) ? value.toFixed(3) : "0.000";
  const getMaxStress = (sim: (typeof completedSims)[number]) => {
    const results = sim.results as any;
    const series = results?.timeSeriesData;
    if (Array.isArray(series) && series.length > 0) {
      return Math.max(...series.map((point: any) => Number(point?.stress) || 0));
    }
    return results?.maxStress || 0;
  };
  const filteredSims = completedSims.filter((sim) => {
    const geometryName = getGeometryName(sim.geometryId);
    const materialName = getMaterialName(sim.materialId);
    const query = search.toLowerCase();
    return (
      sim.name.toLowerCase().includes(query) ||
      sim.type.toLowerCase().includes(query) ||
      geometryName.toLowerCase().includes(search.toLowerCase()) ||
      materialName.toLowerCase().includes(query)
    );
  });
  const selected = completedSims.filter(s => selectedSims.includes(s.id));

  // Prepare data for 3D surface plot
  const prepare3DData = () => {
    if (selected.length < 2) return null;
    
    const z = selected.map((sim) => {
      const results = sim.results as any;
      return [
        getMaxStress(sim),
        results?.maxDeformation || 0,
        results?.safetyFactor || 0,
      ];
    });

    return {
      z,
      x: ["Max Stress (MPa)", "Max Deformation (mm)", "Safety Factor"],
      y: selected.map((s) => s.name),
      type: "heatmap" as const,
    };
  };

  // Comparison data for bar chart
  const comparisonData = selected.map(sim => ({
    name: sim.name,
    maxStress: getMaxStress(sim),
    maxDeformation: (sim.results as any)?.maxDeformation || 0,
    maxDeformationNanometers: ((sim.results as any)?.maxDeformation || 0) * 1_000_000,
    safetyFactor: (sim.results as any)?.safetyFactor || 0,
  }));

  const overlayTimeData = useMemo(() => {
    const maxPoints = Math.max(
      0,
      ...selected.map((sim) => (sim.results as any)?.timeSeriesData?.length || 0),
    );
    return Array.from({ length: maxPoints }, (_, idx) => {
      const row: Record<string, number | null> = {};
      selected.forEach((sim) => {
        const series = (sim.results as any)?.timeSeriesData || [];
        const point = series[idx];
        row[`sim-${sim.id}`] = point ? point.stress : null;
        if (point) row.time = point.time;
      });
      return row;
    });
  }, [selected]);

  const overlayStrainData = useMemo(() => {
    const maxPoints = Math.max(
      0,
      ...selected.map(
        (sim) => (sim.results as any)?.stressStrainCurve?.length || 0,
      ),
    );
    return Array.from({ length: maxPoints }, (_, idx) => {
      const row: Record<string, number | null> = {};
      selected.forEach((sim) => {
        const curve = (sim.results as any)?.stressStrainCurve || [];
        const point = curve[idx];
        row[`sim-${sim.id}`] = point ? point.stress : null;
        if (point) row.strain = point.strain;
      });
      return row;
    });
  }, [selected]);

  const scoreData = useMemo(() => {
    if (selected.length === 0) return [];
    const stressValues = selected.map((sim) => getMaxStress(sim));
    const defValues = selected.map((sim) => (sim.results as any)?.maxDeformation || 0);
    const safetyValues = selected.map((sim) => (sim.results as any)?.safetyFactor || 0);
    const stressMin = Math.min(...stressValues);
    const stressMax = Math.max(...stressValues);
    const defMin = Math.min(...defValues);
    const defMax = Math.max(...defValues);
    const safetyMin = Math.min(...safetyValues);
    const safetyMax = Math.max(...safetyValues);
    const normalize = (value: number, min: number, max: number) =>
      max === min ? 0.5 : (value - min) / (max - min);

    return selected.map((sim) => {
      const r = sim.results as any;
      const maxStress = getMaxStress(sim);
      const maxDef = r?.maxDeformation || 0;
      const safety = r?.safetyFactor || 0;
      const stressScore = 1 - normalize(maxStress, stressMin, stressMax);
      const defScore = 1 - normalize(maxDef, defMin, defMax);
      const safetyScore = normalize(safety, safetyMin, safetyMax);
      const weighted =
        stressScore * weights.stress +
        defScore * weights.deformation +
        safetyScore * weights.safety;
      const denom = weights.stress + weights.deformation + weights.safety || 1;
      return {
        id: sim.id,
        name: sim.name,
        maxStress,
        maxDef,
        safety,
        score: weighted / denom,
      };
    });
  }, [selected, weights]);


//   useLayoutEffect(() => {
//     if (initialRender.current) {
//       initialRender.current = false;
//       return;
//     }
//     if (scrollRef.current == null) return;
//     const target = scrollRef.current;
//     scrollRef.current = null;
//     requestAnimationFrame(() => {
//       requestAnimationFrame(() => {
//         window.scrollTo(0, target);
//       });
//     });
//   }, [activeTab]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Compare Simulations</h1>
        <p className="text-muted-foreground mt-1">Select completed simulations to compare results.</p>
      </div>

      {/* Selection */}
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-4">
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold">Available Simulations</h3>
            <div className="relative w-full max-w-[220px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8 h-9 bg-background"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="border-t border-border">
            {filteredSims.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No completed simulations yet.</p>
            ) : (
              <>
                <table className="w-full table-fixed text-xs text-left">
                  <colgroup>
                    <col className="w-10" />
                    <col className="w-14" />
                    <col className="w-[22%]" />
                    <col className="w-[18%]" />
                    <col className="w-[18%]" />
                    <col className="w-[18%]" />
                    <col className="w-[14%]" />
                  </colgroup>
                  <thead className="text-[11px] uppercase bg-muted text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-3 py-3"></th>
                      <th className="px-3 py-3">ID</th>
                      <th className="px-3 py-3">Name</th>
                      <th className="px-3 py-3">Test</th>
                      <th className="px-3 py-3">Material</th>
                      <th className="px-3 py-3">Geometry</th>
                      <th className="px-3 py-3">Status</th>
                    </tr>
                  </thead>
                </table>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full table-fixed text-xs text-left">
                    <colgroup>
                      <col className="w-10" />
                      <col className="w-14" />
                      <col className="w-[22%]" />
                      <col className="w-[18%]" />
                      <col className="w-[18%]" />
                      <col className="w-[18%]" />
                      <col className="w-[14%]" />
                    </colgroup>
                    <tbody className="divide-y divide-border">
                      {filteredSims.map((sim) => (
                        <tr
                          key={sim.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => toggleSimulation(sim.id)}
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedSims.includes(sim.id)}
                              onChange={() => toggleSimulation(sim.id)}
                              onClick={(event) => event.stopPropagation()}
                              className="w-4 h-4 rounded border-border"
                            />
                          </td>
                          <td className="px-3 py-3 font-mono text-muted-foreground">
                            #{sim.id}
                          </td>
                          <td
                            className="px-3 py-3 font-medium text-foreground truncate"
                            title={sim.name}
                          >
                            {truncateText(sim.name)}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            <span className={`px-2 py-1 rounded-md text-[11px] font-medium ${getTypeBadgeClass(sim.type)}`} title={truncateText(sim.type)}>
                              {truncateText(sim.type)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-foreground">
                            <span
                              style={
                                {
                                  "--badge-hue": materialHueMap.get(sim.materialId) ?? 210,
                                } as React.CSSProperties
                              }
                              className="px-2 py-1 rounded-md text-[11px] font-medium bg-[hsl(var(--badge-hue)_80%_90%)] text-[hsl(var(--badge-hue)_45%_30%)] dark:bg-[hsl(var(--badge-hue)_35%_20%)] dark:text-[hsl(var(--badge-hue)_70%_80%)]"
                              title={getMaterialName(sim.materialId)}
                            >
                              {truncateText(getMaterialName(sim.materialId))}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-foreground">
                            <span
                              style={
                                {
                                  "--badge-hue": geometryHueMap.get(sim.geometryId ?? 0) ?? 160,
                                } as React.CSSProperties
                              }
                              className="px-2 py-1 rounded-md text-[11px] font-medium bg-[hsl(var(--badge-hue)_80%_92%)] text-[hsl(var(--badge-hue)_45%_28%)] dark:bg-[hsl(var(--badge-hue)_35%_18%)] dark:text-[hsl(var(--badge-hue)_70%_85%)]"
                              title={getGeometryName(sim.geometryId)}
                            >
                              {truncateText(getGeometryName(sim.geometryId))}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {sim.status === "completed" ? (
                              <span
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500"
                                title="completed"
                              >
                                <svg
                                  viewBox="0 0 16 16"
                                  className="h-3.5 w-3.5 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="3.5 8.5 6.5 11.5 12.5 5.5" />
                                </svg>
                              </span>
                            ) : sim.status === "failed" ? (
                              <span
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500"
                                title="failed"
                              >
                                <svg
                                  viewBox="0 0 16 16"
                                  className="h-3.5 w-3.5 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <line x1="4" y1="4" x2="12" y2="12" />
                                  <line x1="12" y1="4" x2="4" y2="12" />
                                </svg>
                              </span>
                            ) : (
                              <StatusBadge
                                status={sim.paramsDirty ? "Updated" : sim.status}
                                className="text-[11px] font-mono tracking-normal"
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Metrics Table */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-semibold mb-4">Key Metrics</h3>
          {selected.length < 2 ? (
            <p className="text-muted-foreground text-sm">Select at least 2 simulations to compare.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-medium">ID</th>
                    <th className="text-left p-2 font-medium">Simulation</th>
                    <th className="text-right p-2 font-medium">Max Stress (MPa)</th>
                    <th className="text-right p-2 font-medium">Deformation (nm)</th>
                    <th className="text-right p-2 font-medium">Safety</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map((sim) => {
                    const r = sim.results as any;
                    return (
                      <tr key={sim.id} className="border-b border-border/50">
                        <td className="p-2 truncate max-w-xs font-mono text-muted-foreground">#{sim.id}</td>
                        <td className="p-2 truncate max-w-xs">{sim.name}</td>
                        <td className="text-right p-2 font-mono">
                          {formatMetric(getMaxStress(sim))}
                        </td>
                        <td className="text-right p-2 font-mono">
                          {formatMetric((r?.maxDeformation || 0) * 1_000_000)}
                        </td>
                        <td className="text-right p-2 font-mono">
                          {formatMetric(r?.safetyFactor || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      {selected.length >= 2 && (
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            // scrollRef.current = window.scrollY;
            setActiveTab(value);
          }}
          className="space-y-6"
        >
          <TabsList className="w-full justify-start bg-transparent">
            <TabsTrigger value="comparison">Results Comparison</TabsTrigger>
            <TabsTrigger value="overlay">Overlay Curves</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="metrics">3D Metrics Space</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison">
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-semibold">Results Comparison</h3>
                  <p className="text-sm text-muted-foreground">
                    Weighted score helps rank simulations by your priorities.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <label className="flex items-center gap-2">
                    Stress weight
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={weights.stress}
                      onChange={(event) =>
                        setWeights((prev) => ({
                          ...prev,
                          stress: Number(event.target.value),
                        }))
                      }
                      className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    Deformation weight
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={weights.deformation}
                      onChange={(event) =>
                        setWeights((prev) => ({
                          ...prev,
                          deformation: Number(event.target.value),
                        }))
                      }
                      className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    Safety weight
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={weights.safety}
                      onChange={(event) =>
                        setWeights((prev) => ({
                          ...prev,
                          safety: Number(event.target.value),
                        }))
                      }
                      className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                    />
                  </label>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
                <div className="rounded-xl border border-border p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="maxStress" fill="#3b82f6" name="Max Stress (MPa)" />
                      <Bar yAxisId="left" dataKey="maxDeformationNanometers" fill="#8b5cf6" name="Deformation (nm)" />
                      <Line yAxisId="right" type="monotone" dataKey="safetyFactor" stroke="#10b981" name="Safety Factor" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <h4 className="text-sm font-semibold text-muted-foreground">Weighted Ranking</h4>
                  <div className="mt-3 space-y-2">
                    {scoreData
                      .slice()
                      .sort((a, b) => b.score - a.score)
                      .map((sim, idx) => (
                        <div key={sim.id} className="flex items-center justify-between text-sm">
                          <span className="truncate">{idx + 1}. {sim.name}</span>
                          <span className="font-semibold">{sim.score.toFixed(2)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="overlay">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-semibold mb-4">Stress Over Time (Overlay)</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={overlayTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {selected.map((sim, idx) => (
                      <Line
                        key={sim.id}
                        type="monotone"
                        dataKey={`sim-${sim.id}`}
                        stroke={`hsl(${(idx * 360) / Math.max(selected.length, 1)} 75% 55%)`}
                        name={sim.name}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-semibold mb-4">Stress-Strain (Overlay)</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={overlayStrainData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="strain" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {selected.map((sim, idx) => (
                      <Line
                        key={sim.id}
                        type="monotone"
                        dataKey={`sim-${sim.id}`}
                        stroke={`hsl(${(idx * 360) / Math.max(selected.length, 1)} 75% 55%)`}
                        name={sim.name}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="heatmap">
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-semibold">Comparison Heatmap</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Quick visual scan of how stress, deformation, and safety factor compare across runs.
              </p>
              <Plot
                data={[
                  {
                    ...prepare3DData(),
                    colorscale: "Viridis",
                    type: "heatmap",
                  } as any
                ]}
                layout={{
                  autosize: true,
                  height: 400,
                  title: "Simulation Results Heatmap",
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  font: { color: "var(--foreground)" },
                  margin: { l: 50, r: 50, t: 50, b: 50 },
                }}
                style={{ width: "100%" }}
                // config={{ displayModeBar: false }}
              />
            </div>
          </TabsContent>

          <TabsContent value="metrics">
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-semibold">3D Metrics Space</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Each point is a simulation plotted by max stress, deformation, and safety factor.
              </p>
              <Plot
                data={[
                  {
                    x: selected.map(s => (s.results as any)?.maxStress || 0),
                    y: selected.map(s => (s.results as any)?.maxDeformation || 0),
                    z: selected.map(s => (s.results as any)?.safetyFactor || 0),
                    mode: "markers+text",
                    type: "scatter3d",
                    text: selected.map(s => s.name),
                    textposition: "top center",
                    marker: {
                      size: 10,
                      color: Array.from({length: selected.length}, (_, i) => i),
                      colorscale: "Viridis",
                      showscale: true,
                    },
                  } as any
                ]}
                layout={{
                  scene: {
                    xaxis: { title: "Max Stress (MPa)" },
                    yaxis: { title: "Deformation (mm)" },
                    zaxis: { title: "Safety Factor" },
                  },
                  autosize: true,
                  height: 500,
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  font: { color: "var(--foreground)" },
                }}
                style={{ width: "100%" }}
                // config={{ displayModeBar: false }}
              />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
