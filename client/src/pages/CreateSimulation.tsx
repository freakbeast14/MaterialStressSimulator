import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMaterials } from "@/hooks/use-materials";
import { useCreateGeometry, useGeometries } from "@/hooks/use-geometries";
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
import Plot from "react-plotly.js";

export default function CreateSimulation() {
  const [, setLocation] = useLocation();
  const { data: materials, isLoading: isMaterialsLoading } = useMaterials();
  const { mutate: createSimulation, isPending: isCreating } =
    useCreateSimulation();
  const { data: geometries, isLoading: isGeometriesLoading } = useGeometries();
  const { mutate: createGeometry, isPending: isUploadingGeometry } =
    useCreateGeometry();

  const [materialId, setMaterialId] = useState<string>("");
  const [simName, setSimName] = useState("");
  const [simType, setSimType] = useState("Tensile Test");
  const [geometryId, setGeometryId] = useState<string>("");
  const [geometryName, setGeometryName] = useState("");
  const [geometryFile, setGeometryFile] = useState<File | null>(null);
  const [geometryContent, setGeometryContent] = useState<string | null>(null);
  const [geometryFormat, setGeometryFormat] = useState<string | null>(null);
  const [isLoadingGeometry, setIsLoadingGeometry] = useState(false);
  const [geometryError, setGeometryError] = useState<string | null>(null);
  const [appliedLoad, setAppliedLoad] = useState("1000");
  const [temperature, setTemperature] = useState("25");
  const [duration, setDuration] = useState("10");
  const [frequency, setFrequency] = useState("1");
  const [dampingRatio, setDampingRatio] = useState("0.05");

  const sortedGeometries = useMemo(() => {
    if (!geometries) return [];
    return [...geometries].sort((a, b) => {
      const aIsUnit = a.name.toLowerCase().includes("unit cube");
      const bIsUnit = b.name.toLowerCase().includes("unit cube");
      if (aIsUnit && !bIsUnit) return -1;
      if (!aIsUnit && bIsUnit) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [geometries]);

  const selectedGeometry = useMemo(
    () => sortedGeometries.find((geometry) => String(geometry.id) === geometryId),
    [sortedGeometries, geometryId],
  );

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
        geometryId: geometryId ? parseInt(geometryId, 10) : undefined,
      },
      {
        onSuccess: (data) => {
          setLocation(`/simulations/${data.id}`);
        },
      }
    );
  };

  const handleUploadGeometry = async () => {
    if (!geometryFile || !geometryName) return;
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(geometryFile);
    });
    const format = geometryFile.name.split(".").pop() || "stl";
    createGeometry(
      {
        name: geometryName,
        originalName: geometryFile.name,
        format,
        contentBase64: base64,
      },
      {
        onSuccess: (data) => {
          setGeometryId(String(data.id));
          setGeometryName("");
          setGeometryFile(null);
        },
      }
    );
  };

  useEffect(() => {
    if (!geometryId) {
      setGeometryContent(null);
      setGeometryFormat(null);
      setGeometryError(null);
      return;
    }
    setIsLoadingGeometry(true);
    setGeometryError(null);
    fetch(`/api/geometries/${geometryId}/content`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load geometry");
        return res.json();
      })
      .then((data) => {
        setGeometryContent(data.contentBase64 || null);
        setGeometryFormat(data.format || null);
      })
      .catch((err) => {
        setGeometryError(err instanceof Error ? err.message : "Failed to load geometry");
        setGeometryContent(null);
        setGeometryFormat(null);
      })
      .finally(() => setIsLoadingGeometry(false));
  }, [geometryId]);

  useEffect(() => {
    if (!materials || materialId) return;
    const aluminum = materials.find((material) =>
      material.name.toLowerCase().includes("aluminum")
    );
    if (aluminum) {
      setMaterialId(String(aluminum.id));
    }
  }, [materials, materialId]);

  useEffect(() => {
    if (!geometries || geometryId) return;
    const unitCube = geometries.find((geometry) =>
      geometry.name.toLowerCase().includes("unit cube")
    );
    if (unitCube) {
      setGeometryId(String(unitCube.id));
    }
  }, [geometries, geometryId]);

  const geometryMesh = useMemo(() => {
    const isCylinder = selectedGeometry?.name.toLowerCase().includes("cylinder");
    if (isCylinder) {
      const segments = 32;
      const radius = 1;
      const height = 1;
      const x: number[] = [];
      const y: number[] = [];
      const z: number[] = [];
      const i: number[] = [];
      const j: number[] = [];
      const k: number[] = [];
      const topCenterIndex = 0;
      const bottomCenterIndex = 1;
      x.push(0, 0);
      y.push(0, 0);
      z.push(height, 0);
      let idx = 2;
      for (let s = 0; s < segments; s += 1) {
        const angle = (2 * Math.PI * s) / segments;
        const cx = Math.cos(angle) * radius;
        const cy = Math.sin(angle) * radius;
        x.push(cx, cx);
        y.push(cy, cy);
        z.push(height, 0);
        const topIndex = idx;
        const bottomIndex = idx + 1;
        const nextTop = idx + 2 >= 2 + segments * 2 ? 2 : idx + 2;
        const nextBottom = nextTop + 1;
        i.push(topCenterIndex);
        j.push(topIndex);
        k.push(nextTop);
        i.push(bottomCenterIndex);
        j.push(nextBottom);
        k.push(bottomIndex);
        i.push(topIndex);
        j.push(bottomIndex);
        k.push(nextBottom);
        i.push(topIndex);
        j.push(nextBottom);
        k.push(nextTop);
        idx += 2;
      }
      return { x, y, z, i, j, k };
    }
    if (!geometryContent || !geometryFormat) return null;
    if (geometryFormat.toLowerCase() !== "stl") return null;
    const decoded = (() => {
      try {
        return atob(geometryContent);
      } catch {
        return "";
      }
    })();
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
  }, [geometryContent, geometryFormat]);

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
              <Label className="text-sm">Geometry</Label>
              <Select
                value={geometryId}
                onValueChange={setGeometryId}
                disabled={isGeometriesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select geometry" />
                </SelectTrigger>
                <SelectContent>
                  {sortedGeometries.map((geometry) => (
                    <SelectItem key={geometry.id} value={String(geometry.id)}>
                      {geometry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded-xl border border-border bg-background p-4">
                {isLoadingGeometry ? (
                  <p className="text-sm text-muted-foreground">Loading preview...</p>
                ) : geometryError ? (
                  <p className="text-sm text-destructive">{geometryError}</p>
                ) : geometryMesh ? (
                  <div className="h-[240px]">
                    <Plot
                      data={[
                        {
                          type: "mesh3d",
                          x: geometryMesh.x,
                          y: geometryMesh.y,
                          z: geometryMesh.z,
                          i: geometryMesh.i,
                          j: geometryMesh.j,
                          k: geometryMesh.k,
                          color: "#60a5fa",
                          opacity: 0.8,
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
                  </div>
                ) : geometryId ? (
                  <p className="text-sm text-muted-foreground">
                    Preview available for ASCII STL only.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a geometry to preview.
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <Label className="text-xs text-muted-foreground">
                  Upload new geometry (STEP/STL)
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center">
                  <Input
                    placeholder="Geometry name"
                    value={geometryName}
                    onChange={(e) => setGeometryName(e.target.value)}
                  />
                  <Input
                    type="file"
                    accept=".stp,.step,.stl"
                    onChange={(e) => setGeometryFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUploadGeometry}
                    disabled={!geometryName || !geometryFile || isUploadingGeometry}
                  >
                    {isUploadingGeometry ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>
            </div>
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
