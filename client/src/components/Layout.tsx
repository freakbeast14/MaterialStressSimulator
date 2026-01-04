import { Link, useLocation } from "wouter";
import {
  Activity,
  Layers,
  Box,
  BarChart2,
  Zap,
  Settings,
  Menu,
  History,
  LayoutDashboard
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { AssistantChat } from "@/components/AssistantChat";
import { AssistantProvider, useAssistantContext } from "@/context/assistant-context";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Create", href: "/simulations/create", icon: Zap, exact: true },
    { label: "Simualtions", href: "/simulations", icon: History, exclude: ["/simulations/create"] },
    { label: "Compare", href: "/compare-simulations", icon: BarChart2, exact: true },
    { label: "Materials", href: "/materials", icon: Layers },
    { label: "Geometries", href: "/geometries", icon: Box }
  ];

  const NavContent = () => {
    const isSettingsActive = location === "/settings" || location.startsWith("/settings/");
    return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-6">
        <Link href="/dashboard">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setIsMobileOpen(false)}
          >
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-display font-bold text-xl tracking-tight">MatSim</h1>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isExcluded = item.exclude?.some((path) => location.startsWith(path));
          const isActive = item.exact
            ? location === item.href
            : !isExcluded &&
              (location === item.href ||
                (item.href !== "/" && location.startsWith(item.href)));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => setIsMobileOpen(false)}
              >
                <item.icon className={clsx("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <Link href="/settings">
          <div
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium transition-colors cursor-pointer",
              isSettingsActive
                ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={() => setIsMobileOpen(false)}
          >
            <Settings className={clsx("h-4 w-4", isSettingsActive ? "text-primary" : "text-muted-foreground")} />
            Settings
          </div>
        </Link>
      </div>
    </div>
    );
  };

  const PageContextSync = () => {
    const { setContext } = useAssistantContext();

    useEffect(() => {
      setContext(location, null);
    }, [location, setContext]);

    return null;
  };

  return (
    <AssistantProvider>
      <div className="min-h-screen bg-background flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 fixed inset-y-0 z-20">
          <NavContent />
        </aside>

        {/* Mobile Trigger */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b border-border">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                <Activity className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">MatSim</span>
            </div>
          </Link>
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 w-full pt-16 md:pt-0">
          <div className="h-full px-4 py-8 md:px-8 md:py-12 max-w-7xl mx-auto">
            <PageContextSync />
            {children}
          </div>
        </main>

        <AssistantChat />
      </div>
    </AssistantProvider>
  );
}
