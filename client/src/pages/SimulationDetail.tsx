import { useParams } from "wouter";
import type { ElementType, MouseEvent } from "react";
import { useSimulation, useUpdateSimulation } from "@/hooks/use-simulations";
import { useMaterial } from "@/hooks/use-materials";
import { useEffect, useMemo, useRef, useState } from "react";
import Plot from "react-plotly.js";
import { useGeometries } from "@/hooks/use-geometries";
import { useBoundaryConditions } from "@/hooks/use-boundary-conditions";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Activity,
  BarChart2,
  Box,
  ChevronLeft,
  Download,
  Gauge,
  Info,
  Layers,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Ruler,
  Share2,
  Thermometer,
  Timer,
  Waves,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  RefreshCcw,
} from "lucide-react";
import { Link } from "wouter";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import Plotly from "plotly.js-dist-min";

export default function SimulationDetail() {
  const { id } = useParams();
  const { data: simulation, isLoading } = useSimulation(parseInt(id || "0"));
  const { mutateAsync: updateSimulation } = useUpdateSimulation();
  const { data: material } = useMaterial(simulation?.materialId || 0);
  const { data: geometries } = useGeometries();
  const { data: boundaryConditions } = useBoundaryConditions(simulation?.id);
  const [showConfigDetails, setShowConfigDetails] = useState(false);
  const [showMetricsDetails, setShowMetricsDetails] = useState(false);
  const [overlayDisplacement, setOverlayDisplacement] = useState(false);
  const [playheadIndex, setPlayheadIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fieldViewMode, setFieldViewMode] = useState<
    "isosurface" | "slice" | "volume"
  >("isosurface");
  const [sliceAxis, setSliceAxis] = useState<"x" | "y" | "z">("z");
  const [fieldThreshold, setFieldThreshold] = useState(0.35);
  const [fieldSlice, setFieldSlice] = useState(0.5);
  const [geometryContent, setGeometryContent] = useState<string | null>(null);
  const [geometryFormat, setGeometryFormat] = useState<string | null>(null);
  const [geometryError, setGeometryError] = useState<string | null>(null);
  const [isLoadingGeometry, setIsLoadingGeometry] = useState(false);
  const [simulationMeshes, setSimulationMeshes] = useState<
    { id: number; name: string; format: string; nodeCount?: number | null; elementCount?: number | null }[]
  >([]);
  const [isLoadingMeshes, setIsLoadingMeshes] = useState(false);
  const [meshError, setMeshError] = useState<string | null>(null);
  const [meshPreview, setMeshPreview] = useState<{
    x: number[];
    y: number[];
    z: number[];
    i: number[];
    j: number[];
    k: number[];
  } | null>(null);
  const [meshPreviewName, setMeshPreviewName] = useState<string | null>(null);
  const [meshPreviewError, setMeshPreviewError] = useState<string | null>(null);
  const [isLoadingMeshPreview, setIsLoadingMeshPreview] = useState(false);
  const [infoTooltip, setInfoTooltip] = useState<{
    text: string;
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);
  const { toast } = useToast();
  const plotRef = useRef<any>(null);

  const results = simulation?.results as any;
  const isCompleted = simulation?.status === "completed";
  const isRunning =
    simulation?.status === "running" || simulation?.status === "pending";
  const solverSource = results?.source || "unknown";
  const solverBadge =
    solverSource === "fenics"
      ? "FEniCS"
      : solverSource === "fallback"
      ? "Fallback"
      : "Solver";
  const stressSeries = results?.timeSeriesData?.map((d: any) => d.stress) || [];
  const maxStress =
    stressSeries.length > 0
      ? Math.max(...stressSeries)
      : results?.maxStress ?? 0;
  const minStress =
    stressSeries.length > 0 ? Math.min(...stressSeries) : results?.minStress ?? 0;
  const avgStress =
    stressSeries.length > 0
      ? stressSeries.reduce((sum: number, value: number) => sum + value, 0) /
        stressSeries.length
      : results?.avgStress ?? 0;
  const stressRange =
    stressSeries.length > 0 ? maxStress - minStress : 0;
  const timeSeriesData = (results?.timeSeriesData || []) as {
    time: number;
    stress: number;
    displacement: number;
  }[];
  const stressStrainData =
    (results?.stressStrainCurve as { strain: number; stress: number }[] | undefined) ||
    material?.stressStrainCurve ||
    [];
  const formatNumber = (value?: number, decimals = 3) =>
    typeof value === "number" && Number.isFinite(value)
      ? value.toFixed(decimals)
      : "N/A";
  const formatMicrostrain = (value?: number) =>
    typeof value === "number" && Number.isFinite(value)
      ? (value * 1_000_000).toFixed(2)
      : "N/A";
  const rawRunDate = simulation?.completedAt || simulation?.createdAt;
  const runDate = rawRunDate
    ? new Date(rawRunDate).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "N/A";

  const geometry = useMemo(
    () => geometries?.find((item) => item.id === simulation?.geometryId),
    [geometries, simulation?.geometryId]
  );

  const primaryConfigItems = useMemo(
    () =>
      [
        { label: "Material", value: material?.name || "Unknown", icon: Box },
        { label: "Test Type", value: simulation?.type || "Unknown", icon: Activity },
        simulation?.materialModel
          ? {
              label: "Material Model",
              value:
                simulation.materialModel === "plastic"
                  ? "Elastic-Plastic"
                  : "Linear Elastic",
              icon: Layers,
            }
          : null,
      ] as {
        label: string;
        value: string;
        icon: ElementType;
      }[],
    [geometry?.name, material?.name, simulation?.type, simulation?.materialModel]
  );

  const secondaryConfigItems = useMemo(
    () =>
      [
        material?.youngsModulus != null
          ? {
              label: "Young's Modulus",
              value: `${formatNumber(material.youngsModulus)} GPa`,
              icon: Ruler,
            }
          : null,
        simulation?.appliedLoad != null
          ? {
              label: "Applied Load",
              value: `${formatNumber(simulation.appliedLoad)} N`,
              icon: Gauge,
            }
          : null,
        simulation?.temperature != null
          ? {
              label: "Temperature",
              value: `${formatNumber(simulation.temperature)} C`,
              icon: Thermometer,
            }
          : null,
        simulation?.duration != null
          ? {
              label: "Duration",
              value: `${formatNumber(simulation.duration)} s`,
              icon: Timer,
            }
          : null,
        simulation?.frequency != null
          ? {
              label: "Frequency",
              value: `${formatNumber(simulation.frequency)} Hz`,
              icon: Waves,
            }
          : null,
        simulation?.yieldStrength != null
          ? {
              label: "Yield Strength",
              value: `${formatNumber(simulation.yieldStrength)} MPa`,
              icon: ShieldCheck,
            }
          : null,
        simulation?.hardeningModulus != null
          ? {
              label: "Hardening Modulus",
              value: `${formatNumber(simulation.hardeningModulus)} MPa`,
              icon: Sparkles,
            }
          : null,
      ].filter(Boolean) as {
        label: string;
        value: string;
        icon: ElementType;
      }[],
    [
      material?.youngsModulus,
      simulation?.appliedLoad,
      simulation?.temperature,
      simulation?.duration,
      simulation?.frequency,
      simulation?.materialModel,
      simulation?.yieldStrength,
      simulation?.hardeningModulus,
    ]
  );

  const formatFaceLabel = (face: string) => {
    switch (face) {
      case "z+":
        return "Top (z+)";
      case "z-":
        return "Bottom (z-)";
      case "x+":
        return "Right (x+)";
      case "x-":
        return "Left (x-)";
      case "y+":
        return "Front (y+)";
      case "y-":
        return "Back (y-)";
      default:
        return face;
    }
  };

  const bcItems = useMemo(() => {
    if (!boundaryConditions?.length) return [];
    return boundaryConditions.map((condition) => {
      const label =
        condition.type === "fixed" ? "Fixed Support" : "Applied Load";
      const value =
        condition.type === "pressure"
          ? `${formatNumber(condition.magnitude ?? undefined)} ${condition.unit || "N"}`
          : "";
      return {
        id: condition.id,
        label,
        face: formatFaceLabel(condition.face),
        value,
      };
    });
  }, [boundaryConditions]);

  const progressStage =
    (simulation?.progress ?? 0) < 20
      ? "Meshing"
      : (simulation?.progress ?? 0) < 70
      ? "Solving"
      : "Post-processing";
  const timeMax =
    timeSeriesData.length > 0
      ? Math.max(...timeSeriesData.map((point) => Number(point.time) || 0))
      : 0;
  const timeTickStep = (() => {
    if (timeMax <= 0.5) return 0.5;
    const candidates = [0.5, 1, 2, 5, 10, 15, 30, 60];
    const targetTicks = 6;
    const rawStep = timeMax / targetTicks;
    for (const step of candidates) {
      if (step >= rawStep) return step;
    }
    return 60;
  })();
  const timeTickMax = timeMax > 0 ? Math.ceil(timeMax / timeTickStep) * timeTickStep : 0;
  const timeTicks = Array.from(
    { length: Math.floor(timeTickMax / timeTickStep) + 1 },
    (_, idx) => Number((idx * timeTickStep).toFixed(2))
  );
  const formatTimeTick = (value: number) =>
    timeTickStep === 0.5 ? value.toFixed(1) : Math.round(value).toString();
  const activePoint = timeSeriesData[Math.min(playheadIndex, Math.max(timeSeriesData.length - 1, 0))];
  const activeTime = activePoint?.time ?? 0;
  const activeStress = activePoint?.stress ?? 0;
  const activeDisplacement = activePoint?.displacement ?? 0;
  const metricsList = [
    {
      label: "Max Stress",
      value: `${formatNumber(maxStress)} MPa`,
      definition: "Peak stress encountered during simulation.",
      color: "text-primary",
      bg: "bg-primary/10 dark:bg-primary/20",
    },
    {
      label: "Min Stress",
      value: `${formatNumber(minStress)} MPa`,
      definition: "Baseline stress at zero strain.",
      color: "text-indigo-500",
      bg: "bg-indigo-100/70 dark:bg-indigo-500/20 dark:text-indigo-200",
    },
    {
      label: "Avg Stress",
      value: `${formatNumber(avgStress)} MPa`,
      definition: "Mean stress across all strain points.",
      color: "text-orange-500",
      bg: "bg-orange-100/70 dark:bg-orange-500/20 dark:text-orange-200",
    },
    {
      label: "Stress Range",
      value: `${formatNumber(stressRange)} MPa`,
      definition: "Total variation in stress values.",
      color: "text-emerald-500",
      bg: "bg-emerald-100/70 dark:bg-emerald-500/20 dark:text-emerald-200",
    },
    {
      label: "Max Deformation",
      value: `${formatNumber(
        typeof results?.maxDeformation === "number"
          ? results.maxDeformation * 1000
          : undefined
      )} μm`,
      definition: "Peak deformation during simulation.",
      color: "text-purple-600",
      bg: "bg-purple-100/70 dark:bg-purple-500/20 dark:text-purple-200",
    },
    {
      label: "Max Strain",
      value: `${formatMicrostrain(results?.maxStrain)} με`,
      definition: "Peak strain during simulation.",
      color: "text-sky-500",
      bg: "bg-sky-100/70 dark:bg-sky-500/20 dark:text-sky-200",
    },
    {
      label: "Avg Strain",
      value: `${formatMicrostrain(results?.avgStrain)} με`,
      definition: "Mean strain across all points.",
      color: "text-slate-500",
      bg: "bg-slate-200/70 dark:bg-slate-500/20 dark:text-slate-200",
    },
    {
      label: "Safety Factor",
      value: formatNumber(results?.safetyFactor),
      definition: "Estimated margin to failure.",
      color: "text-emerald-600",
      bg: "bg-emerald-100/70 dark:bg-emerald-500/20 dark:text-emerald-200",
    },
  ];
  const exportChartSvg = (chartId: string, filename: string) => {
    const container = document.getElementById(chartId);
    const svg = container?.querySelector("svg");
    if (!svg) {
      toast({
        title: "Export unavailable",
        description: "Chart is not ready to export yet.",
        variant: "destructive",
      });
      return;
    }
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
  const handleExportField = () => {
    if (!plotRef.current) return;
    Plotly.downloadImage(plotRef.current, {
      format: "png",
      filename: `${simulation.name || "simulation"}-field`,
    });
  };
  const handleChartHover = (state: any) => {
    if (isPlaying) return;
    if (typeof state?.activeTooltipIndex === "number") {
      setPlayheadIndex(state.activeTooltipIndex);
    }
  };
  useEffect(() => {
    if (!Array.isArray(results?.meshWarnings) || results.meshWarnings.length === 0) {
      return;
    }
    console.warn("Mesh notes:", results.meshWarnings);
  }, [results?.meshWarnings]);
  const showInfoTooltip = (event: MouseEvent<HTMLElement>, text: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setInfoTooltip({
      text,
      x: rect.left + rect.width / 2,
      y: rect.top,
      visible: true,
    });
  };
  const hideInfoTooltip = () => {
    setInfoTooltip((prev) => (prev ? { ...prev, visible: false } : null));
  };

  useEffect(() => {
    if (timeSeriesData.length > 0) {
      setPlayheadIndex(0);
    }
  }, [simulation?.id, timeSeriesData.length]);

  useEffect(() => {
    if (!timeMax) return;
    const normalized = Math.min(Math.max(activeTime / timeMax, 0), 1);
    setFieldSlice(Number(normalized.toFixed(2)));
  }, [activeTime, timeMax]);

  useEffect(() => {
    if (!geometry?.id) {
      setGeometryContent(null);
      setGeometryFormat(null);
      setGeometryError(null);
      return;
    }
    setIsLoadingGeometry(true);
    setGeometryError(null);
    fetch(`/api/geometries/${geometry.id}/content`)
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
  }, [geometry?.id]);

  useEffect(() => {
    if (!simulation?.id) {
      setSimulationMeshes([]);
      setMeshError(null);
      return;
    }
    setIsLoadingMeshes(true);
    setMeshError(null);
    const fetchMeshes = () =>
      fetch(`/api/simulations/${simulation.id}/meshes`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load meshes");
          return res.json();
        })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setSimulationMeshes(list);
      })
        .catch((err) => {
          setMeshError(err instanceof Error ? err.message : "Failed to load meshes");
          setSimulationMeshes([]);
        })
        .finally(() => setIsLoadingMeshes(false));

    void fetchMeshes();

    if (!isRunning) return;
    const interval = window.setInterval(fetchMeshes, 2000);
    return () => window.clearInterval(interval);
  }, [simulation?.id, isRunning]);

  const meshArtifacts = useMemo(
    () =>
      simulationMeshes.filter(
        (mesh) =>
          ["xml", "vtu"].includes(mesh.format.toLowerCase()) &&
          mesh.name.toLowerCase() !== "results"
      ),
    [simulationMeshes]
  );

  useEffect(() => {
    if (!meshArtifacts.length) return;
    if (meshPreview || isLoadingMeshPreview) return;
    const xmlMesh = meshArtifacts.find(
      (mesh) => mesh.format.toLowerCase() === "xml"
    );
    if (xmlMesh) {
      void handlePreviewMesh(xmlMesh);
    }
  }, [meshArtifacts, meshPreview, isLoadingMeshPreview]);

  const geometryMesh = useMemo(() => {
    if (!geometryContent || !geometryFormat) return null;
    if (geometryFormat.toLowerCase() !== "stl") return null;
    const normalized = geometryContent.includes(",")
      ? geometryContent.split(",")[1]
      : geometryContent;
    let decoded = "";
    try {
      decoded = atob(normalized);
    } catch {
      return null;
    }
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
  }, [geometryContent, geometryFormat, geometry?.name]);

  useEffect(() => {
    if (!isPlaying || timeSeriesData.length === 0) return;
    const interval = window.setInterval(() => {
      setPlayheadIndex((prev) =>
        prev >= timeSeriesData.length - 1 ? 0 : prev + 1
      );
    }, 800);
    return () => window.clearInterval(interval);
  }, [isPlaying, timeSeriesData.length]);

  const fieldData = useMemo(() => {
    const grid = 8;
    const layers = 6;
    const x: number[] = [];
    const y: number[] = [];
    const z: number[] = [];
    const value: number[] = [];
    const span = Math.max(maxStress - minStress, 1);
    for (let zi = 0; zi < layers; zi += 1) {
      const zPos = zi / (layers - 1);
      for (let yi = 0; yi < grid; yi += 1) {
        const yPos = yi / (grid - 1);
        for (let xi = 0; xi < grid; xi += 1) {
          const xPos = xi / (grid - 1);
          const wave =
            Math.sin((xPos + fieldSlice) * Math.PI * 2) * 0.4 +
            Math.cos((yPos + fieldSlice) * Math.PI * 1.5) * 0.3 +
            Math.sin((zPos + fieldSlice) * Math.PI * 1.2) * 0.3;
          const normalized = Math.min(Math.max(0.5 + wave * 0.5, 0), 1);
          x.push(xPos);
          y.push(yPos);
          z.push(zPos);
          value.push(minStress + span * normalized);
        }
      }
    }
    return { x, y, z, value };
  }, [minStress, maxStress, fieldSlice]);
  const fieldSpan = Math.max(maxStress - minStress, 1);
  const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
  const playbackInfluence =
    maxStress > 0 ? clamp01(activeStress / maxStress) : 0;
  const modulatedThreshold = clamp01(
    fieldThreshold * (0.7 + 0.6 * playbackInfluence)
  );
  const effectiveThreshold = modulatedThreshold;
  const fieldIsoMin = minStress + fieldSpan * effectiveThreshold;
  const fieldTrace =
    fieldViewMode === "isosurface"
      ? ({
          x: fieldData.x,
          y: fieldData.y,
          z: fieldData.z,
          value: fieldData.value,
          type: "isosurface",
          opacity: 0.7,
          colorscale: "Turbo",
          isomin: fieldIsoMin,
          isomax: maxStress,
          surface: { count: 4 },
        } as any)
      : ({
          x: fieldData.x,
          y: fieldData.y,
          z: fieldData.z,
          value: fieldData.value,
          type: "volume",
          opacity: fieldViewMode === "volume" ? 0.15 : 0.05,
          colorscale: "Turbo",
          isomin: fieldIsoMin,
          isomax: maxStress,
          surface: { count: fieldViewMode === "volume" ? 12 : 6 },
          caps: { x: { show: false }, y: { show: false }, z: { show: false } },
          slices:
            fieldViewMode === "slice"
              ? {
                  x: { show: sliceAxis === "x", locations: [fieldSlice] },
                  y: { show: sliceAxis === "y", locations: [fieldSlice] },
                  z: { show: sliceAxis === "z", locations: [fieldSlice] },
                }
              : undefined,
        } as any);
  const handleExportCsv = () => {
    if (!results) return;
    const bcSummary = boundaryConditions?.length
      ? boundaryConditions
          .map((condition) => {
            const label =
              condition.type === "fixed" ? "Fixed" : "Load";
            const magnitude =
              condition.type === "pressure"
                ? `${formatNumber(condition.magnitude ?? undefined)} ${condition.unit || "N"}`
                : "0";
            return `${label} ${formatFaceLabel(condition.face)} ${magnitude}`;
          })
          .join(" | ")
      : "";
    const meshRows = meshArtifacts.length
      ? meshArtifacts.map((mesh) => [
          mesh.name,
          mesh.format,
          mesh.nodeCount ?? "",
          mesh.elementCount ?? "",
        ])
      : [];
    const hotspotRows = Array.isArray(results?.hotspots)
      ? results.hotspots.map((hotspot: any) => [
          hotspot.type ?? "",
          hotspot.value ?? "",
          Array.isArray(hotspot.location)
            ? hotspot.location.join(",")
            : "",
        ])
      : [];
    const rows = [
      ["Simulation Name", simulation.name],
      ["Simulation ID", simulation.id],
      ["Material", material?.name || "Unknown"],
      ["Geometry", geometry?.name || "Unknown"],
      ["Test Type", simulation.type],
      ["Material Model", simulation.materialModel || "linear"],
      ["Yield Strength (MPa)", simulation.yieldStrength ?? ""],
      ["Hardening Modulus (MPa)", simulation.hardeningModulus ?? ""],
      ["Max Stress (MPa)", results.maxStress ?? ""],
      ["Min Stress (MPa)", results.minStress ?? ""],
      ["Avg Stress (MPa)", results.avgStress ?? ""],
      ["Stress Range (MPa)", results.stressRange ?? ""],
      ["Max Deformation (mm)", results.maxDeformation ?? ""],
      ["Max Strain", results.maxStrain ?? ""],
      ["Avg Strain", results.avgStrain ?? ""],
      ["Safety Factor", results.safetyFactor ?? ""],
      ["Boundary Conditions", bcSummary],
      ["Solver Source", solverSource],
      [],
      ["Stress-Strain Curve"],
      ["Strain", "Stress (MPa)"],
      ...stressStrainData.map((point) => [point.strain, point.stress]),
      [],
      ["Time (s)", "Stress (MPa)", "Displacement (mm)"],
      ...(results.timeSeriesData || []).map((point: any) => [
        point.time,
        point.stress,
        point.displacement,
      ]),
      [],
      ["Mesh Artifacts"],
      ["Name", "Format", "Nodes", "Elements"],
      ...meshRows,
      [],
      ["Hotspots"],
      ["Type", "Value", "Location"],
      ...hotspotRows,
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) =>
            typeof cell === "string" && cell.includes(",")
              ? `"${cell.replace(/"/g, '""')}"`
              : String(cell ?? "")
          )
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${simulation.name || "simulation"}-results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (!simulation || !results) return;
    const metricRows = metricsList
      .map(
        (metric) =>
          `<tr><td>${metric.label}</td><td style="text-align:right;">${metric.value}</td></tr>`
      )
      .join("");
    const bcRows = bcItems.length
      ? bcItems
          .map(
            (item) =>
              `<tr><td>${item.label}</td><td>${item.face}</td><td>${item.value}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="3" style="text-align:center;color:#6b7280;">None</td></tr>`;
    const html = `
      <html>
        <head>
          <title>${simulation.name || "Simulation"} - Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            h2 { margin: 24px 0 8px; font-size: 16px; color: #334155; }
            .meta { color: #64748b; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 6px; font-size: 12px; }
            th { text-align: left; color: #475569; font-weight: 600; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          </style>
        </head>
        <body>
          <h1>${simulation.name || "Simulation Report"}</h1>
          <div class="meta">Simulation #${simulation.id} • ${runDate}</div>
          <div class="grid" style="margin-top:16px;">
            <div class="card">
              <h2>Configuration</h2>
              <table>
                <tr><td>Material</td><td style="text-align:right;">${material?.name || "Unknown"}</td></tr>
                <tr><td>Geometry</td><td style="text-align:right;">${geometry?.name || "Unknown"}</td></tr>
                <tr><td>Test Type</td><td style="text-align:right;">${simulation.type}</td></tr>
                <tr><td>Material Model</td><td style="text-align:right;">${simulation.materialModel || "linear"}</td></tr>
              </table>
            </div>
            <div class="card">
              <h2>Key Metrics</h2>
              <table>${metricRows}</table>
            </div>
          </div>
          <div class="card" style="margin-top:16px;">
            <h2>Boundary Conditions</h2>
            <table>
              <tr><th>Type</th><th>Face</th><th>Value</th></tr>
              ${bcRows}
            </table>
          </div>
        </body>
      </html>
    `;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      toast({
        title: "Export failed",
        description: "Unable to open print window.",
        variant: "destructive",
      });
      document.body.removeChild(iframe);
      return;
    }
    frameWindow.document.open();
    frameWindow.document.write(html);
    frameWindow.document.close();
    frameWindow.focus();
    frameWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  const findMeshByFormat = (format: string) =>
    meshArtifacts.find(
      (mesh) => mesh.format.toLowerCase() === format.toLowerCase()
    );

  const handleExportMeshFormat = async (format: string) => {
    const mesh = findMeshByFormat(format);
    if (!mesh) {
      toast({
        title: "Export unavailable",
        description: `No ${format.toUpperCase()} artifact found for this simulation.`,
        variant: "destructive",
      });
      return;
    }
    await handleDownloadMesh(mesh.id, mesh.name, mesh.format);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/simulations/${simulation.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Simulation link copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy link. Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  const handleRerunUpdated = async () => {
    if (!simulation?.id) return;
    await updateSimulation({
      id: simulation.id,
      data: {
        run: true,
      },
    });
  };

  const buildMeshPreview = (xmlText: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "application/xml");
    const vertexNodes = Array.from(doc.getElementsByTagName("vertex"));
    const triangleNodes = Array.from(doc.getElementsByTagName("triangle"));
    const tetraNodes = Array.from(doc.getElementsByTagName("tetrahedron"));

    if (vertexNodes.length === 0) {
      throw new Error("Unsupported mesh format for preview.");
    }

    const x: number[] = [];
    const y: number[] = [];
    const z: number[] = [];
    vertexNodes.forEach((node) => {
      x.push(parseFloat(node.getAttribute("x") || "0"));
      y.push(parseFloat(node.getAttribute("y") || "0"));
      z.push(parseFloat(node.getAttribute("z") || "0"));
    });

    const i: number[] = [];
    const j: number[] = [];
    const k: number[] = [];

    if (triangleNodes.length > 0) {
      triangleNodes.forEach((node) => {
        i.push(Number(node.getAttribute("v0")));
        j.push(Number(node.getAttribute("v1")));
        k.push(Number(node.getAttribute("v2")));
      });
    } else if (tetraNodes.length > 0) {
      const faceMap = new Map<string, { a: number; b: number; c: number; count: number }>();
      const addFace = (a: number, b: number, c: number) => {
        const key = [a, b, c].sort((m, n) => m - n).join(",");
        const existing = faceMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          faceMap.set(key, { a, b, c, count: 1 });
        }
      };

      tetraNodes.forEach((node) => {
        const a = Number(node.getAttribute("v0"));
        const b = Number(node.getAttribute("v1"));
        const c = Number(node.getAttribute("v2"));
        const d = Number(node.getAttribute("v3"));
        addFace(a, b, c);
        addFace(a, b, d);
        addFace(a, c, d);
        addFace(b, c, d);
      });

      faceMap.forEach((face) => {
        if (face.count === 1) {
          i.push(face.a);
          j.push(face.b);
          k.push(face.c);
        }
      });
    } else {
      throw new Error("Unsupported mesh format for preview.");
    }

    if (i.length === 0) {
      throw new Error("Mesh preview has no surface faces.");
    }

    if (i.length > 50000) {
      throw new Error("Mesh preview too large to render in the browser.");
    }

    return { x, y, z, i, j, k };
  };

  const handlePreviewMesh = async (mesh: { id: number; name: string; format: string }) => {
    setIsLoadingMeshPreview(true);
    setMeshPreviewError(null);
    setMeshPreview(null);
    setMeshPreviewName(mesh.name);
    try {
      if (mesh.format.toLowerCase() !== "xml") {
        throw new Error("Preview available for XML mesh only.");
      }
      const response = await fetch(`/api/simulation-meshes/${mesh.id}/content`);
      if (!response.ok) throw new Error("Failed to load mesh content.");
      const data = await response.json();
      const decoded = atob(data.contentBase64 || "");
      const preview = buildMeshPreview(decoded);
      setMeshPreview(preview);
    } catch (err) {
      setMeshPreviewError(err instanceof Error ? err.message : "Unable to render mesh preview.");
    } finally {
      setIsLoadingMeshPreview(false);
    }
  };

  const handleDownloadMesh = async (meshId: number, name: string, format: string) => {
    try {
      const response = await fetch(`/api/simulation-meshes/${meshId}/content`);
      if (!response.ok) throw new Error("Failed to download mesh");
      const data = await response.json();
      const buffer = Uint8Array.from(atob(data.contentBase64 || ""), (c) => c.charCodeAt(0));
      const blob = new Blob([buffer], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name || "mesh"}.${format || "xdmf"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Unable to download mesh.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <div className="p-8">Loading simulation...</div>;
  if (!simulation) return <div className="p-8">Simulation not found</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        <Link
          href="/simulations"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to History
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display font-bold text-foreground">
                {simulation.name}
              </h1>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-1">
                #{simulation.id}
              </span>
              <div className="flex items-center gap-2">
                <StatusBadge status={simulation.status} />
                  {simulation.paramsDirty && (
                    <button
                      type="button"
                      onClick={handleRerunUpdated}
                      className="inline-flex items-center justify-center rounded-full p-1.5 text-indigo-500 hover:bg-indigo-500/10 hover:text-indigo-600 transition"
                    >
                      <span className="relative inline-flex items-center justify-center group">
                        <RefreshCcw className="h-4 w-4" />
                        <span className="pointer-events-none absolute bottom-full left-[65%] mb-3 w-max -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                          <span className="relative rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
                            Parameters updated. Click to re-run.
                            <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-900" />
                          </span>
                        </span>
                      </span>
                    </button>
                  )}
              </div>
              {/* {isCompleted && results && (
                <span className="text-xs font-semibold tracking-wider bg-muted text-muted-foreground border border-border rounded-full px-2 py-1">
                  {solverBadge}
                </span>
              )} */}
            </div>
            <p className="font-mono text-muted-foreground">
              Run on {runDate}
            </p>
          </div>
          {!isRunning && (
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="hover:bg-primary/10 hover:text-primary" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" onClick={handleExportCsv} className="hover:bg-primary/10 hover:text-primary">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={handleExportPdf} className="hover:bg-primary/10 hover:text-primary">
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          )}
        </div>
      </div>

      {isRunning && (
        <div className="bg-card p-8 rounded-2xl border border-border shadow-sm space-y-6">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
            <div>
              <h3 className="text-xl font-medium">Simulation in Progress</h3>
              <p className="text-muted-foreground mt-2 max-w-md">
                The finite element solver is currently calculating stresses and deformations.
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              {/* <span className="text-sm font-semibold">Analyisis Progress</span> */}
              <span
                className={`text-xs font-semibold px-4 py-1 rounded-full border ${
                  progressStage === "Meshing"
                    ? "text-slate-900 bg-slate-200 border-slate-300"
                    : progressStage === "Solving"
                    ? "text-blue-900 bg-blue-200 border-blue-300"
                    : "text-emerald-900 bg-emerald-200 border-emerald-300"
                }`}
              >
                {progressStage}
              </span>
              <span className="text-lg font-bold text-primary">
                {simulation.progress || 0}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <motion.div 
                className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${simulation.progress || 0}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      )}

      {isCompleted && results && (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Configuration
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfigDetails((prev) => !prev)}
                  className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition"
                  aria-label="Toggle configuration details"
                >
                  <ChevronLeft
                    className={`h-4 w-4 transition-transform ${showConfigDetails ? "rotate-90" : "-rotate-90"}`}
                  />
                </button>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Geometry
                  </div>
                  {geometry?.name && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-foreground">
                      {geometry.name}
                    </span>
                  )}
                </div>
                <div className="mt-3 h-36">
                  {geometryMesh ? (
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
                          color: "#3b82f6",
                          opacity: 0.7,
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
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Geometry preview unavailable.
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {primaryConfigItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-3"
                  >
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                        item.label === "Material"
                          ? "bg-sky-100 text-sky-700"
                          : item.label === "Test Type"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="font-semibold text-foreground">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {bcItems.length > 0 && (
                <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Boundary Conditions
                  </p>
                  {bcItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <span>{item.label}</span>
                      <span className="font-semibold text-foreground">
                        {item.face} {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div
                className={`grid transition-all duration-300 ease-out ${
                  showConfigDetails && secondaryConfigItems.length > 0
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
                style={{ marginTop: 0 }}
              >
                <div className={`space-y-3 overflow-hidden ${
                  showConfigDetails && secondaryConfigItems.length > 0
                    ? "mt-4"
                    : ""
                  }`}
                >
                  {secondaryConfigItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-xl bg-muted/20 px-4 py-3"
                    >
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                          item.label === "Young's Modulus"
                            ? "bg-amber-100 text-amber-700"
                            : item.label === "Applied Load"
                            ? "bg-rose-100 text-rose-700"
                            : item.label === "Temperature"
                            ? "bg-orange-100 text-orange-700"
                            : item.label === "Duration"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.label === "Frequency"
                            ? "bg-violet-100 text-violet-700"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="font-semibold text-foreground">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Mesh Outputs
                </div>
                {results?.source && (
                  <span className="text-[11px] font-semibold tracking-wider text-muted-foreground bg-muted/40 border border-border rounded-full px-2 py-1">
                    SOURCE: {results.source === "fenics" ? "FEniCS" : results.source}
                  </span>
                )}
              </div>
              {isLoadingMeshes ? (
                <p className="text-sm text-muted-foreground">Loading mesh files...</p>
              ) : meshError ? (
                <p className="text-sm text-destructive">{meshError}</p>
              ) : meshArtifacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No mesh artifacts saved yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.values(
                    meshArtifacts.reduce(
                      (acc, mesh) => {
                        const key = mesh.name;
                        if (!acc[key]) {
                          acc[key] = {
                            name: mesh.name,
                            nodeCount: mesh.nodeCount ?? null,
                            elementCount: mesh.elementCount ?? null,
                            formats: [],
                          };
                        }
                        acc[key].formats.push(mesh);
                        return acc;
                      },
                      {} as Record<
                        string,
                        {
                          name: string;
                          nodeCount: number | null;
                          elementCount: number | null;
                          formats: { id: number; name: string; format: string }[];
                        }
                      >
                    )
                  ).map((group) => (
                    <div
                      key={group.name}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {group.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Nodes: {" "} {group.nodeCount ?? "—"} <br/>
                          Elements: {" "} {group.elementCount ?? "—"} <br/>
                        </p>
                      </div>
                      <div className="flex flex-col flex-wrap items-center gap-2">
                        {group.formats.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground font-semibold hover:bg-primary/10 hover:text-primary"
                            onClick={() =>
                              handleDownloadMesh(item.id, item.name, item.format)
                            }
                          >
                            <Download className="h-3.5 w-3.5" />
                            {item.format.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    {isLoadingMeshPreview ? (
                      <p className="text-sm text-muted-foreground">Rendering mesh preview...</p>
                    ) : meshPreviewError ? (
                      <p className="text-sm text-destructive">{meshPreviewError}</p>
                    ) : meshPreview ? (
                      <div className="relative h-[240px]">
                        {meshPreviewName && (                          
                          <div className="flex items-center justify-between">
                            <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                              Preview
                            </div>
                            {geometry?.name && (
                              <span className="text-[9px] font-semibold uppercase tracking-wider text-foreground">
                                {meshPreviewName}
                              </span>
                            )}
                          </div>
                        )}
                        <Plot
                          data={[
                            {
                              type: "mesh3d",
                              x: meshPreview.x,
                              y: meshPreview.y,
                              z: meshPreview.z,
                              i: meshPreview.i,
                              j: meshPreview.j,
                              k: meshPreview.k,
                              color: "#22c55e",
                              opacity: 0.7,
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
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Select a mesh to preview.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Key Metrics
                </div>
                <button
                  type="button"
                  onClick={() => setShowMetricsDetails((prev) => !prev)}
                  className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition"
                  aria-label="Toggle metrics details"
                >
                  <ChevronLeft
                    className={`h-4 w-4 transition-transform ${showMetricsDetails ? "rotate-90" : "-rotate-90"}`}
                  />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {metricsList.slice(0, 4).map((metric) => (
                  <div key={metric.label} className={`${metric.bg} rounded-2xl p-4`}>
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>{metric.label}</span>
                      <span className="relative inline-flex items-center justify-center group">
                        <Info className="h-3.5 w-3.5 text-muted-foreground/70" />
                        <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 w-max -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                          <span className="relative rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
                            {metric.definition}
                            <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-900" />
                          </span>
                        </span>
                      </span>
                    </div>
                    <p className={`mt-3 text-lg font-bold ${metric.color}`}>
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  showMetricsDetails ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="grid grid-cols-2 gap-4">
                    {metricsList.slice(4).map((metric) => (
                      <div key={metric.label} className={`${metric.bg} rounded-2xl p-4`}>
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                          <span>{metric.label}</span>
                          <span
                            className="relative inline-flex items-center justify-center"
                            onMouseEnter={(event) =>
                              showInfoTooltip(event, metric.definition)
                            }
                            onMouseMove={(event) =>
                              showInfoTooltip(event, metric.definition)
                            }
                            onMouseLeave={hideInfoTooltip}
                          >
                            <Info className="h-3.5 w-3.5 text-muted-foreground/70" />
                          </span>
                        </div>
                        <p className={`mt-3 text-lg font-bold ${metric.color}`}>
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="stress-strain" className="space-y-6">
            <TabsList className="w-full justify-start bg-transparent">
              <TabsTrigger value="stress-strain">Stress-Strain Curve</TabsTrigger>
              <TabsTrigger value="stress-distribution">Time-Series Playback</TabsTrigger>
              <TabsTrigger value="field-viewer">3D Results Viewer</TabsTrigger>
              <TabsTrigger value="surface">3D Surface</TabsTrigger>
            </TabsList>

            <TabsContent value="stress-strain">
              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold font-display">
                      Stress vs. Strain Curve
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Real-time simulation output plotting mechanical response.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="hover:bg-primary/10 hover:text-primary"
                    onClick={() =>
                      exportChartSvg(
                        "stress-strain-chart",
                        `${simulation.name || "simulation"}-stress-strain.svg`
                      )
                    }
                  >
                    <Download className="h-4 w-4" />
                    Export Chart
                  </Button>
                </div>
                <div id="stress-strain-chart" className="h-[420px] mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stressStrainData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--muted-foreground))"
                        opacity={0.2}
                      />
                      <XAxis
                        dataKey="strain"
                        label={{
                          value: "Strain (e)",
                          position: "insideBottom",
                          offset: -5,
                        }}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        label={{
                          value: "Stress (MPa)",
                          angle: -90,
                          position: "insideLeft",
                        }}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="stress"
                        name="Stress Response"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stress-distribution" className="space-y-6">
              <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Time-Series Playback</h3>
                    <p className="text-sm text-muted-foreground">
                      Scrub through the run to inspect stress and displacement at any moment.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="hover:bg-primary/10 hover:text-primary"
                      onClick={() =>
                        setPlayheadIndex((prev) => Math.max(prev - 1, 0))
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="hover:bg-primary/10 hover:text-primary"
                      onClick={() => setIsPlaying((prev) => !prev)}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="hover:bg-primary/10 hover:text-primary"
                      onClick={() =>
                        setPlayheadIndex((prev) =>
                          Math.min(prev + 1, Math.max(timeSeriesData.length - 1, 0))
                        )
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                  <div className="flex-1 space-y-5">
                    <div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Playback</span>
                        <span>{formatTimeTick(Number(activeTime))} s</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(timeSeriesData.length - 1, 0)}
                        value={playheadIndex}
                        onChange={(event) => setPlayheadIndex(Number(event.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Switch
                        checked={overlayDisplacement}
                        onCheckedChange={setOverlayDisplacement}
                      />
                      <span className="text-muted-foreground">
                        Overlay displacement on stress chart
                      </span>
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded-2xl px-6 py-4 min-w-[240px]">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Live Snapshot
                    </p>
                    <div className="mt-3 space-y-1 text-sm">
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Time</span>
                        <span className="font-semibold">{formatTimeTick(Number(activeTime))} s</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Stress</span>
                        <span className="font-semibold">{formatNumber(activeStress)} MPa</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Displacement</span>
                        <span className="font-semibold">{formatNumber(activeDisplacement)} mm</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" />
                    Stress Over Time
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="hover:bg-primary/10 hover:text-primary"
                    onClick={() =>
                      exportChartSvg(
                        "stress-time-chart",
                        `${simulation.name || "simulation"}-stress-time.svg`
                      )
                    }
                  >
                    <Download className="h-4 w-4" />
                    Export Chart
                  </Button>
                </div>
                <div id="stress-time-chart" className="mt-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={timeSeriesData}
                      onMouseMove={handleChartHover}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="time"
                        label={{ value: "Time (s)", position: "insideBottomRight", offset: -5 }}
                        ticks={timeTicks}
                        interval={0}
                        allowDecimals={timeTickStep === 0.5}
                        domain={[0, timeTickMax]}
                        tickFormatter={(value) => formatTimeTick(Number(value))}
                      />
                      <YAxis
                        label={{ value: "Stress (MPa)", angle: -90, position: "insideLeft" }}
                      />
                      {overlayDisplacement && (
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          label={{
                            value: "Displacement (mm)",
                            angle: 90,
                            position: "insideRight",
                          }}
                        />
                      )}
                      <Tooltip labelFormatter={(value) => `Time: ${formatTimeTick(Number(value))} s`} />
                      <ReferenceLine
                        x={activeTime}
                        stroke="hsl(var(--primary))"
                        strokeDasharray="4 4"
                      />
                      <Line
                        type="monotone"
                        dataKey="stress"
                        stroke="#3b82f6"
                        name="Stress"
                        strokeWidth={2}
                        dot={false}
                      />
                      {overlayDisplacement && (
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="displacement"
                          stroke="#8b5cf6"
                          name="Displacement"
                          strokeWidth={2}
                          dot={false}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {!overlayDisplacement && (
                <div className="bg-card rounded-2xl border border-border p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <BarChart2 className="h-4 w-4" />
                      Displacement Over Time
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="hover:bg-primary/10 hover:text-primary"
                      onClick={() =>
                        exportChartSvg(
                          "displacement-time-chart",
                          `${simulation.name || "simulation"}-displacement-time.svg`
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
                      Export Chart
                    </Button>
                  </div>
                  <div id="displacement-time-chart" className="mt-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart
                        data={timeSeriesData}
                        onMouseMove={handleChartHover}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                          dataKey="time"
                          label={{ value: "Time (s)", position: "insideBottomRight", offset: -5 }}
                          ticks={timeTicks}
                          interval={0}
                          allowDecimals={timeTickStep === 0.5}
                          domain={[0, timeTickMax]}
                          tickFormatter={(value) => formatTimeTick(Number(value))}
                        />
                        <YAxis label={{ value: "Displacement (mm)", angle: -90, position: "insideLeft" }} />
                        <Tooltip labelFormatter={(value) => `Time: ${formatTimeTick(Number(value))} s`} />
                        <ReferenceLine
                          x={activeTime}
                          stroke="#8b5cf6"
                          strokeDasharray="4 4"
                        />
                        <Area
                          type="monotone"
                          dataKey="displacement"
                          fill="#8b5cf6"
                          stroke="#8b5cf6"
                          name="Displacement"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="field-viewer">
              <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">3D Results Viewer</h3>
                    <p className="text-sm text-muted-foreground">
                      Inspect iso-surfaces or take planar slices through the stress field.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleExportField}>
                    <Download className="h-4 w-4" />
                    Export View
                  </Button>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
                  <div className="rounded-2xl border border-border bg-muted/20 px-5 py-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">
                            Playback
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {formatTimeTick(Number(activeTime))} s
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:bg-primary/10 hover:text-primary"
                          onClick={() =>
                            setPlayheadIndex((prev) => Math.max(prev - 1, 0))
                          }
                          disabled={timeSeriesData.length === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:bg-primary/10 hover:text-primary"
                          onClick={() => setIsPlaying((prev) => !prev)}
                          disabled={timeSeriesData.length === 0}
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:bg-primary/10 hover:text-primary"
                          onClick={() =>
                            setPlayheadIndex((prev) =>
                              Math.min(prev + 1, Math.max(timeSeriesData.length - 1, 0))
                            )
                          }
                          disabled={timeSeriesData.length === 0}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(timeSeriesData.length - 1, 0)}
                      value={playheadIndex}
                      onChange={(event) => setPlayheadIndex(Number(event.target.value))}
                      className="w-full accent-primary"
                      disabled={timeSeriesData.length === 0}
                    />
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Intensity Threshold</span>
                        <span>{Math.round(fieldThreshold * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={0.9}
                        step={0.05}
                        value={fieldThreshold}
                        onChange={(event) => setFieldThreshold(Number(event.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/10 px-5 py-4 space-y-4">
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">View Mode</div>
                    <div className="relative">
                      <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 pr-10 text-sm text-foreground ring-offset-background shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none"
                        value={fieldViewMode}
                        onChange={(event) =>
                          setFieldViewMode(
                            event.target.value as "isosurface" | "slice" | "volume"
                          )
                        }
                      >
                        <option value="isosurface">Iso-surface</option>
                        <option value="slice">Slice</option>
                        <option value="volume">Volume</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">Slice Axis</div>
                    <div className="relative">
                      <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 pr-10 text-sm text-foreground ring-offset-background shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none disabled:cursor-not-allowed disabled:opacity-50"
                        value={sliceAxis}
                        onChange={(event) =>
                          setSliceAxis(event.target.value as "x" | "y" | "z")
                        }
                        disabled={fieldViewMode !== "slice"}
                      >
                        <option value="x">X axis</option>
                        <option value="y">Y axis</option>
                        <option value="z">Z axis</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                    </div>
                  </div>
                </div>
                <Plot
                  data={[fieldTrace]}
                  onInitialized={(_, graphDiv) => {
                    plotRef.current = graphDiv;
                  }}
                  onUpdate={(_, graphDiv) => {
                    plotRef.current = graphDiv;
                  }}
                  layout={{
                    title:
                      fieldViewMode === "isosurface"
                        ? "Stress Iso-surface"
                        : fieldViewMode === "slice"
                        ? "Stress Slice"
                        : "Stress Volume",
                    scene: {
                      xaxis: { title: "X" },
                      yaxis: { title: "Y" },
                      zaxis: { title: "Z" },
                    },
                    autosize: true,
                    height: 460,
                    paper_bgcolor: "transparent",
                    plot_bgcolor: "transparent",
                    font: { color: "var(--foreground)" },
                  }}
                  config={{ responsive: true }}
                  style={{ width: "100%" }}
                  // config={{ displayModeBar: false }}
                />
              </div>
            </TabsContent>
            <TabsContent value="surface">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="text-lg font-semibold">3D Stress-Displacement Surface</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Shows stress and displacement trends across time on a single surface.
                </p>
                <Plot
                  data={[
                    {
                      x: timeSeriesData.map((d) => d.time),
                      y: [0, 1],
                      z: [
                        timeSeriesData.map((d) => d.stress),
                        timeSeriesData.map((d) => d.displacement * 100),
                      ],
                      type: "surface",
                      colorscale: "Viridis",
                    } as any,
                  ]}
                  layout={{
                    title: "3D Analysis Surface",
                    scene: {
                      xaxis: {
                        title: "Time (s)",
                        tickformat: timeTickStep === 0.5 ? ".1f" : ".0f",
                        dtick: timeTickStep,
                      },
                      yaxis: { title: "Type" },
                      zaxis: { title: "Value" },
                    },
                    autosize: true,
                    height: 450,
                    paper_bgcolor: "transparent",
                    plot_bgcolor: "transparent",
                    font: { color: "var(--foreground)" },
                  }}
                  style={{ width: "100%" }}
                  // config={{ displayModeBar: false }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {infoTooltip?.visible && (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            left: infoTooltip.x,
            top: infoTooltip.y,
            transform: "translate(-50%, calc(-100% - 36px))",
          }}
        >
          <div className="relative rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
            {infoTooltip.text}
            <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-900" />
          </div>
        </div>
      )}

      {simulation.status === "failed" && (
        <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-2xl flex items-center gap-4 text-destructive">
          <AlertCircle className="h-6 w-6" />
          <div>
            <h3 className="font-semibold">Simulation Failed</h3>
            <p className="text-sm opacity-90">
              The solver encountered a divergence error. Please check your
              boundary conditions and try again.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
