import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";

// Pages
import Dashboard from "@/pages/Dashboard";
import Home from "@/pages/Home";
import Materials from "@/pages/Materials";
import MaterialDetail from "@/pages/MaterialDetail";
import Geometries from "@/pages/Geometries";
import Simulations from "@/pages/Simulations";
import SimulationDetail from "@/pages/SimulationDetail";
import SimulationComparison from "@/pages/SimulationComparison";
import Compare from "@/pages/Compare";
import CreateSimulation from "@/pages/CreateSimulation";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import VerifyEmail from "@/pages/VerifyEmail";
import CheckEmail from "@/pages/CheckEmail";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Admin from "@/pages/Admin";
import Demo from "@/pages/Demo";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify" component={VerifyEmail} />
      <Route path="/check-email" component={CheckEmail} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/demo" component={Demo} />
      <Route path="/" component={Home} />
      <Route>
        <RequireAuth>
          <Layout>
            <Switch>
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/materials" component={Materials} />
              <Route path="/geometries" component={Geometries} />
              <Route path="/materials/:id" component={MaterialDetail} />
              <Route path="/simulations" component={Simulations} />
              <Route path="/simulations/create" component={CreateSimulation} />
              <Route path="/simulations/:id" component={SimulationDetail} />
              <Route path="/compare-simulations" component={SimulationComparison} />
              <Route path="/settings" component={Settings} />
              <Route path="/compare" component={Compare} />
              <Route path="/admin" component={Admin} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </RequireAuth>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
