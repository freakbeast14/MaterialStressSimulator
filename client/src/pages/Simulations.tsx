import { Link } from "wouter";
import { useDeleteSimulation, useSimulations } from "@/hooks/use-simulations";
import { useMaterials } from "@/hooks/use-materials";
import { StatusBadge } from "@/components/StatusBadge";
import { Eye, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMemo, useState, type CSSProperties } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Simulations() {
  const { data: simulations, isLoading } = useSimulations();
  const { mutateAsync: deleteSimulation, isPending: isDeleting } = useDeleteSimulation();
  const { data: materials } = useMaterials();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [materialFilter, setMaterialFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const getMaterialName = (id: number) => materials?.find(m => m.id === id)?.name || "Unknown Material";
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

  const simulationTypes = useMemo(() => {
    const types = simulations?.map((sim) => sim.type) || [];
    return Array.from(new Set(types)).sort();
  }, [simulations]);

  const simulationStatuses = useMemo(() => {
    const statuses = simulations?.map((sim) => sim.status) || [];
    return Array.from(new Set(statuses)).sort();
  }, [simulations]);

  const filteredSimulations = simulations?.filter((sim) => {
    const matchesSearch =
      sim.name.toLowerCase().includes(search.toLowerCase()) ||
      sim.type.toLowerCase().includes(search.toLowerCase());
    const matchesMaterial = materialFilter === "all" || String(sim.materialId) === materialFilter;
    const matchesType = typeFilter === "all" || sim.type === typeFilter;
    const matchesStatus = statusFilter === "all" || sim.status === statusFilter;
    return matchesSearch && matchesMaterial && matchesType && matchesStatus;
  });

  const getTypeBadgeClass = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized.includes("tensile")) return "bg-sky-100 text-sky-700";
    if (normalized.includes("thermal")) return "bg-orange-100 text-orange-700";
    if (normalized.includes("fatigue")) return "bg-indigo-100 text-indigo-700";
    return "bg-muted text-muted-foreground";
  };

  const handleDelete = async (id: number, name: string) => {
    const confirmed = window.confirm(`Delete simulation "${name}"? This cannot be undone.`);
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await deleteSimulation(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete simulation.";
      window.alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Simulation Jobs</h1>
          <p className="text-muted-foreground mt-1">Monitor active jobs and view historical results.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search jobs..." 
              className="pl-9 bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={materialFilter} onValueChange={setMaterialFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-card">
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
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-card">
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
            <SelectTrigger className="w-full sm:w-36 bg-card">
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

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="border-t border-border">
            <table className="w-full table-fixed text-sm text-left">
              <colgroup>
                <col className="w-16" />
                <col className="w-[20%]" />
                <col className="w-[16%]" />
                <col className="w-[20%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[13%]" />
              </colgroup>
              <thead className="text-xs uppercase bg-muted text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Simulation Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Material</th>
                  <th className="px-6 py-4">Date Started</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
            </table>
            <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
              <table className="w-full table-fixed text-sm text-left">
                <colgroup>
                  <col className="w-16" />
                  <col className="w-[20%]" />
                  <col className="w-[16%]" />
                  <col className="w-[20%]" />
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <tbody className="divide-y divide-border">
                {filteredSimulations?.map((sim) => (
                  <tr key={sim.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">#{sim.id}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{sim.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${getTypeBadgeClass(sim.type)}`}>
                        {sim.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      <span
                        style={
                          {
                            "--badge-hue": materialHueMap.get(sim.materialId) ?? 210,
                          } as CSSProperties
                        }
                        className="px-2 py-1 rounded-md text-xs font-medium bg-[hsl(var(--badge-hue)_80%_90%)] text-[hsl(var(--badge-hue)_45%_30%)] dark:bg-[hsl(var(--badge-hue)_35%_20%)] dark:text-[hsl(var(--badge-hue)_70%_80%)]"
                      >
                        {getMaterialName(sim.materialId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                      {sim.createdAt ? format(new Date(sim.createdAt), 'MMM d, yyyy HH:mm') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={sim.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end">
                        <Link href={`/simulations/${sim.id}`} className="text-primary hover:text-primary/80 font-medium hover:underline">
                          <Button variant="ghost" size="sm" className="h-8 hover:bg-primary/10 hover:text-primary">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(sim.id, sim.name)}
                          disabled={isDeleting && deletingId === sim.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSimulations?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
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
    </div>
  );
}
