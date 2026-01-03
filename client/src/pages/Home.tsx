import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart2,
  Box,
  CheckCircle2,
  ChevronRight,
  Layers,
  Moon,
  Sun,
  Zap,
} from "lucide-react";

const sectionImages = {
  "Dashboard overview": {
    light: "/home/light/dashboard.PNG",
    dark: "/home/dark/dashboard.PNG",
    alt: "Dashboard overview preview",
  },
  "Simulations": {
    light: "/home/light/simulations.PNG",
    dark: "/home/dark/simulations.PNG",
    alt: "Simulations table preview",
  },
  "Geometry library": {
    light: "/home/light/geometry-library.PNG",
    dark: "/home/dark/geometry-library.PNG",
    alt: "Geometry library preview",
  },
  "Materials library": {
    light: "/home/light/material-library.PNG",
    dark: "/home/dark/material-library.PNG",
    alt: "Materials library preview",
  },
} as const;

export default function Home() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-card text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">
              MatSim
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#workflow" className="hover:text-foreground">
              Workflow
            </a>
            <a href="#preview" className="hover:text-foreground">
              Preview
            </a>
            <a href="#stack" className="hover:text-foreground">
              Tech
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-sm">
                    Dashboard
                  </Button>
                </Link>
                <Link href="/simulations/create">
                  <Button className="font-semibold opacity-90 hover:opacity-100">
                    <Zap className="h-4 w-4 fill-current" />
                    Create
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-sm">
                    Sign in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="text-sm">Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <section className="grid items-center gap-10 md:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Finite-element workspace for materials + geometry
            </div>
            <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
              Run material and geometry simulations with confidence.
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              Upload geometries, configure boundary conditions, and compare
              simulation outcomes in one focused workspace.
            </p>
            <div className="flex flex-wrap gap-3">
              {user ? (
                <>
                  <Link href="/dashboard">
                    <Button size="lg">Go to dashboard</Button>
                  </Link>
                  <Link href="/simulations/create">
                    <Button variant="outline" size="lg">
                      Run a simulation
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg">Create your workspace</Button>
                  </Link>
                </>
              )}
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Upload STL/STEP geometries
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Compare runs side-by-side
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Mesh + result downloads
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Assistant insights built-in
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Boundary conditions + material models
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Real-time progress and status tracking
              </div>
            </div>
          </div>

          {/* <div className="glow-border rounded-3xl border border-border bg-muted/20 p-6 shadow-sm"> */}
            <div className="glow-border rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Simulation overview
              </p>
              <div className="mt-4 space-y-4">
                <div className="glow-border rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">Stress-Strain Curve</p>
                  <p className="text-xs text-muted-foreground">
                    Quick response preview and key metrics.
                  </p>
                    <div className="glow-border mt-3 overflow-hidden rounded-lg border border-border bg-card">
                    <img
                      src="/home/light/stress-strain.PNG"
                      alt="Stress-strain curve preview"
                      className="block h-auto w-full dark:hidden"
                    />
                    <img
                      src="/home/dark/stress-strain.PNG"
                      alt="Stress-strain curve preview"
                      className="hidden h-auto w-full dark:block"
                    />
                    </div>
                </div>
                <div className="glow-border rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">3D Results Viewer</p>
                  <p className="text-xs text-muted-foreground">
                    Iso-surface, slice, and volume views.
                  </p>
                    <div className="glow-border mt-3 overflow-hidden rounded-lg border border-border bg-card">
                    <img
                      src="/home/light/3d-results.PNG"
                      alt="3D results viewer preview"
                      className="block h-auto w-full dark:hidden"
                    />
                    <img
                      src="/home/dark/3d-results.PNG"
                      alt="3D results viewer preview"
                      className="hidden h-auto w-full dark:block"
                    />
                    </div>
                </div>
              </div>
            </div>
          {/* </div> */}
        </section>

        <section className="glow-border mt-12 grid gap-4 rounded-3xl border border-border bg-muted/20 px-6 py-5 text-sm text-muted-foreground sm:grid-cols-2 md:grid-cols-4">
          {[
            { label: "Simulation runs", value: "1200+ completed" },
            { label: "Materials library", value: "Metals + polymers" },
            { label: "Mesh downloads", value: "VTU + XML ready" },
            { label: "Compare tools", value: "Overlay + ranking" },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="text-base font-semibold text-foreground">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        <section id="features" className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Materials Library",
              description:
                "Curate metals, polymers, and composites with interactive curve inputs.",
              icon: Layers,
            },
            {
              title: "Geometry Management",
              description:
                "Store reusable parts, preview meshes, and keep STL assets organized.",
              icon: Box,
            },
            {
              title: "Compare & Rank",
              description:
                "Overlay curves and rank results with weighted metrics.",
              icon: BarChart2,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="glow-border rounded-2xl border border-border bg-muted/10 p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </section>

        <section
          id="workflow"
          className="glow-border mt-14 rounded-3xl border border-border bg-muted/20 p-8"
        >
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Upload geometry",
                detail:
                  "Bring STL/STEP parts into the library and reuse them across runs.",
              },
              {
                step: "02",
                title: "Configure loads",
                detail:
                  "Define boundary conditions, materials, and analysis types.",
              },
              {
                step: "03",
                title: "Analyze outcomes",
                detail:
                  "Inspect metrics, playback time series, and compare results.",
              },
            ].map((item) => (
              <div key={item.step} className="space-y-2">
                <span className="text-xs font-semibold text-primary">
                  {item.step}
                </span>
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="preview" className="mt-14 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glow-border rounded-3xl border border-border bg-card p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Simulation Detail preview</h2>
              <span className="glow-border rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-semibold text-muted-foreground">
                Live metrics
              </span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              {[
                { label: "Max stress", value: "1.18 MPa" },
                { label: "Safety factor", value: "342.5" },
                { label: "Max deformation", value: "0.005 mm" },
                { label: "Avg strain", value: "4.7e-6" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="glow-border rounded-xl border border-border bg-muted/20 px-2 py-2"
                >
                  <p className="text-xs tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Drill into stress, displacement, and playback controls without
              leaving the workspace.
            </p>
            <div className="glow-border mt-6 overflow-hidden rounded-2xl border border-border bg-muted/20">
              <img
                src="/home/light/simulation-detail.PNG"
                alt="Simulation detail preview"
                className="block h-auto w-full dark:hidden"
              />
              <img
                src="/home/dark/simulation-detail.PNG"
                alt="Simulation detail preview"
                className="hidden h-auto w-full dark:block"
              />
            </div>
          </div>

          <div className="glow-border rounded-3xl border border-border bg-muted/20 p-8">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Compare simulations</h3>
              <Link
                href={user ? "/compare-simulations" : "/register"}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                Explore
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Overlay curves, rank runs, and spot outliers at a glance.
            </p>
            <div className="mt-6 space-y-4">
              {[
                "Overlay stress-strain curves for material response.",
                "Heatmap to visualize metric deltas.",
                "Weighted ranking for decision support.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
            <div className="glow-border mt-6 overflow-hidden rounded-2xl border border-border bg-card">
              <img
                src="/home/light/compare.PNG"
                alt="Compare simulations preview"
                className="block h-auto w-full dark:hidden"
              />
              <img
                src="/home/dark/compare.PNG"
                alt="Compare simulations preview"
                className="hidden h-auto w-full dark:block"
              />
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          {[
            {
              title: "Dashboard overview",
              description: "Monitor active jobs, failures, and key material stats.",
            },
            {
              title: "Simulations",
              description: "Track runs, statuses, and key results in one table.",
            },
            {
              title: "Geometry library",
              description: "Preview stored STL/STEP parts and reuse them in runs.",
            },
            {
              title: "Materials library",
              description: "Review material cards, curves, and category filters.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="glow-border rounded-3xl border border-border bg-card p-6 shadow-sm"
            >
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.description}
              </p>
              <div className="glow-border mt-4 overflow-hidden rounded-2xl border border-border bg-muted/10">
                <img
                  src={sectionImages[item.title].light}
                  alt={sectionImages[item.title].alt}
                  className="block h-auto w-full dark:hidden"
                />
                <img
                  src={sectionImages[item.title].dark}
                  alt={sectionImages[item.title].alt}
                  className="hidden h-auto w-full dark:block"
                />
              </div>
            </div>
          ))}
        </section>

        <section id="stack" className="glow-border mt-14 rounded-3xl border border-border bg-card px-8 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tech stack
              </p>
              <h3 className="mt-2 text-lg font-semibold">
                Built for fast iterations and reliable results.
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                "React + Vite",
                "Node + Express",
                "Postgres",
                "FEniCS",
                "Gmsh/MeshIO",
                "Plotly/Recharts",
              ].map((item) => (
                <span
                  key={item}
                  className="glow-border rounded-full border border-border bg-muted/20 px-3 py-1 text-xs font-semibold text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="glow-border mt-12 flex flex-col items-start justify-between gap-4 rounded-3xl border border-border bg-card px-8 py-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold">
              {user ? "Keep building your simulation workspace" : "Ready to explore MatSim?"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {user
                ? "Open your dashboard to pick up the latest runs."
                : "Create an account and start running your first simulation."}
            </p>
          </div>
          {user ? (
            <Link href="/dashboard">
              <Button size="lg">Open dashboard</Button>
            </Link>
          ) : (
            <Link href="/register">
              <Button size="lg">Get started</Button>
            </Link>
          )}
        </section>

        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span>MatSim - Simulation workspace for materials and geometry.</span>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Link href="/dashboard" className="hover:text-foreground">
                    Dashboard
                  </Link>
                  <Link href="/simulations" className="hover:text-foreground">
                    Simulations
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="hover:text-foreground">
                    Sign in
                  </Link>
                  <Link href="/register" className="hover:text-foreground">
                    Create account
                  </Link>
                </>
              )}
              <Link href="/compare-simulations" className="hover:text-foreground">
                Compare
              </Link>
            </div>
          </div>
        </footer>
      </main>

      <Button
        variant="ghost"
        size="icon"
        className="group fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full border border-border bg-background/80 shadow-lg backdrop-blur"
        onClick={() => {
          if (!isMounted) return;
          setTheme(theme === "dark" ? "light" : "dark");
        }}
        aria-label="Toggle dark mode"
      >
        {isMounted && theme === "dark" ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
        <span className="pointer-events-none absolute bottom-full right-0 mb-3 w-max opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <span className="relative rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
            Toggle {isMounted && theme === "dark" ? "light" : "dark"} mode
            <span className="absolute right-3 top-full h-3 w-3 -translate-y-1/2 rotate-45 bg-slate-900" />
          </span>
        </span>
      </Button>
    </div>
  );
}
