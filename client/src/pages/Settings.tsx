import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Info } from "lucide-react";

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
  const { user, logout, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [units, setUnits] = useState("metric");
  const [refreshInterval, setRefreshInterval] = useState("10");
  const [defaultSimType, setDefaultSimType] = useState("Tensile Test");
  const [notifications, setNotifications] = useState(true);
  const [assistantMuted, setAssistantMuted] = useState(false);
  const [assistantVolume, setAssistantVolume] = useState(60);
  const [assistantSound, setAssistantSound] = useState("soft-chime");
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const passwordRule = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

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
    if (!user) return;
    setProfileName(user.name ?? "");
    setProfileEmail(user.email ?? "");
  }, [user]);

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

  const profileChanged = useMemo(() => {
    if (!user) return false;
    return (
      profileName.trim() !== (user.name ?? "") ||
      profileEmail.trim() !== user.email
    );
  }, [profileEmail, profileName, user]);

  const canSavePassword = useMemo(() => {
    return (
      currentPassword.trim().length > 0 &&
      newPassword.length >= 8
    );
  }, [currentPassword, newPassword]);

  const handleProfileSave = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      const payload: { name?: string; email?: string } = {};
      if (profileName.trim() !== (user.name ?? "")) {
        payload.name = profileName.trim();
      }
      if (profileEmail.trim() !== user.email) {
        payload.email = profileEmail.trim();
      }
      await apiRequest("PUT", "/api/auth/profile", payload);
      await refresh({ silent: true });
      if (payload.email) {
        toast({
          title: "Check your email",
          description: "We sent a verification link to the new email address.",
        });
        setLocation(`/check-email?email=${encodeURIComponent(payload.email)}`);
      } else {
        toast({
          title: "Profile updated",
          description: "Your account details have been saved.",
        });
      }
    } catch (err) {
      toast({
        title: "Profile update failed",
        description: err instanceof Error ? err.message : "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    setPasswordSaving(true);
    try {
      if (!passwordRule.test(newPassword)) {
        toast({
          title: "Password requirements",
          description: "Use at least 8 characters with atleast a number and a special character.",
          variant: "destructive",
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        toast({
          title: "Passwords do not match",
          description: "Please make sure the new password fields match.",
          variant: "destructive",
        });
        return;
      }
      await apiRequest("POST", "/api/auth/password", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password updated",
        description: "Your password has been changed.",
      });
    } catch (err) {
      toast({
        title: "Password update failed",
        description: err instanceof Error ? err.message : "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setPasswordSaving(false);
    }
  };


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

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <h3 className="text-lg font-semibold">Account</h3>
            <div className="space-y-2">
              <Label className="text-sm">Display Name</Label>
              <Input
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                placeholder="Add a name (optional)"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label className="text-sm">Email</Label>
                <span className={`ml-2 text-xs font-semibold ${user?.emailVerified ? "text-emerald-600" : "text-amber-600"}`}>
                  {user?.emailVerified ? "(Verified)" : "(Pending)"}
                </span>
              </div>
              <Input
                type="email"
                value={profileEmail}
                onChange={(event) => setProfileEmail(event.target.value)}
                placeholder="Email address"
                disabled={!user}
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                onClick={handleProfileSave}
                disabled={!profileChanged || profileSaving}
                className="opacity-90 hover:opacity-100 disabled:pointer-events-auto disabled:hover:opacity-50 disabled:cursor-not-allowed"
              >
                {profileSaving ? "Saving..." : "Save"}
              </Button>
              <Button variant="destructive" onClick={() => void logout()} className="opacity-90 hover:opacity-100 border-none">
                Logout
              </Button>
            </div>
            <div className="pt-4 border-t border-border/60 space-y-3">
              <div>
                <p className="text-sm font-semibold">Reset Password</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs">Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Current password"
                    disabled={passwordSaving}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2 text-xs">
                    <span>New Password</span>
                    <span className="relative inline-flex items-center justify-center group">
                      <Info className="h-3.5 w-3.5 text-muted-foreground/70 cursor-pointer" />
                      <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 w-max -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <span className="relative rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
                          Password must be at least 8 characters and include atleast a number and a special character.
                          <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-900" />
                        </span>
                      </span>
                    </span>
                  </Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="New password"
                    disabled={passwordSaving}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm new password"
                    disabled={passwordSaving}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end pt-1">
                <Button
                  onClick={handlePasswordReset}
                  disabled={!canSavePassword || passwordSaving}
                  className="opacity-90 hover:opacity-100 disabled:pointer-events-auto disabled:hover:opacity-50 disabled:cursor-not-allowed"
                >
                  {passwordSaving ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
