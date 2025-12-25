import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

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

type CreateMaterialInput = z.infer<typeof api.materials.create.input>;

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMaterialInput) => {
      const res = await fetch(api.materials.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.materials.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create material");
      }
      return api.materials.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.materials.list.path] });
    },
  });
}
