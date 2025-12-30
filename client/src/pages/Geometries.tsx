import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useGeometries, useCreateGeometry, useUpdateGeometry, useDeleteGeometry } from "@/hooks/use-geometries";
import { useToast } from "@/hooks/use-toast";
import { Search, Pencil, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Plot from "react-plotly.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAssistantContext } from "@/context/assistant-context";

type GeometryFormState = {
  name: string;
  file: File | null;
};

type GeometryPreviewProps = {
  geometryId?: number;
  format: string;
  contentBase64?: string | null;
  refreshToken?: string;
};

function GeometryPreview({
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
      ) : (
        <p className="text-xs text-muted-foreground">Preview unavailable.</p>
      )}
    </div>
  );
}

export default function Geometries() {
  const formatSize = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1000) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1000) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
  };

  const { data: geometries, isLoading } = useGeometries();
  const { mutateAsync: createGeometry, isPending: isCreating } = useCreateGeometry();
  const { mutateAsync: updateGeometry, isPending: isUpdating } = useUpdateGeometry();
  const { mutateAsync: deleteGeometry, isPending: isDeleting } = useDeleteGeometry();
  const { toast } = useToast();
  const { setContext } = useAssistantContext();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [activeGeometryId, setActiveGeometryId] = useState<number | null>(null);
  const [formState, setFormState] = useState<GeometryFormState>({
    name: "",
    file: null,
  });
  const [createPreview, setCreatePreview] = useState<string | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const contextKeyRef = useRef("");

  const filteredGeometries = useMemo(
    () =>
      geometries?.filter((geometry) =>
        geometry.name.toLowerCase().includes(search.toLowerCase())
      ) ?? [],
    [geometries, search]
  );

  const assistantSample = useMemo(
    () =>
      filteredGeometries.slice(0, 8).map((geometry) => ({
        id: geometry.id,
        name: geometry.name,
        format: geometry.format,
        sizeBytes: geometry.sizeBytes,
      })),
    [filteredGeometries]
  );

  const assistantContext = useMemo(
    () => ({
      pageSummary:
        "Manage geometry assets, preview STL shapes, and upload new geometry files for simulations.",
      sections: ["Geometry Cards", "STL Preview", "Upload Geometry"],
      actions: ["Search geometries", "Add geometry", "Edit geometry", "Delete geometry"],
      search,
      totalCount: geometries?.length ?? 0,
      filteredCount: filteredGeometries.length,
      sample: assistantSample,
    }),
    [assistantSample, filteredGeometries.length, geometries?.length, search]
  );

  const assistantContextKey = useMemo(
    () =>
      JSON.stringify({
        search,
        totalCount: geometries?.length ?? 0,
        filteredCount: filteredGeometries.length,
        ids: assistantSample.map((item) => item.id),
      }),
    [assistantSample, filteredGeometries.length, geometries?.length, search]
  );

  useEffect(() => {
    if (contextKeyRef.current === assistantContextKey) return;
    contextKeyRef.current = assistantContextKey;
    setContext("geometries", assistantContext);
  }, [assistantContext, assistantContextKey, setContext]);

  const activeGeometry = useMemo(
    () => geometries?.find((geometry) => geometry.id === activeGeometryId) || null,
    [geometries, activeGeometryId]
  );

  const formatFileLabel = (name?: string | null) => {
    if (!name) return "No file chosen";
    if (name.length <= 30) return name;
    const parts = name.split(".");
    const ext = parts.length > 1 ? `.${parts.pop()}` : "";
    const base = parts.join(".") || name;
    const prefix = base.slice(0, 30);
    return `${prefix}...${ext || ""}`;
  };

  const truncateName = (value: string | undefined, max = 30) => {
    if (!value) { return value };
    return value.length > max ? `${value.slice(0, max)}...` : value;
  }

  const truncateFileName = (name: string, max = 30) => {
    if (name.length <= max) return name;
    const parts = name.split(".");
    const ext = parts.length > 1 ? parts.pop() : "";
    const base = parts.join(".") || name;
    const prefixLength = Math.max(3, max - (ext ? ext.length + 2 : 3));
    const prefix = base.slice(0, prefixLength);
    return `${prefix}..${ext || ""}`;
  };

  const resetForm = () => {
    setFormState({ name: "", file: null });
    setActiveGeometryId(null);
    setCreatePreview(null);
    setEditPreview(null);
  };

  useEffect(() => {
    if (!isCreateOpen || !formState.file) {
      setCreatePreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCreatePreview(String(reader.result || ""));
    reader.onerror = () => setCreatePreview(null);
    reader.readAsDataURL(formState.file);
  }, [formState.file, isCreateOpen]);

  useEffect(() => {
    if (!isEditOpen || !formState.file) {
      setEditPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEditPreview(String(reader.result || ""));
    reader.onerror = () => setEditPreview(null);
    reader.readAsDataURL(formState.file);
  }, [formState.file, isEditOpen]);

  const handleCreate = async () => {
    if (!formState.name || !formState.file) return;
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(formState.file as File);
    });
    const format = formState.file.name.split(".").pop() || "stl";
    try {
      await createGeometry({
        name: formState.name,
        originalName: formState.file.name,
        format,
        contentBase64: base64,
      });
      toast({ 
        title: "Geometry created",
        description: (
          <span>
            <span className="font-medium text-foreground italic" title={formState.name}>
              {truncateName(formState.name, 25)}
            </span>{" "}
            added to the library.
          </span>
        ), 
      });
      resetForm();
      setIsCreateOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create geometry.";
      toast({ title: "Creation failed", description: message, variant: "destructive" });
    }
  };

  const handleOpenEdit = (geometry: typeof geometries[number]) => {
    setActiveGeometryId(geometry.id);
    setFormState({ name: geometry.name, file: null });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!activeGeometryId || !formState.name) return;
    try {
      if (formState.file) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(formState.file as File);
        });
        const format = formState.file.name.split(".").pop() || "stl";
        await updateGeometry({
          id: activeGeometryId,
          data: {
            name: formState.name,
            originalName: formState.file.name,
            format,
            contentBase64: base64,
          },
        });
      } else {
        await updateGeometry({
          id: activeGeometryId,
          data: { name: formState.name },
        });
      }
      toast({ 
        title: "Geometry updated",
        description: (
          <span>
            <span className="font-medium text-foreground italic" title={formState.name}>
              {truncateName(formState.name, 25)}
            </span>{" "}
            saved successfully.
          </span>
        ), 
      });
      setIsEditOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update geometry.";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    }
  };

  const handleDelete = (geometryId: number, name: string) => {
    setDeleteTarget({ id: geometryId, name });
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGeometry(deleteTarget.id);
      toast({
        title: "Geometry deleted",
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
      const message = error instanceof Error ? error.message : "Failed to delete geometry.";
      toast({ title: "Delete failed", description: message, variant: "destructive" });
    } finally {
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Geometry Library</h1>
          <p className="text-muted-foreground mt-1">Manage geometry files used in simulations.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search geometries..."
            className="pl-9 bg-card"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="h-44 bg-muted/20 animate-pulse rounded-2xl border border-border" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGeometries?.map((geometry, i) => (
            <motion.div
              key={geometry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card hover:bg-muted/30 border border-border hover:border-primary/40 rounded-2xl p-6 shadow-sm transition-all duration-300 h-full flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="px-2.5 py-1 rounded-md bg-secondary text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
                  {geometry.format.toUpperCase()}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-lg p-2 m-[-8px] mr-2 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 transition"
                    onClick={() => handleOpenEdit(geometry)}
                    aria-label={`Edit ${geometry.name}`}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 m-[-8px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                    onClick={() => handleDelete(geometry.id, geometry.name)}
                    aria-label={`Delete ${geometry.name}`}
                    disabled={isDeleting}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h3
                className="text-xl font-bold font-display text-foreground mb-2 truncate"
                title={geometry.name}
              >
                {truncateName(geometry.name)}
              </h3>
              <p
                className="text-sm text-muted-foreground mb-6 flex-1"
                title={geometry.originalName}
              >
                {truncateFileName(geometry.originalName)}
              </p>
              <GeometryPreview
                geometryId={geometry.id}
                format={geometry.format}
                refreshToken={`${geometry.originalName}-${geometry.sizeBytes}`}
              />

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                <div>
                  <span className="block text-xs text-muted-foreground">Size</span>
                  <span className="font-mono font-medium text-foreground">
                    {formatSize(geometry.sizeBytes)}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground">Created</span>
                  <span className="font-mono font-medium text-foreground">
                    {geometry.createdAt
                      ? new Date(geometry.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
          <motion.button
            type="button"
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="bg-card hover:bg-muted/30 border border-dashed border-border hover:border-primary/40 rounded-2xl p-6 shadow-sm transition-all duration-300 group h-full flex flex-col items-center justify-center text-muted-foreground hover:text-primary"
          >
            <div className="h-14 w-14 rounded-full border border-border/60 flex items-center justify-center group-hover:border-primary/60">
              <Plus className="h-7 w-7" />
            </div>
            <span className="mt-3 text-sm font-semibold">Add new geometry</span>
          </motion.button>
          {filteredGeometries?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No geometries found matching your search.
            </div>
          )}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Geometry</DialogTitle>
            <DialogDescription>Upload a STEP/STL geometry file.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Geometry Name</Label>
              <Input
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Geometry File (STEP/STL)</Label>
              <div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm">
                <input
                  id="geometry-create-file"
                  type="file"
                  accept=".stp,.step,.stl"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setFormState((prev) => ({
                      ...prev,
                      file,
                      name:
                        file && prev.name.trim() === ""
                          ? file.name.replace(/\.[^/.]+$/, "")
                          : prev.name,
                    }));
                  }}
                />
                <Label
                  htmlFor="geometry-create-file"
                  className="cursor-pointer rounded-md border border-input bg-muted/40 px-3 py-1 text-xs font-semibold text-foreground shadow-sm hover:bg-muted"
                >
                  Choose File
                </Label>
                <span
                  className="text-xs text-muted-foreground"
                  title={formState.file?.name || "No file chosen"}
                >
                  {formatFileLabel(formState.file?.name)}
                </span>
              </div>
            </div>
            <GeometryPreview
              format={formState.file?.name.split(".").pop() || "stl"}
              contentBase64={createPreview}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleCreate}
                disabled={isCreating || !formState.name || !formState.file}
              >
                {isCreating ? "Saving..." : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Geometry</DialogTitle>
            <DialogDescription>Rename or replace the geometry file.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Geometry Name</Label>
              <Input
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Replace File (optional)</Label>
              <div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm">
                <input
                  id="geometry-edit-file"
                  type="file"
                  accept=".stp,.step,.stl"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setFormState((prev) => ({
                      ...prev,
                      file,
                      name:
                        file && prev.name.trim() === ""
                          ? file.name.replace(/\.[^/.]+$/, "")
                          : prev.name,
                    }));
                  }}
                />
                <Label
                  htmlFor="geometry-edit-file"
                  className="cursor-pointer rounded-md border border-input bg-muted/40 px-3 py-1 text-xs font-semibold text-foreground shadow-sm hover:bg-muted"
                >
                  Choose File
                </Label>
                <span
                  className="text-xs text-muted-foreground"
                  title={formState.file?.name || activeGeometry?.originalName || "No file chosen"}
                >
                  {formatFileLabel(formState.file?.name || activeGeometry?.originalName)}
                </span>
              </div>
            </div>
            {activeGeometry && (
              <GeometryPreview
                geometryId={activeGeometry.id}
                format={formState.file?.name.split(".").pop() || activeGeometry.format}
                contentBase64={editPreview}
              />
            )}
            <div className="flex justify-end">
              <Button
                onClick={handleUpdate}
                disabled={
                  isUpdating ||
                  !formState.name ||
                  !activeGeometry ||
                  (formState.name.trim() === activeGeometry?.name &&
                    !formState.file)
                }
                className="opacity-90 hover:opacity-100 disabled:pointer-events-auto disabled:hover:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete geometry?</DialogTitle>
            <DialogDescription className="text-foreground pt-4">
              This will permanently remove{" "}
              <span className="font-semibold text-foreground" title={deleteTarget?.name || ""}>
                {truncateName(deleteTarget?.name, 25) || "this geometry"}
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
              disabled={!deleteTarget || isDeleting}
              className="opacity-90 hover:opacity-100 disabled:hover:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
