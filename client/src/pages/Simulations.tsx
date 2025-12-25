import { Link } from "wouter";
import { useSimulations } from "@/hooks/use-simulations";
import { useMaterials } from "@/hooks/use-materials";
import { StatusBadge } from "@/components/StatusBadge";
import { Eye, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function Simulations() {
  const { data: simulations, isLoading } = useSimulations();
  const { data: materials } = useMaterials();
  const [search, setSearch] = useState("");

  const getMaterialName = (id: number) => materials?.find(m => m.id === id)?.name || "Unknown Material";

  const filteredSimulations = simulations?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Simulation Jobs</h1>
          <p className="text-muted-foreground mt-1">Monitor active jobs and view historical results.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search jobs..." 
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Simulation Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Material</th>
                  <th className="px-6 py-4">Date Started</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSimulations?.map((sim) => (
                  <tr key={sim.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">#{sim.id}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{sim.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {/* <span className="px-2 py-1 rounded-md bg-secondary text-xs font-medium"> */}
                        {sim.type}
                      {/* </span> */}
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      <span className="px-2 py-1 rounded-md bg-secondary text-xs font-medium">
                        {getMaterialName(sim.materialId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono">
                      {sim.createdAt ? format(new Date(sim.createdAt), 'MMM d, yyyy HH:mm') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={sim.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/simulations/${sim.id}`} className="text-primary hover:text-primary/80 font-medium hover:underline">
                        <Button variant="ghost" size="sm" className="h-8 hover:bg-primary/10 hover:text-primary">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredSimulations?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No simulations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
