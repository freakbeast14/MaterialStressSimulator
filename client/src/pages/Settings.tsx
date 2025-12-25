import { useEffect, useMemo, useState } from "react";
import { useCreateMaterial } from "@/hooks/use-materials";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "next-themes";

const STORAGE_KEYS = {
  units: "matsim.units",
  refresh: "matsim.refreshInterval",
  defaultType: "matsim.defaultSimType",
  notifications: "matsim.notifications",
};

export default function Settings() {
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();
  const { mutateAsync: createMaterial, isPending } = useCreateMaterial();

  const [units, setUnits] = useState("metric");
  const [refreshInterval, setRefreshInterval] = useState("10");
  const [defaultSimType, setDefaultSimType] = useState("Tensile Test");
  const [notifications, setNotifications] = useState(true);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Metal");
  const [description, setDescription] = useState("");
  const [density, setDensity] = useState("");
  const [youngsModulus, setYoungsModulus] = useState("");
  const [poissonRatio, setPoissonRatio] = useState("");
  const [thermalConductivity, setThermalConductivity] = useState("");
  const [meltingPoint, setMeltingPoint] = useState("");
  const [stressStrainCurve, setStressStrainCurve] = useState(
    '[{"strain":0,"stress":0},{"strain":0.01,"stress":100}]'
  );
  const [thermalExpansionCurve, setThermalExpansionCurve] = useState(
    '[{"temperature":20,"coefficient":12},{"temperature":100,"coefficient":13}]'
  );

  useEffect(() => {
    const savedUnits = localStorage.getItem(STORAGE_KEYS.units);
    const savedRefresh = localStorage.getItem(STORAGE_KEYS.refresh);
    const savedType = localStorage.getItem(STORAGE_KEYS.defaultType);
    const savedNotifications = localStorage.getItem(STORAGE_KEYS.notifications);
    if (savedUnits) setUnits(savedUnits);
    if (savedRefresh) setRefreshInterval(savedRefresh);
    if (savedType) setDefaultSimType(savedType);
    if (savedNotifications) setNotifications(savedNotifications === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.units, units);
    localStorage.setItem(STORAGE_KEYS.refresh, refreshInterval);
    localStorage.setItem(STORAGE_KEYS.defaultType, defaultSimType);
    localStorage.setItem(STORAGE_KEYS.notifications, String(notifications));
  }, [units, refreshInterval, defaultSimType, notifications]);

  const parsedCurves = useMemo(() => {
    const parseJson = (value: string) => JSON.parse(value);
    try {
      return {
        stress: parseJson(stressStrainCurve),
        thermal: parseJson(thermalExpansionCurve),
      };
    } catch {
      return null;
    }
  }, [stressStrainCurve, thermalExpansionCurve]);

  const handleCreateMaterial = async () => {
    if (!parsedCurves) {
      toast({
        title: "Invalid curve JSON",
        description: "Please fix the stress-strain or thermal expansion JSON.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createMaterial({
        name,
        category,
        description,
        density: Number(density),
        youngsModulus: Number(youngsModulus),
        poissonRatio: Number(poissonRatio),
        thermalConductivity: Number(thermalConductivity),
        meltingPoint: Number(meltingPoint),
        stressStrainCurve: parsedCurves.stress,
        thermalExpansionCurve: parsedCurves.thermal,
      });
      toast({ title: "Material created", description: "New material added to the library." });
      setName("");
      setDescription("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create material.";
      toast({ title: "Creation failed", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Customize your workspace and manage materials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <h3 className="text-lg font-semibold">Preferences</h3>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Toggle light/dark appearance.</p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Units Preference</Label>
              <Select value={units} onValueChange={setUnits}>
                <SelectTrigger>
                  <SelectValue placeholder="Select units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metric">Metric (MPa, mm, kg/m³)</SelectItem>
                  <SelectItem value="imperial">Imperial (psi, in, lb/ft³)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Default Simulation Type</Label>
              <Select value={defaultSimType} onValueChange={setDefaultSimType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tensile Test">Tensile Test</SelectItem>
                  <SelectItem value="Thermal Stress">Thermal Stress</SelectItem>
                  <SelectItem value="Fatigue">Fatigue Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Auto-refresh Interval (s)</Label>
              <Select value={refreshInterval} onValueChange={setRefreshInterval}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 seconds</SelectItem>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">60 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Notifications</Label>
                <p className="text-xs text-muted-foreground">Notify on completion/failure.</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Add New Material</h3>
              <p className="text-sm text-muted-foreground">Provide full material properties and curves.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Material Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Metal">Metal</SelectItem>
                    <SelectItem value="Polymer">Polymer</SelectItem>
                    <SelectItem value="Composite">Composite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Density (kg/m³)</Label>
                <Input value={density} onChange={(e) => setDensity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Young's Modulus (GPa)</Label>
                <Input value={youngsModulus} onChange={(e) => setYoungsModulus(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Poisson's Ratio</Label>
                <Input value={poissonRatio} onChange={(e) => setPoissonRatio(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Thermal Conductivity (W/m·K)</Label>
                <Input value={thermalConductivity} onChange={(e) => setThermalConductivity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Melting Point (°C)</Label>
                <Input value={meltingPoint} onChange={(e) => setMeltingPoint(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Stress-Strain Curve (JSON)</Label>
              <Textarea
                value={stressStrainCurve}
                onChange={(e) => setStressStrainCurve(e.target.value)}
                className={parsedCurves ? "" : "border-destructive"}
              />
            </div>

            <div className="space-y-2">
              <Label>Thermal Expansion Curve (JSON)</Label>
              <Textarea
                value={thermalExpansionCurve}
                onChange={(e) => setThermalExpansionCurve(e.target.value)}
                className={parsedCurves ? "" : "border-destructive"}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleCreateMaterial} disabled={isPending || !name}>
              {isPending ? "Saving..." : "Add Material"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
