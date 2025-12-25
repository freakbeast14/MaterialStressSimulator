import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type CreateSimulationInput = z.infer<typeof api.simulations.create.input>;

export function useSimulations() {
  return useQuery({
    queryKey: [api.simulations.list.path],
    queryFn: async () => {
      const res = await fetch(api.simulations.list.path);
      if (!res.ok) throw new Error("Failed to fetch simulations");
      return api.simulations.list.responses[200].parse(await res.json());
    },
  });
}

export function useSimulation(id: number) {
  return useQuery({
    queryKey: [api.simulations.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.simulations.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch simulation");
      }
      return api.simulations.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
    // Poll active simulations for updates
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === 'running' || data.status === 'pending')) {
        return 2000; // Poll every 2 seconds if active
      }
      return false;
    }
  });
}

export function useCreateSimulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSimulationInput) => {
      const res = await fetch(api.simulations.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.simulations.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create simulation");
      }
      return api.simulations.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.simulations.list.path] });
    },
  });
}
