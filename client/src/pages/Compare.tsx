import { useEffect, useMemo, useRef, useState } from "react";
import { useMaterials } from "@/hooks/use-materials";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssistantContext } from "@/context/assistant-context";

type CompareProps = {
  embedded?: boolean;
};

export default function Compare({ embedded = false }: CompareProps) {
  const { data: materials, isLoading } = useMaterials();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { setContext } = useAssistantContext();

  const toggleMaterial = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
  const truncateText = (value: string, max: number) =>
    value.length > max ? `${value.slice(0, max)}…` : value;

  // Prepare data for multi-line chart
  // This is simplified; in a real app you'd need to normalize X-axis points
  // Here we assume strain points are consistent or we just overlay them visually
  const selectedMaterials = materials?.filter(m => selectedIds.includes(m.id)) || [];

  const assistantContext = useMemo(
    () => ({
      pageSummary:
        "Compare materials by overlaying their stress-strain and thermal expansion curves.",
      selectedCount: selectedMaterials.length,
      selected: selectedMaterials.slice(0, 8).map((mat) => ({
        id: mat.id,
        name: mat.name,
        category: mat.category,
        density: mat.density,
        youngsModulus: mat.youngsModulus,
        poissonRatio: mat.poissonRatio,
        meltingPoint: mat.meltingPoint,
      })),
      charts: ["Stress-Strain Comparison", "Thermal Expansion Comparison"],
      interactions: [
        "Select materials from the list to overlay curves.",
        "Export chart as SVG.",
      ],
    }),
    [selectedMaterials]
  );

  const assistantContextKey = useMemo(
    () =>
      JSON.stringify({
        selectedIds: selectedMaterials.map((mat) => mat.id),
        selectedCount: selectedMaterials.length,
      }),
    [selectedMaterials]
  );

  const assistantContextKeyRef = useRef("");

  useEffect(() => {
    if (assistantContextKeyRef.current === assistantContextKey) return;
    assistantContextKeyRef.current = assistantContextKey;
    setContext("compare-materials", assistantContext);
  }, [assistantContext, assistantContextKey, setContext]);

  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
  ];
  const truncateLegendLabel = (value: string, max = 30) =>
    value.length > max ? `${value.slice(0, max)}...` : value;

  const titleClassName = embedded
    ? "text-2xl font-display font-bold text-foreground"
    : "text-3xl font-display font-bold text-foreground";

  const exportChartSvg = (chartId: string, filename: string) => {
    const container = document.getElementById(chartId);
    const svg = container?.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        {embedded ? (
          <h2 className={titleClassName}>Compare Materials</h2>
        ) : (
          <h1 className={titleClassName}>Compare Materials</h1>
        )}
        <p className="text-muted-foreground mt-1">Select materials to overlay their stress-strain properties.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Selection Sidebar */}
        <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-6 h-fit">
          <h3 className="font-semibold mb-4">Select Materials</h3>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            </div>
          ) : (
            <div className="space-y-3">
              {materials?.map((mat) => (
                <div key={mat.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`mat-${mat.id}`} 
                    checked={selectedIds.includes(mat.id)}
                    onCheckedChange={() => toggleMaterial(mat.id)}
                  />
                  <label
                    htmlFor={`mat-${mat.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer truncate"
                    title={mat.name}
                  >
                    {truncateText(mat.name, 30)}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comparison Area */}
        <div className="lg:col-span-3 space-y-8">
          {selectedIds.length === 0 ? (
            <div className="h-[400px] bg-muted/10 border-2 border-dashed border-muted rounded-2xl flex items-center justify-center text-muted-foreground">
              Select at least one material to view comparison
            </div>
          ) : (
            <>
              {/* Chart */}
              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold font-display">Stress-Strain Comparison</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="hover:bg-primary/10 hover:text-primary"
                    onClick={() =>
                      exportChartSvg("materials-stress-strain", "materials-stress-strain.svg")
                    }
                  >
                    <Download className="h-4 w-4" />
                    Export Chart
                  </Button>
                </div>
                <div id="materials-stress-strain" className="mt-4 h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                      <XAxis 
                        dataKey="strain" 
                        type="number"
                        label={{ value: 'Strain (mm/mm)', position: 'insideBottom', offset: -5 }} 
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        domain={[0, 'auto']}
                        allowDataOverflow={false}
                      />
                      <YAxis 
                        label={{ value: 'Stress (MPa)', angle: -90, position: 'insideLeft' }} 
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      />
                      <Legend
                        formatter={(value) => (
                          <span title={String(value)}>
                            {truncateLegendLabel(String(value), 30)}
                          </span>
                        )}
                      />
                      {selectedMaterials.map((mat, idx) => (
                        <Line
                          key={mat.id}
                          data={mat.stressStrainCurve as any[]}
                          type="monotone"
                          dataKey="stress"
                          name={mat.name}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold font-display">Thermal Expansion Comparison</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="hover:bg-primary/10 hover:text-primary"
                    onClick={() =>
                      exportChartSvg("materials-thermal-expansion", "materials-thermal-expansion.svg")
                    }
                  >
                    <Download className="h-4 w-4" />
                    Export Chart
                  </Button>
                </div>
                <div id="materials-thermal-expansion" className="mt-4 h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                      <XAxis
                        dataKey="temperature"
                        type="number"
                        label={{ value: "Temperature (°C)", position: "insideBottom", offset: -5 }}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        domain={[0, "auto"]}
                        allowDataOverflow={false}
                      />
                      <YAxis
                        label={{ value: "Expansion Coefficient (µm/m·°C)", angle: -90, position: "insideLeft" }}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                      />
                      <Legend
                        formatter={(value) => (
                          <span title={String(value)}>
                            {truncateLegendLabel(String(value), 30)}
                          </span>
                        )}
                      />
                      {selectedMaterials.map((mat, idx) => (
                        <Line
                          key={mat.id}
                          data={mat.thermalExpansionCurve as any[]}
                          type="monotone"
                          dataKey="coefficient"
                          name={mat.name}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-card rounded-2xl border border-border overflow-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-6 py-4">Property</th>
                      {selectedMaterials.map(mat => (
                        <th key={mat.id} className="px-6 py-4">{mat.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="px-6 py-4 font-medium">Density (kg/m³)</td>
                      {selectedMaterials.map(mat => (
                        <td key={mat.id} className="px-6 py-4 font-mono">{mat.density}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-medium">Young's Modulus (GPa)</td>
                      {selectedMaterials.map(mat => (
                        <td key={mat.id} className="px-6 py-4 font-mono">{mat.youngsModulus}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-medium">Poisson's Ratio</td>
                      {selectedMaterials.map(mat => (
                        <td key={mat.id} className="px-6 py-4 font-mono">{mat.poissonRatio}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-medium">Melting Point (°C)</td>
                      {selectedMaterials.map(mat => (
                        <td key={mat.id} className="px-6 py-4 font-mono">{mat.meltingPoint}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
