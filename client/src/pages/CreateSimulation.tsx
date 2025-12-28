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
import { AlertCircle, Loader2, Play, MinusCircle, PlusCircle } from "lucide-react";
import Plot from "react-plotly.js";

type SimulationFormProps = {
  initialMaterialId?: string;
  initialGeometryId?: string;
  onSuccess?: (id: number) => void;
};

export function SimulationForm({
  initialMaterialId = "",
  initialGeometryId = "",
  onSuccess,
}: SimulationFormProps) {
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
  const [materialModel, setMaterialModel] = useState("linear");
  const [yieldStrength, setYieldStrength] = useState("");
  const [hardeningModulus, setHardeningModulus] = useState("");
  const [boundaryConditions, setBoundaryConditions] = useState<
    {
      id: string;
      type: "fixed" | "pressure";
      face: "x+" | "x-" | "y+" | "y-" | "z+" | "z-";
      magnitude: string;
      unit: string;
    }[]
  >([
    { id: "fixed-1", type: "fixed", face: "z-", magnitude: "", unit: "" },
    { id: "pressure-1", type: "pressure", face: "z+", magnitude: "1000", unit: "N" },
  ]);

  const selectItemClass =
    "focus:bg-primary focus:text-primary-foreground data-[highlighted]:bg-primary data-[highlighted]:text-primary-foreground";

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

  const clampDampingRatio = (value: string) => {
    if (value.trim() === "") return 0;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(Math.max(parsed, 0), 1);
  };

  const handleStartSimulation = () => {
    const selectedMaterialId = parseInt(materialId || "0");
    if (!selectedMaterialId) return;
    const loadMagnitude = parseFloat(appliedLoad);
    const normalizedDampingRatio = clampDampingRatio(dampingRatio);
    const resolvedYieldStrength =
      materialModel === "plastic"
        ? (() => {
            const parsed = parseFloat(yieldStrength);
            if (yieldStrength.trim() === "" || !Number.isFinite(parsed)) return 250;
            return parsed;
          })()
        : null;
    const resolvedHardeningModulus =
      materialModel === "plastic"
        ? (() => {
            const parsed = parseFloat(hardeningModulus);
            if (hardeningModulus.trim() === "" || !Number.isFinite(parsed)) return 100;
            return parsed;
          })()
        : null;
    const preparedBoundaryConditions = boundaryConditions.map((condition) => {
      if (condition.type === "pressure") {
        const magnitude =
          condition.magnitude.trim() === ""
            ? loadMagnitude
            : parseFloat(condition.magnitude);
        return {
          type: condition.type,
          face: condition.face,
          magnitude: Number.isFinite(magnitude) ? magnitude : null,
          unit: condition.unit || "N",
        };
      }
      return { type: condition.type, face: condition.face };
    });
    createSimulation(
      {
        name: simName,
        type: simType,
        materialId: selectedMaterialId,
        appliedLoad: parseFloat(appliedLoad),
        temperature: parseFloat(temperature),
        duration: parseFloat(duration),
        frequency: parseFloat(frequency),
        dampingRatio: normalizedDampingRatio,
        geometryId: geometryId ? parseInt(geometryId, 10) : undefined,
        materialModel,
        yieldStrength: resolvedYieldStrength,
        hardeningModulus: resolvedHardeningModulus,
        boundaryConditions: preparedBoundaryConditions,
      },
      {
        onSuccess: (data) => {
          onSuccess?.(data.id);
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

  const formatFileLabel = (name?: string | null) => {
    if (!name) return "No file chosen";
    if (name.length <= 15) return name;
    const parts = name.split(".");
    const ext = parts.length > 1 ? `.${parts.pop()}` : "";
    const base = parts.join(".") || name;
    const prefix = base.slice(0, 15);
    return `${prefix}...${ext || ""}`;
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
    if (!initialMaterialId) return;
    if (materialId !== initialMaterialId) {
      setMaterialId(initialMaterialId);
    }
  }, [materialId, initialMaterialId]);

  useEffect(() => {
    if (!initialGeometryId) return;
    if (geometryId !== initialGeometryId) {
      setGeometryId(initialGeometryId);
    }
  }, [geometryId, initialGeometryId]);

  useEffect(() => {
    if (!materials || materialId || initialMaterialId) return;
    const aluminum = materials.find((material) =>
      material.name.toLowerCase().includes("aluminum")
    );
    if (aluminum) {
      setMaterialId(String(aluminum.id));
    }
  }, [materials, materialId, initialMaterialId]);

  useEffect(() => {
    if (!geometries || geometryId || initialGeometryId) return;
    const unitCube = geometries.find((geometry) =>
      geometry.name.toLowerCase().includes("unit cube")
    );
    if (unitCube) {
      setGeometryId(String(unitCube.id));
    }
  }, [geometries, geometryId]);

  const geometryMesh = useMemo(() => {
    if (!geometryContent || !geometryFormat) return null;
    if (geometryFormat.toLowerCase() !== "stl") return null;
    const normalized = geometryContent.includes(",")
      ? geometryContent.split(",")[1]
      : geometryContent;
    const decoded = (() => {
      try {
        return atob(normalized);
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

  useEffect(() => {
    setBoundaryConditions((prev) =>
      prev.map((condition) => {
        if (condition.type !== "pressure") return condition;
        if (condition.magnitude.trim() !== "" && condition.magnitude !== appliedLoad) {
          return condition;
        }
        return { ...condition, magnitude: appliedLoad };
      })
    );
  }, [appliedLoad]);

  const updateBoundaryCondition = (
    id: string,
    patch: Partial<typeof boundaryConditions[number]>,
  ) => {
    setBoundaryConditions((prev) =>
      prev.map((condition) =>
        condition.id === id ? { ...condition, ...patch } : condition
      )
    );
  };

  const addBoundaryCondition = () => {
    const id = `bc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setBoundaryConditions((prev) => [
      ...prev,
      { id, type: "pressure", face: "z+", magnitude: appliedLoad, unit: "N" },
    ]);
  };

  const removeBoundaryCondition = (id: string) => {
    setBoundaryConditions((prev) => prev.filter((condition) => condition.id !== id));
  };

  const bcWarnings = useMemo(() => {
    const warnings: string[] = [];
    const fixed = boundaryConditions.filter((condition) => condition.type === "fixed");
    const loads = boundaryConditions.filter((condition) => condition.type === "pressure");
    if (fixed.length === 0) {
      warnings.push("Add at least one fixed support to prevent rigid-body motion.");
    }
    if (loads.length === 0) {
      warnings.push("Add at least one applied load so the solver has forcing.");
    }
    const loadFaces = new Set(loads.map((condition) => condition.face));
    const loadFaceCounts = loads.reduce<Record<string, number>>((acc, condition) => {
      acc[condition.face] = (acc[condition.face] || 0) + 1;
      return acc;
    }, {});
    Object.entries(loadFaceCounts).forEach(([face, count]) => {
      if (count > 1) {
        warnings.push(`Only one applied load is allowed per face (${face}).`);
      }
    });
    fixed.forEach((condition) => {
      if (loadFaces.has(condition.face)) {
        warnings.push(`Fixed and load are both applied on ${condition.face}.`);
      }
    });
    loads.forEach((condition) => {
      const magnitude = condition.magnitude.trim();
      if (magnitude === "") {
        warnings.push(`Load on ${condition.face} has no magnitude.`);
      } else if (!Number.isFinite(Number(magnitude))) {
        warnings.push(`Load on ${condition.face} has an invalid magnitude.`);
      }
    });
    return warnings;
  }, [boundaryConditions]);

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
          <div className="space-y-3 pb-4 border-border">
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
                    <SelectItem
                      key={geometry.id}
                      value={String(geometry.id)}
                      className={selectItemClass}
                    >
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
                      // config={{ displayModeBar: false }}
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
                  <div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm">
                    <input
                      id="geometry-file"
                      type="file"
                      accept=".stp,.step,.stl"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setGeometryFile(file);
                        if (file && geometryName.trim() === "") {
                          const base = file.name.replace(/\.[^/.]+$/, "");
                          setGeometryName(base);
                        }
                      }}
                    />
                    <Label
                      htmlFor="geometry-file"
                      className="cursor-pointer rounded-md border border-input px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted/60 shadow-sm hover:bg-muted hover:text-foreground"
                    >
                      Choose File
                    </Label>
                    <span
                      className="text-xs text-muted-foreground"
                      title={geometryFile?.name || "No file chosen"}
                    >
                      {formatFileLabel(geometryFile?.name)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="disabled:pointer-events-auto disabled:cursor-not-allowed disabled:hover:text-foreground disabled:hover:bg-transparent disabled:opacity-60 hover:text-primary hover:bg-primary/10"
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
                    <SelectItem
                      key={material.id}
                      value={String(material.id)}
                      className={selectItemClass}
                    >
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
                  <SelectItem value="Tensile Test" className={selectItemClass}>
                    Tensile Test
                  </SelectItem>
                  <SelectItem value="Thermal Stress" className={selectItemClass}>
                    Thermal Stress
                  </SelectItem>
                  <SelectItem value="Fatigue" className={selectItemClass}>
                    Fatigue Analysis
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 pb-4 border-border">
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

          <div className="space-y-3 pb-4 border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">
                Boundary Conditions
              </h4>
              <Button
                type="button"
                variant="ghost"
                className="h-8 w-8 rounded-full text-primary hover:text-primary hover:bg-primary/10"
                onClick={addBoundaryCondition}
                aria-label="Add boundary condition"
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              {boundaryConditions.map((condition, index) => (
                <div key={condition.id} className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Condition {index + 1}
                    </p>
                    {boundaryConditions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-7 w-7 rounded-full text-red-500 hover:text-red-500 hover:bg-red-500/10"
                        onClick={() => removeBoundaryCondition(condition.id)}
                        aria-label="Remove boundary condition"
                      >
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Type</Label>
                      <Select
                        value={condition.type}
                        onValueChange={(value) =>
                          updateBoundaryCondition(condition.id, {
                            type: value as "fixed" | "pressure",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed" className={selectItemClass}>
                            Fixed Support
                          </SelectItem>
                          <SelectItem value="pressure" className={selectItemClass}>
                            Applied Load
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Face</Label>
                      <Select
                        value={condition.face}
                        onValueChange={(value) =>
                          updateBoundaryCondition(condition.id, {
                            face: value as typeof condition.face,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="z-" className={selectItemClass}>
                            Bottom (z-)
                          </SelectItem>
                          <SelectItem value="z+" className={selectItemClass}>
                            Top (z+)
                          </SelectItem>
                          <SelectItem value="x-" className={selectItemClass}>
                            Left (x-)
                          </SelectItem>
                          <SelectItem value="x+" className={selectItemClass}>
                            Right (x+)
                          </SelectItem>
                          <SelectItem value="y-" className={selectItemClass}>
                            Back (y-)
                          </SelectItem>
                          <SelectItem value="y+" className={selectItemClass}>
                            Front (y+)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Magnitude (N)</Label>
                      <Input
                        type="number"
                        placeholder="1000"
                        value={condition.magnitude}
                        disabled={condition.type === "fixed"}
                        onChange={(event) =>
                          updateBoundaryCondition(condition.id, {
                            magnitude: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {bcWarnings.length > 0 && (
              // <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              //   <div className="flex items-center gap-2 font-semibold">
              //     <AlertCircle className="h-4 w-4" />
              //     Boundary condition checks
              //   </div>
              //   <ul className="mt-2 space-y-1">
              //     {bcWarnings.map((warning) => (
              //       <li key={warning}>{warning}</li>
              //     ))}
              //   </ul>
              // </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                {bcWarnings.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pb-4 border-border">
            <h4 className="text-sm font-semibold text-foreground">
              Material Model
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Model Type</Label>
                <Select value={materialModel} onValueChange={setMaterialModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear" className={selectItemClass}>
                    Linear Elastic
                  </SelectItem>
                  <SelectItem value="plastic" className={selectItemClass}>
                    Elastic-Plastic
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
              <div className="space-y-2">
                <Label className="text-sm">Yield Strength (MPa)</Label>
                <Input
                  type="number"
                  placeholder="250"
                  value={yieldStrength}
                  disabled={materialModel !== "plastic"}
                  onChange={(event) => setYieldStrength(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Hardening Modulus (MPa)</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={hardeningModulus}
                  disabled={materialModel !== "plastic"}
                  onChange={(event) => setHardeningModulus(event.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">
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
                  min="0"
                  max="1"
                  placeholder="0.05"
                  value={dampingRatio}
                  onChange={(e) => setDampingRatio(e.target.value)}
                  onBlur={() =>
                    setDampingRatio((prev) => {
                      if (prev.trim() === "") return "";
                      const parsed = Number(prev);
                      if (!Number.isFinite(parsed)) return prev;
                      return String(Math.min(Math.max(parsed, 0), 1));
                    })
                  }
                />
              </div>
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <Button
              size="lg"
              className="w-full md:w-auto font-semibold opacity-90 hover:opacity-100 disabled:pointer-events-auto disabled:hover:opacity-50 disabled:cursor-not-allowed"
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
                  <Play className="h-4 w-4 fill-current" />
                  Run
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateSimulation() {
  const [location, setLocation] = useLocation();
  const initialMaterialId = useMemo(() => {
    const queryIndex = location.indexOf("?");
    if (queryIndex === -1) return "";
    const params = new URLSearchParams(location.slice(queryIndex));
    return params.get("materialId") ?? "";
  }, [location]);

  return (
    <SimulationForm
      initialMaterialId={initialMaterialId}
      onSuccess={(id) => setLocation(`/simulations/${id}`)}
    />
  );
}
