import { useState } from "react";
import { useSimulations } from "@/hooks/use-simulations";
import { useMaterials } from "@/hooks/use-materials";
import { StatusBadge } from "@/components/StatusBadge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart } from "recharts";
import Plot from "react-plotly.js";

export default function SimulationComparison() {
  const { data: simulations } = useSimulations();
  const { data: materials } = useMaterials();
  const [selectedSims, setSelectedSims] = useState<number[]>([]);

  const getMaterialName = (id: number) => materials?.find(m => m.id === id)?.name || "Unknown";

  const toggleSimulation = (id: number) => {
    setSelectedSims(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const completedSims = simulations?.filter(s => s.status === "completed" && s.results) || [];
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
    safetyFactor: (sim.results as any)?.safetyFactor || 0,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Compare Simulations</h1>
        <p className="text-muted-foreground mt-1">Select 2+ completed simulations to compare results.</p>
      </div>

      {/* Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-semibold mb-4">Available Simulations</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {completedSims.length === 0 ? (
              <p className="text-muted-foreground text-sm">No completed simulations yet.</p>
            ) : (
              completedSims.map(sim => (
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
                    <th className="text-left p-2 font-medium">Simulation</th>
                    <th className="text-right p-2 font-medium">Max Stress</th>
                    <th className="text-right p-2 font-medium">Deformation</th>
                    <th className="text-right p-2 font-medium">Safety</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map((sim) => {
                    const r = sim.results as any;
                    return (
                      <tr key={sim.id} className="border-b border-border/50">
                        <td className="p-2 truncate max-w-xs">{sim.name}</td>
                        <td className="text-right p-2 font-mono">{r?.maxStress?.toFixed(1) || 0}</td>
                        <td className="text-right p-2 font-mono">{r?.maxDeformation?.toFixed(2) || 0}</td>
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
        <div className="space-y-6">
          {/* Bar Chart Comparison */}
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
                <Bar yAxisId="left" dataKey="maxDeformation" fill="#8b5cf6" name="Deformation (mm)" />
                <Line yAxisId="right" type="monotone" dataKey="safetyFactor" stroke="#10b981" name="Safety Factor" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 3D Heatmap */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-semibold mb-4">3D Comparison Heatmap</h3>
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

          {/* 3D Scatter Plot */}
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
        </div>
      )}
    </div>
  );
}