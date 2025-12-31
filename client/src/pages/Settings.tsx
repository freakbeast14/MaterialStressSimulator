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
  assistantMute: "matsim.assistant.mute",
  assistantVolume: "matsim.assistant.volume",
  assistantSound: "matsim.assistant.sound",
};

export default function Settings() {
  const { setTheme, theme } = useTheme();

  const [units, setUnits] = useState("metric");
  const [refreshInterval, setRefreshInterval] = useState("10");
  const [defaultSimType, setDefaultSimType] = useState("Tensile Test");
  const [notifications, setNotifications] = useState(true);
  const [assistantMuted, setAssistantMuted] = useState(false);
  const [assistantVolume, setAssistantVolume] = useState(60);
  const [assistantSound, setAssistantSound] = useState("soft-chime");

  useEffect(() => {
    const savedUnits = localStorage.getItem(STORAGE_KEYS.units);
    const savedRefresh = localStorage.getItem(STORAGE_KEYS.refresh);
    const savedType = localStorage.getItem(STORAGE_KEYS.defaultType);
    const savedNotifications = localStorage.getItem(STORAGE_KEYS.notifications);
    const savedAssistantMute = localStorage.getItem(STORAGE_KEYS.assistantMute);
    const savedAssistantVolume = localStorage.getItem(STORAGE_KEYS.assistantVolume);
    const savedAssistantSound = localStorage.getItem(STORAGE_KEYS.assistantSound);
    if (savedUnits) setUnits(savedUnits);
    if (savedRefresh) setRefreshInterval(savedRefresh);
    if (savedType) setDefaultSimType(savedType);
    if (savedNotifications) setNotifications(savedNotifications === "true");
    if (savedAssistantMute) setAssistantMuted(savedAssistantMute === "true");
    if (savedAssistantVolume) {
      const parsed = Number(savedAssistantVolume);
      if (!Number.isNaN(parsed)) setAssistantVolume(parsed);
    }
    if (savedAssistantSound) setAssistantSound(savedAssistantSound);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.units, units);
    localStorage.setItem(STORAGE_KEYS.refresh, refreshInterval);
    localStorage.setItem(STORAGE_KEYS.defaultType, defaultSimType);
    localStorage.setItem(STORAGE_KEYS.notifications, String(notifications));
    localStorage.setItem(STORAGE_KEYS.assistantMute, String(assistantMuted));
    localStorage.setItem(
      STORAGE_KEYS.assistantVolume,
      String(assistantVolume)
    );
    localStorage.setItem(STORAGE_KEYS.assistantSound, assistantSound);
    window.dispatchEvent(new Event("matsim-assistant-settings"));
  }, [
    units,
    refreshInterval,
    defaultSimType,
    notifications,
    assistantMuted,
    assistantVolume,
    assistantSound,
  ]);


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

            <div className="space-y-2 pt-2 border-t border-border/60">
              <Label className="text-sm">Assistant Sounds</Label>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Mute</Label>
                  <p className="text-xs text-muted-foreground">Toggle assistant reply sound.</p>
                </div>
                <Switch
                  checked={assistantMuted}
                  onCheckedChange={setAssistantMuted}
                />
              </div>
              <div className="flex items-center justify-between !mt-4">
                <Label className="text-xs">Volume</Label>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    {assistantMuted ? "Muted" : `${assistantVolume}%`}
                  </p>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={assistantVolume}
                    onChange={(event) =>
                      setAssistantVolume(Number(event.target.value))
                    }
                    className="w-full accent-primary cursor-pointer"
                    disabled={assistantMuted}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between !mt-4">
                <Label className="text-xs">Sound</Label>
                <Select value={assistantSound} onValueChange={setAssistantSound}>
                  <SelectTrigger disabled={assistantMuted} className="w-1/2 h-auto text-xs px-2 py-1.5">
                    <SelectValue placeholder="Select sound" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soft-chime" className="text-xs">Soft chime</SelectItem>
                    <SelectItem value="bubble-pop" className="text-xs">Bubble pop</SelectItem>
                    <SelectItem value="paper-tick" className="text-xs">Paper tick</SelectItem>
                    <SelectItem value="soft-bell" className="text-xs">Soft bell</SelectItem>
                    <SelectItem value="synth-ping" className="text-xs">Synth ping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2" />
      </div>
    </div>
  );
}
