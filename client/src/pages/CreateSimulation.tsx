import { useState } from "react";
import { useLocation } from "wouter";
import { useMaterials } from "@/hooks/use-materials";
import { useCreateSimulation } from "@/hooks/use-simulations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Play } from "lucide-react";

export default function CreateSimulation() {
  const [, setLocation] = useLocation();
  const { data: materials, isLoading: isMaterialsLoading } = useMaterials();
  const { mutate: createSimulation, isPending: isCreating } =
    useCreateSimulation();

  const [materialId, setMaterialId] = useState<string>("");
  const [simName, setSimName] = useState("");
  const [simType, setSimType] = useState("Tensile Test");
  const [appliedLoad, setAppliedLoad] = useState("1000");
  const [temperature, setTemperature] = useState("25");
  const [duration, setDuration] = useState("10");
  const [frequency, setFrequency] = useState("1");
  const [dampingRatio, setDampingRatio] = useState("0.05");

  const handleStartSimulation = () => {
    const selectedMaterialId = parseInt(materialId || "0");
    if (!selectedMaterialId) return;
    createSimulation(
      {
        name: simName,
        type: simType,
        materialId: selectedMaterialId,
        appliedLoad: parseFloat(appliedLoad),
        temperature: parseFloat(temperature),
        duration: parseFloat(duration),
        frequency: parseFloat(frequency),
        dampingRatio: parseFloat(dampingRatio),
      },
      {
        onSuccess: (data) => {
          setLocation(`/simulations/${data.id}`);
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Configure Simulation Parameters
        </h1>
        <p className="text-muted-foreground mt-1">
          Create a new simulation with the required material and test settings.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
        <div className="space-y-5">
          <div className="space-y-3 pb-4 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground">
              Basic Information
            </h4>
            <div className="space-y-2">
              <Label className="text-sm">Material</Label>
              <Select
                value={materialId}
                onValueChange={setMaterialId}
                disabled={isMaterialsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materials?.map((material) => (
                    <SelectItem key={material.id} value={String(material.id)}>
                      {material.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <div className="space-y-3 pb-4 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground">
              Load & Environment
            </h4>
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
                <Label className="text-sm">Temperature (C)</Label>
                <Input
                  type="number"
                  placeholder="25"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">
              Time & Dynamics
            </h4>
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
          <div className="pt-4 flex justify-end">
            <Button
              size="lg"
              className="w-full md:w-auto font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
              onClick={handleStartSimulation}
              disabled={isCreating || !simName || !materialId}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  Run Simulation
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
