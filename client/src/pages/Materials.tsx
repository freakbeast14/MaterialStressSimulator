import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useMaterials, useUpdateMaterial, useDeleteMaterial } from "@/hooks/use-materials";
import { useCreateMaterial } from "@/hooks/use-materials";
import { useToast } from "@/hooks/use-toast";
import { Search, ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Compare from "@/pages/Compare";

export default function Materials() {
  const truncateName = (value: string | undefined, max = 30) => {
    if (!value) { return value };
    return value.length > max ? `${value.slice(0, max)}...` : value;
  }

  const { data: materials, isLoading } = useMaterials();
  const { mutateAsync: createMaterial, isPending } = useCreateMaterial();
  const { mutateAsync: updateMaterial, isPending: isUpdating } = useUpdateMaterial();
  const { mutateAsync: deleteMaterial, isPending: isDeleting } = useDeleteMaterial();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [activeMaterialId, setActiveMaterialId] = useState<number | null>(null);
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

  const filteredMaterials = materials?.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const activeMaterial = useMemo(
    () => materials?.find((material) => material.id === activeMaterialId) || null,
    [materials, activeMaterialId]
  );

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

  const hasMaterialChanges = useMemo(() => {
    if (!activeMaterial) return false;
    const parseSafe = (value: string) => {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    };
    const normalizeNumber = (value: string | number | null | undefined) => {
      const num = typeof value === "string" ? Number(value) : value ?? null;
      return Number.isFinite(num as number) ? num : null;
    };
    const draft = {
      name: name.trim(),
      category,
      description,
      density: normalizeNumber(density),
      youngsModulus: normalizeNumber(youngsModulus),
      poissonRatio: normalizeNumber(poissonRatio),
      thermalConductivity: normalizeNumber(thermalConductivity),
      meltingPoint: normalizeNumber(meltingPoint),
      stressStrainCurve: parseSafe(stressStrainCurve),
      thermalExpansionCurve: parseSafe(thermalExpansionCurve),
    };
    const baseline = {
      name: activeMaterial.name,
      category: activeMaterial.category,
      description: activeMaterial.description,
      density: normalizeNumber(activeMaterial.density),
      youngsModulus: normalizeNumber(activeMaterial.youngsModulus),
      poissonRatio: normalizeNumber(activeMaterial.poissonRatio),
      thermalConductivity: normalizeNumber(activeMaterial.thermalConductivity),
      meltingPoint: normalizeNumber(activeMaterial.meltingPoint),
      stressStrainCurve: activeMaterial.stressStrainCurve ?? [],
      thermalExpansionCurve: activeMaterial.thermalExpansionCurve ?? [],
    };
    return JSON.stringify(draft) !== JSON.stringify(baseline);
  }, [
    activeMaterial,
    name,
    category,
    description,
    density,
    youngsModulus,
    poissonRatio,
    thermalConductivity,
    meltingPoint,
    stressStrainCurve,
    thermalExpansionCurve,
  ]);

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
      toast({ 
        title: "Material created",
        description: (
          <span>
            <span className="font-medium text-foreground italic" title={name}>
              {truncateName(name, 25)}
            </span>{" "}
            added to the library.
          </span>
        ), 
      });
      setName("");
      setDescription("");
      setIsDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create material.";
      toast({ title: "Creation failed", description: message, variant: "destructive" });
    }
  };

  const handleOpenCreate = () => {
    setName("");
    setCategory("Metal");
    setDescription("");
    setDensity("");
    setYoungsModulus("");
    setPoissonRatio("");
    setThermalConductivity("");
    setMeltingPoint("");
    setStressStrainCurve('[{"strain":0,"stress":0},{"strain":0.01,"stress":100}]');
    setThermalExpansionCurve('[{"temperature":20,"coefficient":12},{"temperature":100,"coefficient":13}]');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (material: typeof materials[number]) => {
    setActiveMaterialId(material.id);
    setName(material.name);
    setCategory(material.category);
    setDescription(material.description);
    setDensity(String(material.density));
    setYoungsModulus(String(material.youngsModulus));
    setPoissonRatio(String(material.poissonRatio));
    setThermalConductivity(String(material.thermalConductivity));
    setMeltingPoint(String(material.meltingPoint));
    setStressStrainCurve(JSON.stringify(material.stressStrainCurve ?? [], null, 2));
    setThermalExpansionCurve(JSON.stringify(material.thermalExpansionCurve ?? [], null, 2));
    setIsEditOpen(true);
  };

  const handleUpdateMaterial = async () => {
    if (!activeMaterialId) return;
    if (!parsedCurves) {
      toast({
        title: "Invalid curve JSON",
        description: "Please fix the stress-strain or thermal expansion JSON.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateMaterial({
        id: activeMaterialId,
        data: {
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
        },
      });
      toast({ 
        title: "Material updated",
        description: (
          <span>
            <span className="font-medium text-foreground italic" title={name}>
              {truncateName(name, 25)}
            </span>{" "}
            saved successfully.
          </span>
        ), 
      });
      setIsEditOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update material.";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    }
  };

  const handleDeleteMaterial = (id: number, name: string) => {
    setDeleteTarget({ id, name });
    setIsDeleteOpen(true);
  };

  const confirmDeleteMaterial = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMaterial(deleteTarget.id);
      toast({
        title: "Material deleted",
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
      const message = error instanceof Error ? error.message : "Failed to delete material.";
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
          <h1 className="text-3xl font-display font-bold text-foreground">Material Library</h1>
          <p className="text-muted-foreground mt-1">Browse and analyze material properties.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search materials..." 
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-2xl border border-border" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials?.map((material, i) => (
            <Link key={material.id} href={`/materials/${material.id}`}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card hover:bg-muted/30 border border-border hover:border-primary/40 rounded-2xl p-6 shadow-sm transition-all duration-300 cursor-pointer group h-full flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="px-2.5 py-1 rounded-md bg-secondary text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
                    {material.category}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-lg p-2 m-[-8px] mr-2 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 transition"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleOpenEdit(material);
                      }}
                      aria-label={`Edit ${material.name}`}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 m-[-8px] mr-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleDeleteMaterial(material.id, material.name);
                      }}
                      aria-label={`Delete ${material.name}`}
                      disabled={isDeleting}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
                
                <h3
                  className="text-xl font-bold font-display text-foreground mb-2 truncate"
                  title={material.name}
                >
                  {truncateName(material.name)}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">
                  {material.description}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                  <div>
                    <span className="block text-xs text-muted-foreground">Density</span>
                    <span className="font-mono font-medium">{material.density} <span className="text-[10px]">kg/m³</span></span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground">Young's Mod.</span>
                    <span className="font-mono font-medium">{material.youngsModulus} <span className="text-[10px]">GPa</span></span>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
          <motion.button
            type="button"
            onClick={handleOpenCreate}
            className="bg-card hover:bg-muted/30 border border-dashed border-border hover:border-primary/40 rounded-2xl p-6 shadow-sm transition-all duration-300 group h-full flex flex-col items-center justify-center text-muted-foreground hover:text-primary"
          >
            <div className="h-14 w-14 rounded-full border border-border/60 flex items-center justify-center group-hover:border-primary/60">
              <Plus className="h-7 w-7" />
            </div>
            <span className="mt-3 text-sm font-semibold">Add new material</span>
          </motion.button>
          {filteredMaterials?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No materials found matching your search.
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add New Material</DialogTitle>
            <DialogDescription>
              Provide full material properties and curves.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
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
                <Input
                  type="number"
                  step="0.01"
                  value={density}
                  onChange={(e) => setDensity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Young's Modulus (GPa)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={youngsModulus}
                  onChange={(e) => setYoungsModulus(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Poisson's Ratio</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={poissonRatio}
                  onChange={(e) => setPoissonRatio(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Thermal Conductivity (W/m·K)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={thermalConductivity}
                  onChange={(e) => setThermalConductivity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Melting Point (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={meltingPoint}
                  onChange={(e) => setMeltingPoint(e.target.value)}
                />
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
                {isPending ? "Saving..." : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
            <DialogDescription>
              Update material properties and curves.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
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
                <Input
                  type="number"
                  step="0.01"
                  value={density}
                  onChange={(e) => setDensity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Young's Modulus (GPa)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={youngsModulus}
                  onChange={(e) => setYoungsModulus(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Poisson's Ratio</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={poissonRatio}
                  onChange={(e) => setPoissonRatio(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Thermal Conductivity (W/m·K)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={thermalConductivity}
                  onChange={(e) => setThermalConductivity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Melting Point (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={meltingPoint}
                  onChange={(e) => setMeltingPoint(e.target.value)}
                />
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
              <Button
                onClick={handleUpdateMaterial}
                disabled={isUpdating || !name || !activeMaterial || !hasMaterialChanges}
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
            <DialogTitle>Delete material?</DialogTitle>
            <DialogDescription className="text-foreground pt-4">
              This will permanently remove{" "}
              <span className="font-semibold text-foreground" title={deleteTarget?.name || ""}>
                {truncateName(deleteTarget?.name, 25) || "this material"}
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
              onClick={confirmDeleteMaterial}
              disabled={!deleteTarget || isDeleting}
              className="opacity-90 hover:opacity-100 disabled:hover:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <section className="pt-10 border-t border-border/60">
        <Compare embedded />
      </section>
    </div>
  );
}
