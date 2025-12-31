import { useParams, useLocation } from "wouter";
import { useMaterial } from "@/hooks/use-materials";
import { PropertyCard } from "@/components/PropertyCard";
import { SimulationForm } from "@/pages/CreateSimulation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChevronLeft, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useAssistantContext } from "@/context/assistant-context";

export default function MaterialDetail() {
  const { id } = useParams();
  const materialId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { data: material, isLoading } = useMaterial(materialId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { setContext } = useAssistantContext();

  const assistantContext = useMemo(() => {
    if (!material) return null;
    return {
      pageSummary:
        "Review a material’s properties and curves, then launch a simulation prefilled with this material.",
      actions: ["Run simulation", "Review properties", "Inspect curves"],
      material: {
        id: material.id,
        name: material.name,
        category: material.category,
        density: material.density,
        youngsModulus: material.youngsModulus,
        poissonRatio: material.poissonRatio,
        thermalConductivity: material.thermalConductivity,
        meltingPoint: material.meltingPoint,
      },
      charts: ["Stress-Strain Curve", "Thermal Expansion"],
      curves: {
        stressStrainPoints: material.stressStrainCurve?.length ?? 0,
        thermalExpansionPoints: material.thermalExpansionCurve?.length ?? 0,
      },
    };
  }, [material]);

  const assistantContextKey = useMemo(() => {
    if (!material) return "";
    return JSON.stringify({
      id: material.id,
      name: material.name,
      category: material.category,
      stressStrainPoints: material.stressStrainCurve?.length ?? 0,
      thermalExpansionPoints: material.thermalExpansionCurve?.length ?? 0,
    });
  }, [material]);

  const assistantContextKeyRef = useRef("");

  useEffect(() => {
    if (!assistantContext) return;
    if (assistantContextKeyRef.current === assistantContextKey) return;
    assistantContextKeyRef.current = assistantContextKey;
    setContext("material-detail", assistantContext);
  }, [assistantContext, assistantContextKey, setContext]);

  if (isLoading) return <div className="p-8">Loading material data...</div>;
  if (!material) return <div className="p-8">Material not found</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <Link href="/materials" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Library
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1
                className="text-3xl font-display font-bold text-foreground"
                title={material.name}
              >
                {material.name.length > 30
                  ? `${material.name.slice(0, 30)}...`
                  : material.name}
              </h1>
              <span className="px-3 py-1 rounded-full bg-secondary text-xs font-semibold uppercase text-secondary-foreground">
                {material.category}
              </span>
            </div>
            <p className="text-muted-foreground max-w-2xl">{material.description}</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="w-full md:w-auto font-semibold opacity-90 hover:opacity-100"
              >
                <Play className="h-4 w-4 fill-current" />
                Run
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
              <SimulationForm
                initialMaterialId={String(materialId)}
                onSuccess={(id) => {
                  setIsDialogOpen(false);
                  setLocation(`/simulations/${id}`);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <PropertyCard label="Density" value={material.density} unit="kg/m³" />
        <PropertyCard label="Young's Modulus" value={material.youngsModulus} unit="GPa" />
        <PropertyCard label="Poisson's Ratio" value={material.poissonRatio} />
        <PropertyCard label="Thermal Cond." value={material.thermalConductivity} unit="W/(m·K)" />
        <PropertyCard label="Melting Point" value={material.meltingPoint} unit="°C" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="text-lg font-semibold font-display mb-6">Stress-Strain Curve</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={material.stressStrainCurve as any[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                <XAxis 
                  dataKey="strain" 
                  label={{ value: 'Strain (mm/mm)', position: 'insideBottom', offset: -5 }} 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  label={{ value: 'Stress (MPa)', angle: -90, position: 'insideLeft' }} 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="stress" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2} 
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="text-lg font-semibold font-display mb-6">Thermal Expansion</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={material.thermalExpansionCurve as any[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                <XAxis 
                  dataKey="temperature" 
                  label={{ value: 'Temperature (°C)', position: 'insideBottom', offset: -5 }} 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  label={{ value: 'Coefficient (µm/m·K)', angle: -90, position: 'insideLeft' }} 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="coefficient" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2} 
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
