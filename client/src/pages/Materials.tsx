import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useMaterials } from "@/hooks/use-materials";
import { Search, Filter, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import Compare from "@/pages/Compare";

export default function Materials() {
  const { data: materials, isLoading } = useMaterials();
  const [search, setSearch] = useState("");

  const filteredMaterials = materials?.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.category.toLowerCase().includes(search.toLowerCase())
  );

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
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                
                <h3 className="text-xl font-bold font-display text-foreground mb-2">{material.name}</h3>
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
          {filteredMaterials?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No materials found matching your search.
            </div>
          )}
        </div>
      )}

      <section className="pt-10 border-t border-border/60">
        <Compare embedded />
      </section>
    </div>
  );
}
