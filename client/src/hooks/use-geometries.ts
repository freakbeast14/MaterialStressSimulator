import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

type GeometryPayload = {
  name: string;
  originalName: string;
  format: string;
  contentBase64: string;
};

export function useGeometries() {
  return useQuery({
    queryKey: [api.geometries.list.path],
    queryFn: async () => {
      const res = await fetch(api.geometries.list.path);
      if (!res.ok) throw new Error("Failed to fetch geometries");
      return api.geometries.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateGeometry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: GeometryPayload) => {
      const res = await fetch(api.geometries.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.geometries.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to upload geometry");
      }
      return api.geometries.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.geometries.list.path] });
    },
  });
}
