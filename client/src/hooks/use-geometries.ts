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

type UpdateGeometryPayload = {
  name: string;
  originalName?: string;
  format?: string;
  contentBase64?: string;
};

export function useUpdateGeometry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateGeometryPayload }) => {
      const url = api.geometries.update.path.replace(":id", String(id));
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.geometries.update.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        if (res.status === 404) {
          const error = api.geometries.update.responses[404].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to update geometry");
      }
      return api.geometries.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.geometries.list.path] });
    },
  });
}

export function useDeleteGeometry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = api.geometries.delete.path.replace(":id", String(id));
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        if (res.status === 404) {
          const error = api.geometries.delete.responses[404].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to delete geometry");
      }
      return api.geometries.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.geometries.list.path] });
    },
  });
}
