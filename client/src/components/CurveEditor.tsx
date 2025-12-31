import { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MinusCircle, PlusCircle } from "lucide-react";

export type CurvePoint = { x: number; y: number };

type CurveEditorProps = {
  title: string;
  description?: string;
  xLabel: string;
  yLabel: string;
  xKey: string;
  yKey: string;
  points: CurvePoint[];
  onChange: (points: CurvePoint[]) => void;
  onValidityChange?: (isValid: boolean) => void;
};

const sanitizePoints = (points: CurvePoint[]) => {
  const cleaned = points
    .map((point) => ({ x: Number(point.x), y: Number(point.y) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .sort((a, b) => a.x - b.x);
  return cleaned;
};

const pointsToJson = (points: CurvePoint[], xKey: string, yKey: string) =>
  JSON.stringify(
    points.map((point) => ({ [xKey]: point.x, [yKey]: point.y })),
    null,
    2
  );

const pointsToCsv = (points: CurvePoint[], xKey: string, yKey: string) => {
  const rows = points.map((point) => `${point.x},${point.y}`);
  return [`${xKey},${yKey}`, ...rows].join("\n");
};

const parseJsonPoints = (value: string, xKey: string, yKey: string) => {
  const parsed = JSON.parse(value) as Record<string, unknown>[];
  if (!Array.isArray(parsed)) {
    throw new Error("JSON must be an array of points.");
  }
  return parsed.map((entry) => ({
    x: Number(entry?.[xKey]),
    y: Number(entry?.[yKey]),
  }));
};

const parseCsvPoints = (value: string) => {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error("CSV requires a header row and at least one data row.");
  }
  const rows = lines.slice(1);
  return rows.map((row) => {
    const [xRaw, yRaw] = row.split(",").map((cell) => cell.trim());
    return { x: Number(xRaw), y: Number(yRaw) };
  });
};

export function CurveEditor({
  title,
  description,
  xLabel,
  yLabel,
  xKey,
  yKey,
  points,
  onChange,
  onValidityChange,
}: CurveEditorProps) {
  const [activeTab, setActiveTab] = useState("table");
  const [jsonText, setJsonText] = useState(pointsToJson(points, xKey, yKey));
  const [csvText, setCsvText] = useState(pointsToCsv(points, xKey, yKey));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== "json") {
      setJsonText(pointsToJson(points, xKey, yKey));
    }
    if (activeTab !== "csv") {
      setCsvText(pointsToCsv(points, xKey, yKey));
    }
  }, [points, xKey, yKey, activeTab]);

  useEffect(() => {
    onValidityChange?.(error === null && points.length >= 2);
  }, [error, onValidityChange, points.length]);

  const chartData = useMemo(() => {
    const sorted = sanitizePoints(points);
    return {
      x: sorted.map((point) => point.x),
      y: sorted.map((point) => point.y),
    };
  }, [points]);

  const handleApplyJson = () => {
    try {
      const parsed = parseJsonPoints(jsonText, xKey, yKey);
      const next = sanitizePoints(parsed);
      if (next.length < 2) throw new Error("Provide at least two points.");
      setError(null);
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON.");
    }
  };

  const handleApplyCsv = () => {
    try {
      const parsed = parseCsvPoints(csvText);
      const next = sanitizePoints(parsed);
      if (next.length < 2) throw new Error("Provide at least two points.");
      setError(null);
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid CSV.");
    }
  };

  const handleTableChange = (index: number, key: "x" | "y", value: string) => {
    const next = sortedPoints.map((point, idx) =>
      idx === index ? { ...point, [key]: Number(value) } : point
    );
    setError(null);
    onChange(sanitizePoints(next));
  };

  const handleAddRow = () => {
    const last = sortedPoints[sortedPoints.length - 1];
    const xStep = xKey === "strain" ? 0.001 : 1;
    const yStep = yKey === "stress" ? 50 : 1;
    const nextPoint = last
      ? { x: Number((last.x + xStep).toFixed(6)), y: Number((last.y + yStep).toFixed(6)) }
      : { x: 0, y: 0 };
    const next = [...sortedPoints, nextPoint];
    setError(null);
    onChange(sanitizePoints(next));
  };

  const handleRemoveRow = (index: number) => {
    const next = sortedPoints.filter((_, idx) => idx !== index);
    setError(null);
    onChange(sanitizePoints(next));
  };

  const sortedPoints = useMemo(() => sanitizePoints(points), [points]);
  const xStepAttr = xKey === "strain" ? "0.001" : "1";
  const yStepAttr = yKey === "stress" ? "50" : "1";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-6">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-3">
            <TabsList className="grid w-full max-w-[300px] grid-cols-3 p-0 px-1.5 bg-border rounded-lg">
              <TabsTrigger value="table" className="text-xs">Table</TabsTrigger>
              <TabsTrigger value="csv" className="text-xs">CSV</TabsTrigger>
              <TabsTrigger value="json" className="text-xs">JSON</TabsTrigger>
            </TabsList>
            {activeTab === "table" && (
              <Button
                type="button"
                variant="ghost"
                className="h-8 w-8 rounded-full text-primary hover:text-primary hover:bg-primary/10"
                onClick={handleAddRow}
                aria-label="Add Row"
              >
                <PlusCircle className="!h-4 !w-4" />
              </Button>
            )}
            {activeTab === "csv" && (
              <Button type="button" variant="outline" onClick={handleApplyCsv}
                className="text-xs px-3 py-1.5 !h-auto !min-h-0 hover:text-primary hover:bg-primary/10"  
              >
                Apply
              </Button>
            )}
            {activeTab === "json" && (
              <Button type="button" variant="outline" onClick={handleApplyJson}
                className="text-xs px-3 py-1.5 !h-auto !min-h-0 hover:text-primary hover:bg-primary/10"  
              >
                Apply
              </Button>
            )}
          </div>

          <TabsContent value="table" className="space-y-3">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-semibold text-muted-foreground">
              <span>{xLabel}</span>
              <span>{yLabel}</span>
              <span className="opacity-0 ppointer-events-none z-[-1]">XXXX</span>
            </div>
            <div className="h-[132px] space-y-2 overflow-y-auto">
              {sortedPoints.map((point, index) => (
                <div key={`${point.x}-${point.y}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    type="number"
                    step={xStepAttr}
                    value={point.x}
                    onChange={(event) => handleTableChange(index, "x", event.target.value)}
                    className="!text-xs !px-1.5 !py-0"
                  />
                  <Input
                    type="number"
                    step={yStepAttr}
                    value={point.y}
                    onChange={(event) => handleTableChange(index, "y", event.target.value)}
                    className="!text-xs !px-1.5 !py-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 w-7 rounded-full text-red-500 hover:text-red-500 hover:bg-red-500/10"
                    onClick={() => handleRemoveRow(index)}
                    aria-label="Remove boundary condition"
                  >
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="csv" className="space-y-3">
            <Textarea
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              className="min-h-[160px] !text-xs"
            />
          </TabsContent>

          <TabsContent value="json" className="space-y-3">
            <Textarea
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              className="min-h-[160px] !text-xs"
            />
          </TabsContent>
        </Tabs>
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground mb-2">Preview</p>
        <div className="h-[200px]">
          <Plot
            data={[
              {
                type: "scatter",
                mode: "lines+markers",
                x: chartData.x,
                y: chartData.y,
                line: { color: "#2563eb" },
                marker: { color: "#60a5fa", size: 8 },
                hoverinfo: "x+y",
              } as any,
            ]}
            layout={{
              margin: { l: 30, r: 10, t: 10, b: 30 },
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              xaxis: {
                title: { text: xLabel, font: { size: 10 }, standoff: 6 },
                ticks: "outside",
                automargin: true,
              },
              yaxis: {
                title: { text: yLabel, font: { size: 10 }, standoff: 6 },
                ticks: "outside",
                automargin: true,
              },
              showlegend: false,
            }}
            style={{ width: "100%", height: "100%" }}
            config={{ displayModeBar: false, displaylogo: false }}
          />
        </div>
      </div>
    </div>
  );
}
