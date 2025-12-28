import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useBoundaryConditions(simulationId?: number) {
  return useQuery({
    queryKey: [api.simulationBoundaryConditions.listBySimulation.path, simulationId],
    queryFn: async () => {
      if (!simulationId) return [];
      const url = buildUrl(api.simulationBoundaryConditions.listBySimulation.path, {
        id: simulationId,
      });
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch boundary conditions");
      }
      return api.simulationBoundaryConditions.listBySimulation.responses[200].parse(
        await res.json()
      );
    },
    enabled: !!simulationId,
  });
}
