import { useLayoutEffect, useRef, useState } from "react";
import { useSimulations } from "@/hooks/use-simulations";
import { useMaterials } from "@/hooks/use-materials";
import { StatusBadge } from "@/components/StatusBadge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart } from "recharts";
import Plot from "react-plotly.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function SimulationComparison() {
  const { data: simulations } = useSimulations();
  const { data: materials } = useMaterials();
  const [selectedSims, setSelectedSims] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState("comparison");
//   const scrollRef = useRef<number | null>(null);
  const initialRender = useRef(true);
  const [search, setSearch] = useState("");

  const getMaterialName = (id: number) => materials?.find(m => m.id === id)?.name || "Unknown";

  const toggleSimulation = (id: number) => {
    setSelectedSims(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const completedSims = simulations?.filter(s => s.status === "completed" && s.results) || [];
  const filteredSims = completedSims.filter((sim) => {
    const materialName = getMaterialName(sim.materialId);
    const query = search.toLowerCase();
    return (
      sim.name.toLowerCase().includes(query) ||
      sim.type.toLowerCase().includes(query) ||
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
        results?.maxStress || 0,
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
    maxStress: (sim.results as any)?.maxStress || 0,
    maxDeformation: (sim.results as any)?.maxDeformation || 0,
    maxDeformationMicrons: ((sim.results as any)?.maxDeformation || 0) * 1000,
    safetyFactor: (sim.results as any)?.safetyFactor || 0,
  }));

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold">Available Simulations</h3>
            <div className="relative w-full max-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8 h-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredSims.length === 0 ? (
              <p className="text-muted-foreground text-sm">No completed simulations yet.</p>
            ) : (
              filteredSims.map(sim => (
                <label key={sim.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSims.includes(sim.id)}
                    onChange={() => toggleSimulation(sim.id)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{sim.name}</p>
                    <p className="text-xs text-muted-foreground">{getMaterialName(sim.materialId)} • {sim.type}</p>
                  </div>
                </label>
              ))
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
                    <th className="text-right p-2 font-medium">Deformation (μm)</th>
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
                        <td className="text-right p-2 font-mono">{r?.maxStress?.toFixed(2) || 0}</td>
                        <td className="text-right p-2 font-mono">{((r?.maxDeformation || 0) * 1000).toFixed(2)}</td>
                        <td className="text-right p-2 font-mono">{r?.safetyFactor?.toFixed(2) || 0}</td>
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
          <TabsList className="w-full justify-start">
            <TabsTrigger value="comparison">Results Comparison</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="metrics">3D Metrics Space</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison">
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-semibold mb-4">Results Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="maxStress" fill="#3b82f6" name="Max Stress (MPa)" />
                  <Bar yAxisId="left" dataKey="maxDeformationMicrons" fill="#8b5cf6" name="Deformation (μm)" />
                  <Line yAxisId="right" type="monotone" dataKey="safetyFactor" stroke="#10b981" name="Safety Factor" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="heatmap">
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-semibold mb-4">Comparison Heatmap</h3>
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
              />
            </div>
          </TabsContent>

          <TabsContent value="metrics">
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-semibold mb-4">3D Metrics Space</h3>
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
              />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
