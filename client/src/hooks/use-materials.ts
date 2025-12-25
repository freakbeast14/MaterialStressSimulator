import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useMaterials() {
  return useQuery({
    queryKey: [api.materials.list.path],
    queryFn: async () => {
      const res = await fetch(api.materials.list.path);
      if (!res.ok) throw new Error("Failed to fetch materials");
      return api.materials.list.responses[200].parse(await res.json());
    },
  });
}

export function useMaterial(id: number) {
  return useQuery({
    queryKey: [api.materials.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.materials.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch material");
      }
      return api.materials.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}
