import { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";

type GeometryPreviewProps = {
  geometryId?: number;
  format: string;
  contentBase64?: string | null;
  refreshToken?: string;
};

export function GeometryPreview({
  geometryId,
  format,
  contentBase64,
  refreshToken,
}: GeometryPreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (contentBase64) {
      setContent(contentBase64);
      setError(null);
      setIsLoading(false);
      return;
    }
    if (!geometryId || format.toLowerCase() !== "stl") {
      setContent(null);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    fetch(`/api/geometries/${geometryId}/content`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load geometry");
        return res.json();
      })
      .then((data) => {
        setContent(data.contentBase64 || null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load geometry");
        setContent(null);
      })
      .finally(() => setIsLoading(false));
  }, [geometryId, format, contentBase64, refreshToken]);

  const mesh = useMemo(() => {
    if (!content) return null;
    const normalized = content.includes(",") ? content.split(",")[1] : content;
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
  }, [content]);

  if (format.toLowerCase() !== "stl") {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        Preview available for STL only.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading preview...</p>
      ) : error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : mesh ? (
        <div className="h-[140px]">
          <Plot
            data={[
              {
                type: "mesh3d",
                x: mesh.x,
                y: mesh.y,
                z: mesh.z,
                i: mesh.i,
                j: mesh.j,
                k: mesh.k,
                color: "#60a5fa",
                opacity: 0.7,
              } as any,
            ]}
            layout={{
              margin: { l: 0, r: 0, t: 0, b: 0 },
              paper_bgcolor: "rgba(0,0,0,0)",
              plot_bgcolor: "rgba(0,0,0,0)",
              scene: {
                xaxis: { visible: false },
                yaxis: { visible: false },
                zaxis: { visible: false },
                aspectmode: "data",
              },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Preview unavailable for this file.
        </p>
      )}
    </div>
  );
}
