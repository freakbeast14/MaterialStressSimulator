import { Link } from "wouter";
import { useCancelSimulation, useDeleteSimulation, useSimulations, useUpdateSimulation } from "@/hooks/use-simulations";
import { useMaterials } from "@/hooks/use-materials";
import { useCreateGeometry, useGeometries } from "@/hooks/use-geometries";
import { useBoundaryConditions } from "@/hooks/use-boundary-conditions";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Filter, Pause, Pencil, Play, Search, Trash2, MinusCircle, PlusCircle, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Plot from "react-plotly.js";
import { useAssistantContext } from "@/context/assistant-context";

export default function Simulations() {
  const queryClient = useQueryClient();
  const { data: simulations, isLoading } = useSimulations();
  const { mutateAsync: deleteSimulation, isPending: isDeleting } = useDeleteSimulation();
  const { mutateAsync: updateSimulation, isPending: isUpdating } = useUpdateSimulation();
  const { mutateAsync: cancelSimulation, isPending: isCancelling } = useCancelSimulation();
  const { data: materials } = useMaterials();
  const { data: geometries } = useGeometries();
  const { mutateAsync: createGeometry, isPending: isUploadingGeometry } = useCreateGeometry();
  const { toast } = useToast();
  const { setContext } = useAssistantContext();
  const [activeSimulationId, setActiveSimulationId] = useState<number | null>(null);
  const { data: boundaryConditions } = useBoundaryConditions(activeSimulationId ?? undefined);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [simName, setSimName] = useState("");
  const [simType, setSimType] = useState("Tensile Test");
  const [materialId, setMaterialId] = useState("");
  const [geometryId, setGeometryId] = useState("");
  const [appliedLoad, setAppliedLoad] = useState("1000");
  const [temperature, setTemperature] = useState("25");
  const [duration, setDuration] = useState("10");
  const [frequency, setFrequency] = useState("1");
  const [dampingRatio, setDampingRatio] = useState("0.05");
  const [materialModel, setMaterialModel] = useState("linear");
  const [yieldStrength, setYieldStrength] = useState("");
  const [hardeningModulus, setHardeningModulus] = useState("");
  const [geometryName, setGeometryName] = useState("");
  const [geometryFile, setGeometryFile] = useState<File | null>(null);
  const [geometryContent, setGeometryContent] = useState<string | null>(null);
  const [geometryFormat, setGeometryFormat] = useState<string | null>(null);
  const [isLoadingGeometry, setIsLoadingGeometry] = useState(false);
  const [geometryError, setGeometryError] = useState<string | null>(null);
  const [boundaryConditionsForm, setBoundaryConditionsForm] = useState<
    {
      id: string;
      type: "fixed" | "pressure";
      face: "x+" | "x-" | "y+" | "y-" | "z+" | "z-";
      magnitude: string;
      unit: string;
    }[]
  >([]);
  const [materialFilter, setMaterialFilter] = useState("all");
  const [geometryFilter, setGeometryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<
    "id" | "name" | "type" | "material" | "geometry" | "date" | "status"
  >("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const getMaterialName = (id: number) =>
    materials?.find(m => m.id === id)?.name || "Unknown Material";
  const getGeometryName = (id?: number | null) =>
    geometries?.find((geom) => geom.id === id)?.name || "Unknown Geometry";
  const truncateText = (value: string, max: number) =>
    value.length > max ? `${value.slice(0, max)}…` : value;
  const truncateName = (value: string | undefined, max = 30) => {
    if (!value) { return value };
    return value.length > max ? `${value.slice(0, max)}...` : value;
  }
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

  const simulationTypes = useMemo(() => {
    const types = simulations?.map((sim) => sim.type) || [];
    return Array.from(new Set(types)).sort();
  }, [simulations]);

  const simulationStatuses = useMemo(() => {
    const statuses =
      simulations?.map((sim) => (sim.paramsDirty ? "updated" : sim.status)) || [];
    return Array.from(new Set(statuses)).sort();
  }, [simulations]);

  const simulationGeometries = useMemo(() => {
    const ids = simulations?.map((sim) => sim.geometryId).filter(Boolean) || [];
    return Array.from(new Set(ids)).sort((a, b) => Number(a) - Number(b));
  }, [simulations]);

  const filteredSimulations = simulations?.filter((sim) => {
    const geometryName = getGeometryName(sim.geometryId);
    const materialName = getMaterialName(sim.materialId);
    const matchesSearch =
      sim.name.toLowerCase().includes(search.toLowerCase()) ||
      sim.type.toLowerCase().includes(search.toLowerCase()) ||
      geometryName.toLowerCase().includes(search.toLowerCase()) ||
      materialName.toLowerCase().includes(search.toLowerCase());
    const matchesMaterial = materialFilter === "all" || String(sim.materialId) === materialFilter;
    const matchesGeometry = geometryFilter === "all" || String(sim.geometryId) === geometryFilter;
    const matchesType = typeFilter === "all" || sim.type === typeFilter;
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "updated"
        ? Boolean(sim.paramsDirty)
        : sim.status === statusFilter;
    return matchesSearch && matchesMaterial && matchesGeometry && matchesType && matchesStatus;
  });

  const sortedSimulations = useMemo(() => {
    const list = [...(filteredSimulations ?? [])];
    const getDateValue = (sim: typeof list[number]) => {
      const rawDate =
        (sim as any).updatedAt || sim.completedAt || sim.createdAt;
      return rawDate ? new Date(rawDate).getTime() : 0;
    };
    const statusRank = (status: string) => {
      if (status === "running") return 0;
      if (status === "pending") return 1;
      if (status === "failed") return 2;
      return 3;
    };
    list.sort((a, b) => {
      let result = 0;
      switch (sortKey) {
        case "id":
          result = a.id - b.id;
          break;
        case "name":
          result = a.name.localeCompare(b.name);
          break;
        case "type":
          result = a.type.localeCompare(b.type);
          break;
        case "material":
          result = getMaterialName(a.materialId).localeCompare(
            getMaterialName(b.materialId)
          );
          break;
        case "geometry":
          result = getGeometryName(a.geometryId).localeCompare(
            getGeometryName(b.geometryId)
          );
          break;
        case "status":
          result = statusRank(a.status) - statusRank(b.status);
          if (result === 0) {
            result = getDateValue(a) - getDateValue(b);
          }
          break;
        case "date":
        default:
          result = getDateValue(a) - getDateValue(b);
          break;
      }
      return sortDir === "asc" ? result : -result;
    });
    return list;
  }, [filteredSimulations, sortKey, sortDir, getMaterialName, getGeometryName]);

  const assistantContext = useMemo(() => {
    const sample = sortedSimulations.slice(0, 8).map((sim) => ({
      id: sim.id,
      name: sim.name,
      status: sim.paramsDirty ? "updated" : sim.status,
      type: sim.type,
      material: getMaterialName(sim.materialId),
      geometry: getGeometryName(sim.geometryId),
    }));
    return {
      pageSummary:
        "Browse and manage simulation runs with filters, sorting, and actions for edit, rerun, and delete.",
      tableColumns: ["ID", "Name", "Test Type", "Material", "Geometry", "Status", "Date"],
      actions: ["View", "Edit", "Run", "Pause/Cancel", "Delete"],
      search,
      filters: {
        material: materialFilter,
        geometry: geometryFilter,
        type: typeFilter,
        status: statusFilter,
      },
      sort: { key: sortKey, direction: sortDir },
      totalCount: simulations?.length ?? 0,
      filteredCount: filteredSimulations?.length ?? 0,
      sample,
    };
  }, [
    search,
    materialFilter,
    geometryFilter,
    typeFilter,
    statusFilter,
    sortKey,
    sortDir,
    simulations?.length,
    filteredSimulations?.length,
    sortedSimulations,
    getMaterialName,
    getGeometryName,
  ]);

  const assistantContextKey = useMemo(
    () =>
      JSON.stringify({
        search,
        filters: {
          material: materialFilter,
          geometry: geometryFilter,
          type: typeFilter,
          status: statusFilter,
        },
        sort: { key: sortKey, direction: sortDir },
        totalCount: simulations?.length ?? 0,
        filteredCount: filteredSimulations?.length ?? 0,
        sampleIds: sortedSimulations.slice(0, 8).map((sim) => sim.id),
      }),
    [
      search,
      materialFilter,
      geometryFilter,
      typeFilter,
      statusFilter,
      sortKey,
      sortDir,
      simulations?.length,
      filteredSimulations?.length,
      sortedSimulations,
    ]
  );

  const assistantContextKeyRef = useRef("");

  useEffect(() => {
    if (assistantContextKeyRef.current === assistantContextKey) return;
    assistantContextKeyRef.current = assistantContextKey;
    setContext("simulations", assistantContext);
  }, [assistantContext, assistantContextKey, setContext]);

  const handleSort = (
    key: "id" | "name" | "type" | "material" | "geometry" | "date" | "status"
  ) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((current) => (current === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(key === "date" ? "desc" : "asc");
      return key;
    });
  };

  const renderSortIcon = (
    key: "id" | "name" | "type" | "material" | "geometry" | "date" | "status"
  ) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  };

  const getTypeBadgeClass = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized.includes("tensile")) return "bg-sky-100 text-sky-700";
    if (normalized.includes("thermal")) return "bg-orange-100 text-orange-700";
    if (normalized.includes("fatigue")) return "bg-indigo-100 text-indigo-700";
    return "bg-muted text-muted-foreground";
  };

  const handleDelete = (id: number, name: string) => {
    setDeleteTarget({ id, name });
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await deleteSimulation(deleteTarget.id);
      toast({
        title: "Simulation deleted",
        description: (
          <span>
            <span className="font-medium text-foreground italic" title={deleteTarget.name}>
              {truncateName(deleteTarget.name, 25)}
            </span>{" "}
            was removed.
          </span>
        ),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete simulation.";
      toast({ title: "Delete failed", description: message, variant: "destructive" });
    } finally {
      setDeletingId(null);
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    }
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
    await createGeometry(
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

  const openEditDialog = (sim: typeof simulations[number]) => {
    setActiveSimulationId(sim.id);
    setSimName(sim.name);
    setSimType(sim.type);
    setMaterialId(String(sim.materialId));
    setGeometryId(sim.geometryId ? String(sim.geometryId) : "");
    setAppliedLoad(sim.appliedLoad != null ? String(sim.appliedLoad) : "");
    setTemperature(sim.temperature != null ? String(sim.temperature) : "");
    setDuration(sim.duration != null ? String(sim.duration) : "");
    setFrequency(sim.frequency != null ? String(sim.frequency) : "");
    setDampingRatio(sim.dampingRatio != null ? String(sim.dampingRatio) : "");
    setMaterialModel(sim.materialModel || "linear");
    setYieldStrength(sim.yieldStrength != null ? String(sim.yieldStrength) : "");
    setHardeningModulus(sim.hardeningModulus != null ? String(sim.hardeningModulus) : "");
    setGeometryName("");
    setGeometryFile(null);
    setIsEditOpen(true);
  };

  const updateBoundaryCondition = (
    id: string,
    patch: Partial<typeof boundaryConditionsForm[number]>,
  ) => {
    setBoundaryConditionsForm((prev) =>
      prev.map((condition) =>
        condition.id === id ? { ...condition, ...patch } : condition
      )
    );
  };

  const addBoundaryCondition = () => {
    const id = `bc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setBoundaryConditionsForm((prev) => [
      ...prev,
      { id, type: "pressure", face: "z+", magnitude: appliedLoad, unit: "N" },
    ]);
  };

  const removeBoundaryCondition = (id: string) => {
    setBoundaryConditionsForm((prev) => prev.filter((condition) => condition.id !== id));
  };

  const resolveBoundaryConditions = () =>
    boundaryConditionsForm.map((condition) => {
      if (condition.type === "pressure") {
        const magnitude =
          condition.magnitude.trim() === ""
            ? Number(appliedLoad)
            : Number(condition.magnitude);
        return {
          type: condition.type,
          face: condition.face,
          magnitude: Number.isFinite(magnitude) ? magnitude : null,
          unit: condition.unit || "N",
        };
      }
      return { type: condition.type, face: condition.face };
    });

  const bcErrors = useMemo(() => {
    const errors: string[] = [];
    const fixed = boundaryConditionsForm.filter((condition) => condition.type === "fixed");
    const loads = boundaryConditionsForm.filter((condition) => condition.type === "pressure");
    if (fixed.length === 0) {
      errors.push("Add at least one fixed support to prevent rigid-body motion.");
    }
    if (loads.length === 0) {
      errors.push("Add at least one applied load so the solver has forcing.");
    }
    const loadFaces = new Set(loads.map((condition) => condition.face));
    const loadFaceCounts = loads.reduce<Record<string, number>>((acc, condition) => {
      acc[condition.face] = (acc[condition.face] || 0) + 1;
      return acc;
    }, {});
    Object.entries(loadFaceCounts).forEach(([face, count]) => {
      if (count > 1) {
        errors.push(`Only one applied load is allowed per face (${face}).`);
      }
    });
    fixed.forEach((condition) => {
      if (loadFaces.has(condition.face)) {
        errors.push(`Fixed and load are both applied on ${condition.face}.`);
      }
    });
    loads.forEach((condition) => {
      const magnitude = condition.magnitude.trim();
      if (magnitude === "") {
        errors.push(`Load on ${condition.face} has no magnitude.`);
      } else if (!Number.isFinite(Number(magnitude))) {
        errors.push(`Load on ${condition.face} has an invalid magnitude.`);
      }
    });
    return errors;
  }, [boundaryConditionsForm]);

  const normalizeDampingRatio = (value: string) => {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(Math.max(parsed, 0), 1);
  };

  const resolvePlasticValue = (value: string, fallback: number) => {
    const parsed = parseFloat(value);
    if (value.trim() === "" || !Number.isFinite(parsed)) return fallback;
    return parsed;
  };

  const normalizeBoundaryConditions = (
    conditions: {
      type: "fixed" | "pressure";
      face: string;
      magnitude?: number | null;
      unit?: string | null;
    }[],
    fallbackLoad: number | null,
  ) =>
    conditions.map((condition) => {
      if (condition.type === "pressure") {
        const rawMagnitude =
          condition.magnitude == null ? fallbackLoad : condition.magnitude;
        return {
          type: condition.type,
          face: condition.face,
          magnitude:
            rawMagnitude == null || Number.isNaN(Number(rawMagnitude))
              ? null
              : Number(rawMagnitude),
          unit: condition.unit || "N",
        };
      }
      return { type: condition.type, face: condition.face };
    });

  const isEditDirty = useMemo(() => {
    if (!activeSimulationId) return false;
    const activeSimulation = simulations?.find(
      (sim) => sim.id === activeSimulationId
    );
    if (!activeSimulation) return false;
    const resolvedYieldStrength =
      materialModel === "plastic"
        ? resolvePlasticValue(yieldStrength, 250)
        : null;
    const resolvedHardeningModulus =
      materialModel === "plastic"
        ? resolvePlasticValue(hardeningModulus, 100)
        : null;
    const normalizeNumber = (value: string) => {
      if (value.trim() === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const normalizeDampingRatio = (value: string) => {
      if (value.trim() === "") return null;
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return null;
      return Math.min(Math.max(parsed, 0), 1);
    };
    const draft = {
      name: simName.trim(),
      type: simType,
      materialId: Number(materialId) || null,
      geometryId: geometryId ? Number(geometryId) : null,
      appliedLoad: normalizeNumber(appliedLoad),
      temperature: normalizeNumber(temperature),
      duration: normalizeNumber(duration),
      frequency: normalizeNumber(frequency),
      dampingRatio: normalizeDampingRatio(dampingRatio),
      materialModel,
      yieldStrength: resolvedYieldStrength,
      hardeningModulus: resolvedHardeningModulus,
    };
    const baseline = {
      name: activeSimulation.name,
      type: activeSimulation.type,
      materialId: activeSimulation.materialId ?? null,
      geometryId: activeSimulation.geometryId ?? null,
      appliedLoad: activeSimulation.appliedLoad ?? null,
      temperature: activeSimulation.temperature ?? null,
      duration: activeSimulation.duration ?? null,
      frequency: activeSimulation.frequency ?? null,
      dampingRatio: activeSimulation.dampingRatio ?? null,
      materialModel: activeSimulation.materialModel || "linear",
      yieldStrength: activeSimulation.yieldStrength ?? null,
      hardeningModulus: activeSimulation.hardeningModulus ?? null,
    };
    const baselineConditions = normalizeBoundaryConditions(
      (boundaryConditions ?? []).map((condition) => ({
        type: condition.type as "fixed" | "pressure",
        face: condition.face,
        magnitude: condition.magnitude,
        unit: condition.unit,
      })),
      activeSimulation.appliedLoad ?? null,
    );
    const draftConditions = normalizeBoundaryConditions(
      resolveBoundaryConditions().map((condition) => ({
        type: condition.type,
        face: condition.face,
        magnitude: condition.magnitude,
        unit: condition.unit,
      })),
      draft.appliedLoad,
    );
    const conditionKey = (condition: {
      type: string;
      face: string;
      magnitude?: number | null;
      unit?: string | null;
    }) =>
      `${condition.type}|${condition.face}|${condition.magnitude ?? ""}|${
        condition.unit ?? ""
      }`;
    const sortedBaseline = [...baselineConditions].sort((a, b) =>
      conditionKey(a).localeCompare(conditionKey(b))
    );
    const sortedDraft = [...draftConditions].sort((a, b) =>
      conditionKey(a).localeCompare(conditionKey(b))
    );
    if (JSON.stringify(draft) !== JSON.stringify(baseline)) return true;
    return JSON.stringify(sortedDraft) !== JSON.stringify(sortedBaseline);
  }, [
    simulations,
    activeSimulationId,
    simName,
    simType,
    materialId,
    geometryId,
    appliedLoad,
    temperature,
    duration,
    frequency,
    dampingRatio,
    materialModel,
    yieldStrength,
    hardeningModulus,
    boundaryConditions,
    boundaryConditionsForm,
  ]);

  const submitUpdate = async (run: boolean) => {
    if (!activeSimulationId) return;
    if (bcErrors.length > 0) return;
    const resolvedYieldStrength =
      materialModel === "plastic"
        ? resolvePlasticValue(yieldStrength, 250)
        : null;
    const resolvedHardeningModulus =
      materialModel === "plastic"
        ? resolvePlasticValue(hardeningModulus, 100)
        : null;
    await updateSimulation({
      id: activeSimulationId,
      data: {
        name: simName,
        type: simType,
        materialId: Number(materialId),
        geometryId: geometryId ? Number(geometryId) : null,
        appliedLoad: appliedLoad ? Number(appliedLoad) : null,
        temperature: temperature ? Number(temperature) : null,
        duration: duration ? Number(duration) : null,
        frequency: frequency ? Number(frequency) : null,
        dampingRatio: normalizeDampingRatio(dampingRatio),
        materialModel,
        yieldStrength: resolvedYieldStrength,
        hardeningModulus: resolvedHardeningModulus,
        boundaryConditions: resolveBoundaryConditions(),
        run,
      },
    });
    queryClient.invalidateQueries({ queryKey: ["/api/simulations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/simulations/:id", activeSimulationId] });
    queryClient.refetchQueries({ queryKey: ["/api/simulations"] });
    queryClient.refetchQueries({ queryKey: ["/api/simulations/:id", activeSimulationId] });
    setIsEditOpen(false);
  };

  const handleRerun = async (sim: typeof simulations[number]) => {
    await updateSimulation({
      id: sim.id,
      data: {
        name: sim.name,
        type: sim.type,
        materialId: sim.materialId,
        geometryId: sim.geometryId ?? null,
        appliedLoad: sim.appliedLoad ?? null,
        temperature: sim.temperature ?? null,
        duration: sim.duration ?? null,
        frequency: sim.frequency ?? null,
        dampingRatio: sim.dampingRatio ?? null,
        materialModel: sim.materialModel || "linear",
        yieldStrength: sim.yieldStrength ?? null,
        hardeningModulus: sim.hardeningModulus ?? null,
        run: true,
      },
    });
    queryClient.invalidateQueries({ queryKey: ["/api/simulations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/simulations/:id", sim.id] });
    queryClient.refetchQueries({ queryKey: ["/api/simulations"] });
    queryClient.refetchQueries({ queryKey: ["/api/simulations/:id", sim.id] });
  };

  const handleCancel = async (sim: typeof simulations[number]) => {
    await cancelSimulation(sim.id);
  };

  const activeSimulation = simulations?.find((sim) => sim.id === activeSimulationId);

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
    if (!boundaryConditions || !activeSimulationId) return;
    setBoundaryConditionsForm(
      boundaryConditions.map((condition) => ({
        id: String(condition.id),
        type: condition.type as "fixed" | "pressure",
        face: condition.face as "x+" | "x-" | "y+" | "y-" | "z+" | "z-",
        magnitude: condition.magnitude != null ? String(condition.magnitude) : "",
        unit: condition.unit || "N",
      }))
    );
  }, [boundaryConditions, activeSimulationId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Simulations</h1>
          <p className="text-muted-foreground mt-1">Monitor active jobs and view historical results.</p>
        </div>
        <div className="flex flex-col gap-3 w-full lg:w-auto">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                className="pl-9 bg-card"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Link href="/simulations/create">
              <Button className="w-full sm:w-auto font-semibold opacity-90 hover:opacity-100">
                <Zap className="h-4 w-4 fill-current" />
                Create
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={materialFilter} onValueChange={setMaterialFilter}>
              <SelectTrigger className="w-full sm:w-44 bg-card text-xs relative pl-9 text-foreground/75 hover:text-foreground transition-all">
                <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <SelectValue placeholder="Material" />
              </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Materials</SelectItem>
              {materials?.map((material) => (
                <SelectItem key={material.id} value={String(material.id)}>
                  {material.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
            <Select value={geometryFilter} onValueChange={setGeometryFilter}>
              <SelectTrigger className="w-full sm:w-44 bg-card text-xs relative pl-9 text-foreground/75 hover:text-foreground transition-all">
                <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <SelectValue placeholder="Geometry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Geometries</SelectItem>
                {simulationGeometries.map((geometryId) => (
                  <SelectItem key={geometryId} value={String(geometryId)}>
                    {getGeometryName(geometryId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-card text-xs relative pl-9 text-foreground/75 hover:text-foreground transition-all">
                <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <SelectValue placeholder="Test Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {simulationTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36 bg-card text-xs relative pl-9 text-foreground/75 hover:text-foreground transition-all">
                <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {simulationStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status[0].toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-auto lg:overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="border-t border-border">
            <table className="w-[320%] lg:w-full lg:table-fixed text-sm text-left">
              <colgroup>
              <col className="hidden lg:table-column lg:w-16" />
              <col className="w-[2%] lg:w-[16%]" />
              <col className="w-[5%] lg:w-[14%]" />
              <col className="w-[10%] lg:w-[16%]" />
              <col className="w-[12%] lg:w-[16%]" />
              <col className="w-[11%] lg:w-[14%]" />
              <col className="w-[12%] lg:w-[10%]" />
              <col className="w-[14%] lg:w-[24%]" />
            </colgroup>
            <thead className="text-xs uppercase bg-muted text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort("id")}
                    className="inline-flex items-center gap-2 uppercase"
                  >
                    ID
                    {renderSortIcon("id")}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    className="inline-flex items-center gap-2 uppercase"
                  >
                    Name
                    {renderSortIcon("name")}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort("type")}
                    className="inline-flex items-center gap-2 uppercase"
                  >
                    Type
                    {renderSortIcon("type")}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort("material")}
                    className="inline-flex items-center gap-2 uppercase"
                  >
                    Material
                    {renderSortIcon("material")}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort("geometry")}
                    className="inline-flex items-center gap-2 uppercase"
                  >
                    Geometry
                    {renderSortIcon("geometry")}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort("date")}
                    className="inline-flex items-center gap-2 uppercase"
                  >
                    Date
                    {renderSortIcon("date")}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => handleSort("status")}
                    className="inline-flex items-center gap-2 uppercase"
                  >
                    Status
                    {renderSortIcon("status")}
                  </button>
                </th>
                <th className="px-6 py-4 lg:text-center">
                  {/* <div className="lg:absolute lg:bottom-[16px] lg:right-[0px]"> */}
                    Action
                  {/* </div> */}
                </th>
              </tr>
              </thead>
            </table>
            <div className="max-h-[70vh] lg:overflow-y-auto lg:overflow-x-auto">
              <table className="w-full lg:table-fixed text-sm text-left">
                <colgroup>
                  <col className="w-16" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[24%]" />
                </colgroup>
                <tbody className="divide-y divide-border">
                {sortedSimulations.map((sim) => (
                  <tr key={sim.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">#{sim.id}</td>
                    <td className="px-6 py-4 font-medium text-foreground truncate">
                      <span title={sim.name}>
                        {truncateText(sim.name, 15)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground truncate">
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium ${getTypeBadgeClass(sim.type)}`}
                        title={sim.type}
                      >
                        {truncateText(sim.type, 10)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-foreground truncate">
                      <span
                        style={
                          {
                            "--badge-hue": materialHueMap.get(sim.materialId) ?? 210,
                          } as CSSProperties
                        }
                        className="px-2 py-1 rounded-md text-xs font-medium bg-[hsl(var(--badge-hue)_80%_90%)] text-[hsl(var(--badge-hue)_45%_30%)] dark:bg-[hsl(var(--badge-hue)_35%_20%)] dark:text-[hsl(var(--badge-hue)_70%_80%)]"
                        title={getMaterialName(sim.materialId)}
                      >
                        {truncateText(getMaterialName(sim.materialId), 10)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-foreground truncate">
                      <span
                        style={
                          {
                            "--badge-hue": geometryHueMap.get(sim.geometryId ?? 0) ?? 160,
                          } as CSSProperties
                        }
                        className="px-2 py-1 rounded-md text-xs font-medium bg-[hsl(var(--badge-hue)_80%_92%)] text-[hsl(var(--badge-hue)_45%_28%)] dark:bg-[hsl(var(--badge-hue)_35%_18%)] dark:text-[hsl(var(--badge-hue)_70%_85%)]"
                        title={getGeometryName(sim.geometryId)}
                      >
                        {truncateText(getGeometryName(sim.geometryId), 10)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs truncate">
                      {(() => {
                        const rawDate =
                          (sim as any).updatedAt || sim.completedAt || sim.createdAt;
                        if (!rawDate) return "-";
                        const localDate = new Date(rawDate).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        });
                        return (
                          <span title={localDate}>
                            {truncateText(localDate, 10)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={sim.paramsDirty ? "Updated" : sim.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/simulations/${sim.id}`} className="text-primary hover:text-primary/80 font-medium hover:underline">
                          <Button variant="ghost" size="sm" className="h-8 bg-primary/10 hover:bg-primary/15 hover:text-primary" title="View">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        {sim.status !== "running" && sim.status !== "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-indigo-500 bg-indigo-500/10 hover:text-indigo-600 hover:bg-indigo-500/15"
                            onClick={() => openEditDialog(sim)}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        {sim.status === "running" || sim.status === "pending" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-amber-500 bg-amber-500/10 hover:text-amber-500 hover:bg-amber-500/15"
                            onClick={() => handleCancel(sim)}
                            disabled={isCancelling}
                            title="Cancel"
                          >
                            <Pause className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-emerald-600 bg-emerald-500/10 hover:text-emerald-600 hover:bg-emerald-500/15"
                            onClick={() => handleRerun(sim)}
                            title="Run"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        {sim.status !== "running" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive bg-destructive/10 hover:text-destructive hover:bg-destructive/15"
                            onClick={() => handleDelete(sim.id, sim.name)}
                            disabled={isDeleting && deletingId === sim.id}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedSimulations.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                      No simulations found.
                    </td>
                  </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl p-4 py-6">
          <DialogHeader className="px-2">
            <DialogTitle>Edit Simulation</DialogTitle>
            <DialogDescription>Update parameters and rerun if needed.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto px-2 space-y-5">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Basic Information</h4>
              <div className="space-y-2">
                <Label className="text-sm">Geometry</Label>
                <Select value={geometryId} onValueChange={setGeometryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select geometry" />
                  </SelectTrigger>
                  <SelectContent>
                    {geometries?.map((geometry) => (
                      <SelectItem key={geometry.id} value={String(geometry.id)}>
                        {geometry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                {isLoadingGeometry ? (
                  <p className="text-sm text-muted-foreground">Loading preview...</p>
                ) : geometryError ? (
                  <p className="text-sm text-destructive">{geometryError}</p>
                ) : geometryMesh ? (
                  <div className="h-[220px]">
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
                          hoverinfo: "skip",
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
                      config={{ displaylogo: false }}
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
                      id="geometry-file-edit"
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
                      htmlFor="geometry-file-edit"
                      className="cursor-pointer rounded-md border border-input bg-muted/40 px-3 py-1 text-xs font-semibold text-foreground shadow-sm hover:bg-muted"
                    >
                      Choose File
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {geometryFile?.name || "No file chosen"}
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
              <div className="space-y-2">
                <Label className="text-sm">Material</Label>
                <Select value={materialId} onValueChange={setMaterialId}>
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
                  value={simName}
                  onChange={(event) => setSimName(event.target.value)}
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

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Load & Environment</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Applied Load (N)</Label>
                  <Input
                    type="number"
                    value={appliedLoad}
                    onChange={(event) => setAppliedLoad(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Temperature (C)</Label>
                  <Input
                    type="number"
                    value={temperature}
                    onChange={(event) => setTemperature(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Boundary Conditions</h4>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 w-8 rounded-full text-primary hover:text-primary hover:bg-primary/10"
                  onClick={addBoundaryCondition}
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {boundaryConditionsForm.map((condition, index) => (
                  <div key={condition.id} className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Condition {index + 1}
                      </p>
                      {boundaryConditionsForm.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-7 w-7 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeBoundaryCondition(condition.id)}
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
                            <SelectItem value="fixed">Fixed Support</SelectItem>
                            <SelectItem value="pressure">Applied Load</SelectItem>
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
                            <SelectItem value="z-">Bottom (z-)</SelectItem>
                            <SelectItem value="z+">Top (z+)</SelectItem>
                            <SelectItem value="x-">Left (x-)</SelectItem>
                            <SelectItem value="x+">Right (x+)</SelectItem>
                            <SelectItem value="y-">Back (y-)</SelectItem>
                            <SelectItem value="y+">Front (y+)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Magnitude (N)</Label>
                        <Input
                          type="number"
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
              {bcErrors.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  {bcErrors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Material Model</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Model Type</Label>
                  <Select value={materialModel} onValueChange={setMaterialModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">Linear Elastic</SelectItem>
                      <SelectItem value="plastic">Elastic-Plastic</SelectItem>
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
              <h4 className="text-sm font-semibold">Time & Dynamics</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Duration (s)</Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Frequency (Hz)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={frequency}
                    onChange={(event) => setFrequency(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Damping Ratio</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={dampingRatio}
                    onChange={(event) => setDampingRatio(event.target.value)}
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

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => submitUpdate(false)}
                disabled={
                  isUpdating || !activeSimulation || !isEditDirty || bcErrors.length > 0
                }
                className="hover:text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:pointer-events-auto disabled:hover:text-foreground disabled:hover:bg-transparent disabled:opacity-60"
              >
                {isUpdating ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={() => submitUpdate(true)}
                disabled={isUpdating || !activeSimulation || bcErrors.length > 0}
              >
                <Play className="h-4 w-4 fill-current" />
                Run
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete simulation?</DialogTitle>
            <DialogDescription className="text-foreground pt-4">
              This will permanently remove{" "}
              <span className="font-semibold text-foreground" title={deleteTarget?.name || ""}>
                {truncateName(deleteTarget?.name, 25) || "this simulation"}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteOpen(false)}
              className="hover:text-primary hover:bg-primary/10"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={!deleteTarget || (isDeleting && deletingId === deleteTarget?.id)}
              className="opacity-90 hover:opacity-100 disabled:hover:opacity-50"
            >
              {isDeleting && deletingId === deleteTarget?.id ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
