import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";

// Pages
import Dashboard from "@/pages/Dashboard";
import Materials from "@/pages/Materials";
import MaterialDetail from "@/pages/MaterialDetail";
import Simulations from "@/pages/Simulations";
import SimulationDetail from "@/pages/SimulationDetail";
import SimulationComparison from "@/pages/SimulationComparison";
import Compare from "@/pages/Compare";
import CreateSimulation from "@/pages/CreateSimulation";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/materials" component={Materials} />
        <Route path="/materials/:id" component={MaterialDetail} />
        <Route path="/simulations" component={Simulations} />
        <Route path="/simulations/create" component={CreateSimulation} />
        <Route path="/simulations/:id" component={SimulationDetail} />
        <Route path="/compare-simulations" component={SimulationComparison} />
        <Route path="/compare" component={Compare} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
