import { useParams, useLocation } from "wouter";
import { useMaterial } from "@/hooks/use-materials";
import { useCreateSimulation } from "@/hooks/use-simulations";
import { PropertyCard } from "@/components/PropertyCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChevronLeft, FlaskConical, Play } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function MaterialDetail() {
  const { id } = useParams();
  const materialId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { data: material, isLoading } = useMaterial(materialId);
  const { mutate: createSimulation, isPending: isCreating } = useCreateSimulation();
  
  const [simName, setSimName] = useState("");
  const [simType, setSimType] = useState("Tensile Test");
  const [appliedLoad, setAppliedLoad] = useState("1000");
  const [temperature, setTemperature] = useState("25");
  const [duration, setDuration] = useState("10");
  const [frequency, setFrequency] = useState("1");
  const [dampingRatio, setDampingRatio] = useState("0.05");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (isLoading) return <div className="p-8">Loading material data...</div>;
  if (!material) return <div className="p-8">Material not found</div>;

  const handleStartSimulation = () => {
    createSimulation(
      { 
        name: simName, 
        type: simType, 
        materialId,
        appliedLoad: parseFloat(appliedLoad),
        temperature: parseFloat(temperature),
        duration: parseFloat(duration),
        frequency: parseFloat(frequency),
        dampingRatio: parseFloat(dampingRatio),
      },
      {
        onSuccess: (data) => {
          setIsDialogOpen(false);
          setLocation(`/simulations/${data.id}`);
        },
      }
    );
  };

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
              <h1 className="text-3xl font-display font-bold text-foreground">{material.name}</h1>
              <span className="px-3 py-1 rounded-full bg-secondary text-xs font-semibold uppercase text-secondary-foreground">
                {material.category}
              </span>
            </div>
            <p className="text-muted-foreground max-w-2xl">{material.description}</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                <FlaskConical className="mr-2 h-4 w-4" /> Run Simulation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Configure Simulation Parameters</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-4">
                {/* Basic Info Section */}
                <div className="space-y-3 pb-4 border-b border-border">
                  <h4 className="text-sm font-semibold text-foreground">Basic Information</h4>
                  <div className="space-y-2">
                    <Label className="text-sm">Simulation Name</Label>
                    <Input 
                      placeholder="e.g. High Temp Stress Test" 
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Analysis Type</Label>
                    <Select value={simType} onValueChange={setSimType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tensile Test">Tensile Test</SelectItem>
                        <SelectItem value="Thermal Stress">Thermal Stress</SelectItem>
                        <SelectItem value="Fatigue">Fatigue Analysis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Load & Environmental Parameters */}
                <div className="space-y-3 pb-4 border-b border-border">
                  <h4 className="text-sm font-semibold text-foreground">Load & Environment</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Applied Load (N)</Label>
                      <Input 
                        type="number"
                        placeholder="1000"
                        value={appliedLoad}
                        onChange={(e) => setAppliedLoad(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Temperature (°C)</Label>
                      <Input 
                        type="number"
                        placeholder="25"
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Time & Dynamic Parameters */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Time & Dynamics</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Duration (s)</Label>
                      <Input 
                        type="number"
                        placeholder="10"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Frequency (Hz)</Label>
                      <Input 
                        type="number"
                        step="0.1"
                        placeholder="1"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Damping Ratio</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.05"
                        value={dampingRatio}
                        onChange={(e) => setDampingRatio(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full mt-6" 
                  onClick={handleStartSimulation}
                  disabled={isCreating || !simName}
                >
                  {isCreating ? "Initializing..." : "Start Simulation"}
                  {!isCreating && <Play className="ml-2 h-4 w-4" />}
                </Button>
              </div>
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