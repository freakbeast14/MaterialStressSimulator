import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Activity, BarChart2, CheckCircle2 } from "lucide-react";

export default function Demo() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">
              MatSim Demo
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="text-sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button className="text-sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border bg-background p-8 shadow-sm">
            <h1 className="text-2xl font-semibold">Sample Simulation Run</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              A read-only snapshot of a tensile test on Structural Steel.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { label: "Max stress", value: "1.18 MPa" },
                { label: "Safety factor", value: "342.5" },
                { label: "Max deformation", value: "0.005 mm" },
                { label: "Avg strain", value: "4.7e-6" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-border bg-muted/20 px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BarChart2 className="h-4 w-4 text-primary" />
                Stress vs. Strain Preview
              </div>
              <div className="mt-3 h-28 rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-muted/20 p-6">
              <p className="text-sm font-semibold">How this demo helps</p>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                {[
                  "See key metrics without configuring a run.",
                  "Preview stress-strain response curves.",
                  "Understand how results are summarized in MatSim.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-border bg-background p-6">
              <p className="text-sm font-semibold">Next steps</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Create an account to upload your own geometry, set materials,
                and run the full analysis.
              </p>
              <div className="mt-4 flex gap-2">
                <Link href="/register">
                  <Button>Start a project</Button>
                </Link>
                <Link href="/">
                  <Button variant="outline">Back to home</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
