import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "next-themes";

const STORAGE_KEYS = {
  units: "matsim.units",
  refresh: "matsim.refreshInterval",
  defaultType: "matsim.defaultSimType",
  notifications: "matsim.notifications",
};

export default function Settings() {
  const { setTheme, theme } = useTheme();

  const [units, setUnits] = useState("metric");
  const [refreshInterval, setRefreshInterval] = useState("10");
  const [defaultSimType, setDefaultSimType] = useState("Tensile Test");
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    const savedUnits = localStorage.getItem(STORAGE_KEYS.units);
    const savedRefresh = localStorage.getItem(STORAGE_KEYS.refresh);
    const savedType = localStorage.getItem(STORAGE_KEYS.defaultType);
    const savedNotifications = localStorage.getItem(STORAGE_KEYS.notifications);
    if (savedUnits) setUnits(savedUnits);
    if (savedRefresh) setRefreshInterval(savedRefresh);
    if (savedType) setDefaultSimType(savedType);
    if (savedNotifications) setNotifications(savedNotifications === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.units, units);
    localStorage.setItem(STORAGE_KEYS.refresh, refreshInterval);
    localStorage.setItem(STORAGE_KEYS.defaultType, defaultSimType);
    localStorage.setItem(STORAGE_KEYS.notifications, String(notifications));
  }, [units, refreshInterval, defaultSimType, notifications]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Customize your workspace and manage materials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <h3 className="text-lg font-semibold">Preferences</h3>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Toggle light/dark appearance.</p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Units Preference</Label>
              <Select value={units} onValueChange={setUnits}>
                <SelectTrigger>
                  <SelectValue placeholder="Select units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metric">Metric (MPa, mm, kg/m³)</SelectItem>
                  <SelectItem value="imperial">Imperial (psi, in, lb/ft³)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Default Simulation Type</Label>
              <Select value={defaultSimType} onValueChange={setDefaultSimType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tensile Test">Tensile Test</SelectItem>
                  <SelectItem value="Thermal Stress">Thermal Stress</SelectItem>
                  <SelectItem value="Fatigue">Fatigue Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Auto-refresh Interval (s)</Label>
              <Select value={refreshInterval} onValueChange={setRefreshInterval}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 seconds</SelectItem>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">60 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Notifications</Label>
                <p className="text-xs text-muted-foreground">Notify on completion/failure.</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2" />
      </div>
    </div>
  );
}
