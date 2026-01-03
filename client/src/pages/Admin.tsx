import { useEffect, useMemo, useRef, useState } from "react";
import { useAssistantContext } from "@/context/assistant-context";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { api, buildUrl } from "@shared/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CurveEditor, type CurvePoint } from "@/components/CurveEditor";
import { GeometryPreview } from "@/components/GeometryPreview";
import {
  Box,
  Download,
  KeyRound,
  Layers,
  Pencil,
  Plus,
  Shield,
  Trash2,
  Users,
  Eye,
  UserPlus,
} from "lucide-react";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  emailVerified: boolean;
  roleId: number;
  createdAt?: string | Date;
  deletedAt?: string | Date | null;
};

type DefaultMaterial = (typeof api.admin.defaultMaterials.list.responses)[200][number];
type DefaultGeometry = (typeof api.admin.defaultGeometries.list.responses)[200][number];
type UserMaterial = (typeof api.admin.users.materials.list.responses)[200][number];
type UserGeometry = (typeof api.admin.users.geometries.list.responses)[200][number];

type GeometryFormState = {
  name: string;
  file: File | null;
};

type AdminSection = "users" | "default-materials" | "default-geometries";

const defaultStressPoints: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 0.01, y: 100 },
];
const defaultThermalPoints: CurvePoint[] = [
  { x: 20, y: 12 },
  { x: 100, y: 13 },
];

const curveToPoints = (
  curve: Array<Record<string, number>> | null | undefined,
  xKey: string,
  yKey: string
): CurvePoint[] => {
  if (!curve) return [];
  return curve
    .map((entry) => ({ x: Number(entry[xKey]), y: Number(entry[yKey]) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .sort((a, b) => a.x - b.x);
};

const pointsToCurve = (points: CurvePoint[], xKey: string, yKey: string) =>
  points
    .slice()
    .sort((a, b) => a.x - b.x)
    .map((point) => ({ [xKey]: point.x, [yKey]: point.y }));

const normalizePoints = (points: CurvePoint[]) =>
  points
    .map((point) => ({ x: Number(point.x), y: Number(point.y) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .sort((a, b) => a.x - b.x);

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setContext } = useAssistantContext();
  const isAdmin = user?.roleId === 2;

  const [activeSection, setActiveSection] = useState<AdminSection>("users");
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("1");
  const [newUserVerified, setNewUserVerified] = useState(false);

  const [activeUser, setActiveUser] = useState<AdminUser | null>(null);
  const [userNameDraft, setUserNameDraft] = useState("");
  const [userEmailDraft, setUserEmailDraft] = useState("");
  const [userRoleDraft, setUserRoleDraft] = useState("1");
  const [userEmailVerifiedDraft, setUserEmailVerifiedDraft] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const [activeUserData, setActiveUserData] = useState<AdminUser | null>(null);
  const [userDataTab, setUserDataTab] = useState<"materials" | "geometries">("materials");
  const [isUserDataOpen, setIsUserDataOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [defaultMaterialSearch, setDefaultMaterialSearch] = useState("");
  const [defaultGeometrySearch, setDefaultGeometrySearch] = useState("");
  const [userMaterialSearch, setUserMaterialSearch] = useState("");
  const [userGeometrySearch, setUserGeometrySearch] = useState("");

  const [activeUserMaterial, setActiveUserMaterial] = useState<UserMaterial | null>(null);
  const [isUserMaterialOpen, setIsUserMaterialOpen] = useState(false);
  const [userMaterialDraft, setUserMaterialDraft] = useState({
    name: "",
    category: "",
    description: "",
    density: "",
    youngsModulus: "",
    poissonRatio: "",
    thermalConductivity: "",
    meltingPoint: "",
  });
  const [userStressPoints, setUserStressPoints] = useState<CurvePoint[]>(defaultStressPoints);
  const [userThermalPoints, setUserThermalPoints] = useState<CurvePoint[]>(defaultThermalPoints);
  const [userStressValid, setUserStressValid] = useState(true);
  const [userThermalValid, setUserThermalValid] = useState(true);

  const [activeUserGeometry, setActiveUserGeometry] = useState<UserGeometry | null>(null);
  const [isUserGeometryOpen, setIsUserGeometryOpen] = useState(false);
  const [userGeometryName, setUserGeometryName] = useState("");
  const [userGeometryFile, setUserGeometryFile] = useState<File | null>(null);
  const [userGeometryPreview, setUserGeometryPreview] = useState<string | null>(null);
  const [userGeometryFileName, setUserGeometryFileName] = useState("");
  const [userGeometryRefreshToken, setUserGeometryRefreshToken] = useState("");

  const [activeDefaultMaterial, setActiveDefaultMaterial] = useState<DefaultMaterial | null>(null);
  const [isDefaultMaterialOpen, setIsDefaultMaterialOpen] = useState(false);
  const [defaultMaterialDraft, setDefaultMaterialDraft] = useState({
    name: "",
    category: "",
    description: "",
    density: "",
    youngsModulus: "",
    poissonRatio: "",
    thermalConductivity: "",
    meltingPoint: "",
  });
  const [defaultStressPointsState, setDefaultStressPointsState] = useState<CurvePoint[]>(defaultStressPoints);
  const [defaultThermalPointsState, setDefaultThermalPointsState] = useState<CurvePoint[]>(defaultThermalPoints);
  const [defaultStressValid, setDefaultStressValid] = useState(true);
  const [defaultThermalValid, setDefaultThermalValid] = useState(true);

  const [activeDefaultGeometry, setActiveDefaultGeometry] = useState<DefaultGeometry | null>(null);
  const [isDefaultGeometryOpen, setIsDefaultGeometryOpen] = useState(false);
  const [defaultGeometryForm, setDefaultGeometryForm] = useState<GeometryFormState>({
    name: "",
    file: null,
  });
  const [defaultGeometryPreview, setDefaultGeometryPreview] = useState<string | null>(null);
  const [defaultGeometryRefreshToken, setDefaultGeometryRefreshToken] = useState("");
  const [defaultGeometryFileName, setDefaultGeometryFileName] = useState("");

  const [deleteUserTarget, setDeleteUserTarget] = useState<AdminUser | null>(null);
  const [deleteDefaultMaterialTarget, setDeleteDefaultMaterialTarget] = useState<DefaultMaterial | null>(null);
  const [deleteDefaultGeometryTarget, setDeleteDefaultGeometryTarget] = useState<DefaultGeometry | null>(null);
  const [deleteUserMaterialTarget, setDeleteUserMaterialTarget] = useState<UserMaterial | null>(null);
  const [deleteUserGeometryTarget, setDeleteUserGeometryTarget] = useState<UserGeometry | null>(null);

  const toMaterialSnapshot = (
    draft: typeof defaultMaterialDraft,
    stressPoints: CurvePoint[],
    thermalPoints: CurvePoint[]
  ) => ({
    name: draft.name.trim(),
    category: draft.category.trim(),
    description: draft.description.trim(),
    density: Number(draft.density),
    youngsModulus: Number(draft.youngsModulus),
    poissonRatio: Number(draft.poissonRatio),
    thermalConductivity: Number(draft.thermalConductivity),
    meltingPoint: Number(draft.meltingPoint),
    stress: normalizePoints(stressPoints),
    thermal: normalizePoints(thermalPoints),
  });

  const isCreateUserDisabled = useMemo(
    () => !newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim(),
    [newUserEmail, newUserName, newUserPassword]
  );

  const isUserSaveDisabled = useMemo(() => {
    if (!activeUser) return true;
    const next = {
      name: userNameDraft.trim(),
      email: userEmailDraft.trim().toLowerCase(),
      roleId: Number(userRoleDraft),
      emailVerified: userEmailVerifiedDraft,
    };
    const base = {
      name: activeUser.name,
      email: activeUser.email,
      roleId: activeUser.roleId,
      emailVerified: activeUser.emailVerified,
    };
    return JSON.stringify(next) === JSON.stringify(base);
  }, [activeUser, userEmailDraft, userEmailVerifiedDraft, userNameDraft, userRoleDraft]);

  const isResetPasswordDisabled = useMemo(
    () => !resetPassword || !resetConfirm || resetPassword !== resetConfirm,
    [resetConfirm, resetPassword]
  );

  const isDefaultMaterialSaveDisabled = useMemo(() => {
    if (
      !defaultMaterialDraft.name.trim() ||
      !defaultMaterialDraft.category.trim() ||
      !defaultMaterialDraft.density.trim() ||
      !defaultMaterialDraft.youngsModulus.trim() ||
      !defaultMaterialDraft.poissonRatio.trim() ||
      !defaultMaterialDraft.thermalConductivity.trim() ||
      !defaultMaterialDraft.meltingPoint.trim()
    ) {
      return true;
    }

    if (!defaultStressValid || !defaultThermalValid) return true;

    if (!activeDefaultMaterial) return false;

    const baseSnapshot = {
      name: activeDefaultMaterial.name,
      category: activeDefaultMaterial.category,
      description: activeDefaultMaterial.description ?? "",
      density: Number(activeDefaultMaterial.density ?? 0),
      youngsModulus: Number(activeDefaultMaterial.youngsModulus ?? 0),
      poissonRatio: Number(activeDefaultMaterial.poissonRatio ?? 0),
      thermalConductivity: Number(activeDefaultMaterial.thermalConductivity ?? 0),
      meltingPoint: Number(activeDefaultMaterial.meltingPoint ?? 0),
      stress: normalizePoints(
        curveToPoints(activeDefaultMaterial.stressStrainCurve, "strain", "stress")
      ),
      thermal: normalizePoints(
        curveToPoints(activeDefaultMaterial.thermalExpansionCurve, "temperature", "coefficient")
      ),
    };
    const nextSnapshot = toMaterialSnapshot(
      defaultMaterialDraft,
      defaultStressPointsState,
      defaultThermalPointsState
    );

    return (
      JSON.stringify(baseSnapshot) === JSON.stringify(nextSnapshot)
    );
  }, [
    activeDefaultMaterial,
    defaultMaterialDraft,
    defaultStressPointsState,
    defaultStressValid,
    defaultThermalPointsState,
    defaultThermalValid,
  ]);

  const isDefaultGeometrySaveDisabled = useMemo(() => {
    if (!defaultGeometryForm.name.trim()) return true;
    if (!activeDefaultGeometry) {
      return !defaultGeometryForm.file || !defaultGeometryPreview;
    }
    return (
      defaultGeometryForm.name.trim() === activeDefaultGeometry.name &&
      !defaultGeometryForm.file
    );
  }, [activeDefaultGeometry, defaultGeometryForm, defaultGeometryPreview]);

  const isUserMaterialSaveDisabled = useMemo(() => {
    if (
      !userMaterialDraft.name.trim() ||
      !userMaterialDraft.category.trim() ||
      !userMaterialDraft.density.trim() ||
      !userMaterialDraft.youngsModulus.trim() ||
      !userMaterialDraft.poissonRatio.trim() ||
      !userMaterialDraft.thermalConductivity.trim() ||
      !userMaterialDraft.meltingPoint.trim()
    ) {
      return true;
    }
    if (!userStressValid || !userThermalValid) return true;
    if (!activeUserMaterial) {
      const hasStressPoints = normalizePoints(userStressPoints).length >= 2;
      const hasThermalPoints = normalizePoints(userThermalPoints).length >= 2;
      return !(hasStressPoints && hasThermalPoints);
    }

    const baseSnapshot = {
      name: activeUserMaterial.name,
      category: activeUserMaterial.category,
      description: activeUserMaterial.description ?? "",
      density: Number(activeUserMaterial.density ?? 0),
      youngsModulus: Number(activeUserMaterial.youngsModulus ?? 0),
      poissonRatio: Number(activeUserMaterial.poissonRatio ?? 0),
      thermalConductivity: Number(activeUserMaterial.thermalConductivity ?? 0),
      meltingPoint: Number(activeUserMaterial.meltingPoint ?? 0),
      stress: normalizePoints(
        curveToPoints(activeUserMaterial.stressStrainCurve, "strain", "stress")
      ),
      thermal: normalizePoints(
        curveToPoints(activeUserMaterial.thermalExpansionCurve, "temperature", "coefficient")
      ),
    };
    const nextSnapshot = toMaterialSnapshot(
      userMaterialDraft,
      userStressPoints,
      userThermalPoints
    );
    return JSON.stringify(baseSnapshot) === JSON.stringify(nextSnapshot);
  }, [
    activeUserMaterial,
    userMaterialDraft,
    userStressPoints,
    userStressValid,
    userThermalPoints,
    userThermalValid,
  ]);

  const isUserGeometrySaveDisabled = useMemo(() => {
    if (!userGeometryName.trim()) return true;
    if (!activeUserGeometry) return !userGeometryFile || !userGeometryPreview;
    return userGeometryName.trim() === activeUserGeometry.name && !userGeometryFile;
  }, [activeUserGeometry, userGeometryFile, userGeometryName, userGeometryPreview]);

  const assistantContext = useMemo(
    () => ({
      pageSummary:
        "Admin console to manage users, default materials, and default geometries for all accounts.",
      sections: ["Users", "Default Materials", "Default Geometries"],
      actions: [
        "Add user",
        "Edit user profile",
        "Reset user password",
        "Manage user materials",
        "Manage user geometries",
        "Add default materials",
        "Add default geometries",
      ],
      activeSection,
    }),
    [activeSection]
  );

  const assistantKeyRef = useRef("");
  useEffect(() => {
    const key = JSON.stringify(assistantContext);
    if (assistantKeyRef.current === key) return;
    assistantKeyRef.current = key;
    setContext("admin", assistantContext);
  }, [assistantContext, setContext]);

  const { data: adminUsers } = useQuery({
    queryKey: [api.admin.users.list.path],
    queryFn: async () => {
      const res = await fetch(api.admin.users.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load users.");
      return api.admin.users.list.responses[200].parse(await res.json());
    },
    enabled: isAdmin,
  });

  const { data: defaultMaterialsList } = useQuery({
    queryKey: [api.admin.defaultMaterials.list.path],
    queryFn: async () => {
      const res = await fetch(api.admin.defaultMaterials.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load default materials.");
      return api.admin.defaultMaterials.list.responses[200].parse(await res.json());
    },
    enabled: isAdmin,
  });

  const { data: defaultGeometriesList } = useQuery({
    queryKey: [api.admin.defaultGeometries.list.path],
    queryFn: async () => {
      const res = await fetch(api.admin.defaultGeometries.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load default geometries.");
      return api.admin.defaultGeometries.list.responses[200].parse(await res.json());
    },
    enabled: isAdmin,
  });

  const { data: userMaterials } = useQuery({
    queryKey: [api.admin.users.materials.list.path, activeUserData?.id],
    queryFn: async () => {
      const url = buildUrl(api.admin.users.materials.list.path, { id: activeUserData?.id ?? 0 });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load user materials.");
      return api.admin.users.materials.list.responses[200].parse(await res.json());
    },
    enabled: isAdmin && Boolean(activeUserData?.id) && isUserDataOpen,
  });

  const { data: userGeometries } = useQuery({
    queryKey: [api.admin.users.geometries.list.path, activeUserData?.id],
    queryFn: async () => {
      const url = buildUrl(api.admin.users.geometries.list.path, { id: activeUserData?.id ?? 0 });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load user geometries.");
      return api.admin.users.geometries.list.responses[200].parse(await res.json());
    },
    enabled: isAdmin && Boolean(activeUserData?.id) && isUserDataOpen,
  });

  const filteredAdminUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    const list = adminUsers ?? [];
    if (!term) return list;
    return list.filter((item) =>
      [item.name, item.email].some((value) =>
        value?.toLowerCase().includes(term)
      )
    );
  }, [adminUsers, userSearch]);

  const filteredDefaultMaterials = useMemo(() => {
    const term = defaultMaterialSearch.trim().toLowerCase();
    const list = defaultMaterialsList ?? [];
    if (!term) return list;
    return list.filter((item) =>
      [item.name, item.category].some((value) =>
        value?.toLowerCase().includes(term)
      )
    );
  }, [defaultMaterialsList, defaultMaterialSearch]);

  const filteredDefaultGeometries = useMemo(() => {
    const term = defaultGeometrySearch.trim().toLowerCase();
    const list = defaultGeometriesList ?? [];
    if (!term) return list;
    return list.filter((item) =>
      [item.name, item.originalName, item.format].some((value) =>
        value?.toLowerCase().includes(term)
      )
    );
  }, [defaultGeometriesList, defaultGeometrySearch]);

  const filteredUserMaterials = useMemo(() => {
    const term = userMaterialSearch.trim().toLowerCase();
    const list = userMaterials ?? [];
    if (!term) return list;
    return list.filter((item) =>
      [item.name, item.category].some((value) =>
        value?.toLowerCase().includes(term)
      )
    );
  }, [userMaterials, userMaterialSearch]);

  const filteredUserGeometries = useMemo(() => {
    const term = userGeometrySearch.trim().toLowerCase();
    const list = userGeometries ?? [];
    if (!term) return list;
    return list.filter((item) =>
      [item.name, item.originalName, item.format].some((value) =>
        value?.toLowerCase().includes(term)
      )
    );
  }, [userGeometries, userGeometrySearch]);

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof api.admin.users.create.input._type) => {
      const res = await fetch(api.admin.users.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create user.");
      return api.admin.users.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.list.path] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const url = buildUrl(api.admin.users.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update user.");
      return api.admin.users.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.list.path] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: number; newPassword: string }) => {
      const url = buildUrl(api.admin.users.resetPassword.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) throw new Error("Failed to reset password.");
      return api.admin.users.resetPassword.responses[200].parse(await res.json());
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.admin.users.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete user.");
      return api.admin.users.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.list.path] });
    },
  });

  const createDefaultMaterialMutation = useMutation({
    mutationFn: async (data: typeof api.admin.defaultMaterials.create.input._type) => {
      const res = await fetch(api.admin.defaultMaterials.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create default material.");
      return api.admin.defaultMaterials.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.defaultMaterials.list.path] });
    },
  });

  const updateDefaultMaterialMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const url = buildUrl(api.admin.defaultMaterials.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update default material.");
      return api.admin.defaultMaterials.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.defaultMaterials.list.path] });
    },
  });

  const deleteDefaultMaterialMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.admin.defaultMaterials.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete default material.");
      return api.admin.defaultMaterials.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.defaultMaterials.list.path] });
    },
  });

  const createDefaultGeometryMutation = useMutation({
    mutationFn: async (data: typeof api.admin.defaultGeometries.create.input._type) => {
      const res = await fetch(api.admin.defaultGeometries.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create default geometry.");
      return api.admin.defaultGeometries.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.defaultGeometries.list.path] });
      setDefaultGeometryRefreshToken(Date.now().toString());
    },
  });

  const updateDefaultGeometryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const url = buildUrl(api.admin.defaultGeometries.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update default geometry.");
      return api.admin.defaultGeometries.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.defaultGeometries.list.path] });
      setDefaultGeometryPreview(null);
      setDefaultGeometryRefreshToken(Date.now().toString());
    },
  });

  const deleteDefaultGeometryMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.admin.defaultGeometries.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete default geometry.");
      return api.admin.defaultGeometries.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.defaultGeometries.list.path] });
    },
  });

  const updateUserMaterialMutation = useMutation({
    mutationFn: async ({ userId, materialId, data }: { userId: number; materialId: number; data: Record<string, unknown> }) => {
      const url = buildUrl(api.admin.users.materials.update.path, { id: userId, materialId });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update user material.");
      return api.admin.users.materials.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.materials.list.path, activeUserData?.id] });
    },
  });

  const createUserMaterialMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: Record<string, unknown> }) => {
      const url = buildUrl(api.admin.users.materials.create.path, { id: userId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create user material.");
      return api.admin.users.materials.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.materials.list.path, activeUserData?.id] });
    },
  });

  const deleteUserMaterialMutation = useMutation({
    mutationFn: async ({ userId, materialId }: { userId: number; materialId: number }) => {
      const url = buildUrl(api.admin.users.materials.delete.path, { id: userId, materialId });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete user material.");
      return api.admin.users.materials.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.materials.list.path, activeUserData?.id] });
    },
  });

  const updateUserGeometryMutation = useMutation({
    mutationFn: async ({ userId, geometryId, data }: { userId: number; geometryId: number; data: Record<string, unknown> }) => {
      const url = buildUrl(api.admin.users.geometries.update.path, { id: userId, geometryId });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update user geometry.");
      return api.admin.users.geometries.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.geometries.list.path, activeUserData?.id] });
    },
  });

  const createUserGeometryMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: Record<string, unknown> }) => {
      const url = buildUrl(api.admin.users.geometries.create.path, { id: userId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create user geometry.");
      return api.admin.users.geometries.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.geometries.list.path, activeUserData?.id] });
    },
  });

  const deleteUserGeometryMutation = useMutation({
    mutationFn: async ({ userId, geometryId }: { userId: number; geometryId: number }) => {
      const url = buildUrl(api.admin.users.geometries.delete.path, { id: userId, geometryId });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete user geometry.");
      return api.admin.users.geometries.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.geometries.list.path, activeUserData?.id] });
    },
  });

  const formatSize = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1000) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1000) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
  };

  const formatFileLabel = (name?: string | null) => {
    if (!name) return "No file chosen";
    if (name.length <= 30) return name;
    const parts = name.split(".");
    const ext = parts.length > 1 ? `.${parts.pop()}` : "";
    const base = parts.join(".") || name;
    const prefix = base.slice(0, 30);
    return `${prefix}...${ext || ""}`;
  };

  const downloadBase64File = (payload: { contentBase64?: string; name?: string }, fallbackName: string, format?: string) => {
    const raw = payload.contentBase64 || "";
    const [header, base64] = raw.includes(",") ? raw.split(",", 2) : ["", raw];
    const mimeMatch = header.match(/data:(.*);base64/);
    const mimeType = mimeMatch?.[1] || "application/octet-stream";
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const rawName = payload.name || fallbackName;
    const hasExtension = /\.[^./\\]+$/.test(rawName);
    const downloadName = hasExtension ? rawName : `${rawName}.${format || "stl"}`;
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const resetUserDialog = (target: AdminUser) => {
    setResetTarget(target);
    setResetPassword("");
    setResetConfirm("");
    setIsResetDialogOpen(true);
  };

  const openUserEdit = (target: AdminUser) => {
    setActiveUser(target);
    setUserNameDraft(target.name);
    setUserEmailDraft(target.email);
    setUserRoleDraft(String(target.roleId));
    setUserEmailVerifiedDraft(target.emailVerified);
    setIsUserDialogOpen(true);
  };

  const openUserData = (target: AdminUser) => {
    setActiveUserData(target);
    setUserDataTab("materials");
    setIsUserDataOpen(true);
  };

  const openUserMaterialCreate = () => {
    setActiveUserMaterial(null);
    setUserMaterialDraft({
      name: "",
      category: "Metal",
      description: "",
      density: "",
      youngsModulus: "",
      poissonRatio: "",
      thermalConductivity: "",
      meltingPoint: "",
    });
    setUserStressPoints(defaultStressPoints);
    setUserThermalPoints(defaultThermalPoints);
    setUserStressValid(true);
    setUserThermalValid(true);
    setIsUserMaterialOpen(true);
  };

  const openUserMaterialEdit = (material: UserMaterial) => {
    setActiveUserMaterial(material);
    setUserMaterialDraft({
      name: material.name,
      category: material.category,
      description: material.description,
      density: String(material.density ?? ""),
      youngsModulus: String(material.youngsModulus ?? ""),
      poissonRatio: String(material.poissonRatio ?? ""),
      thermalConductivity: String(material.thermalConductivity ?? ""),
      meltingPoint: String(material.meltingPoint ?? ""),
    });
    setUserStressPoints(
      curveToPoints(material.stressStrainCurve, "strain", "stress").length
        ? curveToPoints(material.stressStrainCurve, "strain", "stress")
        : defaultStressPoints
    );
    setUserThermalPoints(
      curveToPoints(material.thermalExpansionCurve, "temperature", "coefficient").length
        ? curveToPoints(material.thermalExpansionCurve, "temperature", "coefficient")
        : defaultThermalPoints
    );
    setUserStressValid(true);
    setUserThermalValid(true);
    setIsUserMaterialOpen(true);
  };

  const openUserGeometryCreate = () => {
    setActiveUserGeometry(null);
    setUserGeometryName("");
    setUserGeometryFile(null);
    setUserGeometryPreview(null);
    setUserGeometryFileName("");
    setUserGeometryRefreshToken(String(Date.now()));
    setIsUserGeometryOpen(true);
  };

  const openUserGeometryEdit = (geometry: UserGeometry) => {
    setActiveUserGeometry(geometry);
    setUserGeometryName(geometry.name);
    setUserGeometryFile(null);
    setUserGeometryPreview(null);
    setUserGeometryFileName(geometry.originalName ?? "");
    setUserGeometryRefreshToken(String(Date.now()));
    setIsUserGeometryOpen(true);
  };

  const openDefaultMaterialEdit = (material: DefaultMaterial | null) => {
    setActiveDefaultMaterial(material);
    if (material) {
      setDefaultMaterialDraft({
        name: material.name,
        category: material.category,
        description: material.description,
        density: String(material.density ?? ""),
        youngsModulus: String(material.youngsModulus ?? ""),
        poissonRatio: String(material.poissonRatio ?? ""),
        thermalConductivity: String(material.thermalConductivity ?? ""),
        meltingPoint: String(material.meltingPoint ?? ""),
      });
      setDefaultStressPointsState(
        curveToPoints(material.stressStrainCurve, "strain", "stress").length
          ? curveToPoints(material.stressStrainCurve, "strain", "stress")
          : defaultStressPoints
      );
      setDefaultThermalPointsState(
        curveToPoints(material.thermalExpansionCurve, "temperature", "coefficient").length
          ? curveToPoints(material.thermalExpansionCurve, "temperature", "coefficient")
          : defaultThermalPoints
      );
    } else {
      setDefaultMaterialDraft({
        name: "",
        category: "Metal",
        description: "",
        density: "",
        youngsModulus: "",
        poissonRatio: "",
        thermalConductivity: "",
        meltingPoint: "",
      });
      setDefaultStressPointsState(defaultStressPoints);
      setDefaultThermalPointsState(defaultThermalPoints);
    }
    setDefaultStressValid(true);
    setDefaultThermalValid(true);
    setIsDefaultMaterialOpen(true);
  };

  const openDefaultGeometryEdit = (geometry: DefaultGeometry | null) => {
    setActiveDefaultGeometry(geometry);
    setDefaultGeometryForm({
      name: geometry?.name ?? "",
      file: null,
    });
    setDefaultGeometryPreview(null);
    setDefaultGeometryRefreshToken(String(Date.now()));
    setDefaultGeometryFileName(geometry?.originalName ?? "");
    setIsDefaultGeometryOpen(true);
  };

  const truncateName = (value: string | undefined, max = 30) => {
    if (!value) { return value };
    return value.length > max ? `${value.slice(0, max)}...` : value;
  }

  const handleCreateUser = async () => {
    try {
      await createUserMutation.mutateAsync({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        roleId: Number(newUserRole),
        emailVerified: newUserVerified,
      });
      toast({ 
        title: "User created",
        description: (
          <span>
            <span className="font-medium text-foreground italic" title={newUserName.trim()}>
              {truncateName(newUserName.trim(), 25)}
            </span>{" "}
            created.
          </span>
        ), 
      });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("1");
      setNewUserVerified(false);
      setIsCreateUserOpen(false);
    } catch (err) {
      toast({
        title: "Failed to create user",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!activeUser) return;
    try {
      await updateUserMutation.mutateAsync({
        id: activeUser.id,
        data: {
          name: userNameDraft.trim(),
          email: userEmailDraft.trim(),
          roleId: Number(userRoleDraft),
          emailVerified: userEmailVerifiedDraft,
        },
      });
      toast({ 
        title: "User updated",
        description: (
          <span>
            <span className="font-medium text-foreground italic" title={userNameDraft.trim()}>
              {truncateName(userNameDraft.trim(), 25)}
            </span>{" "}
            updated.
          </span>
        ), 
      });
      setIsUserDialogOpen(false);
    } catch (err) {
      toast({
        title: "Failed to update user",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    if (!resetPassword || resetPassword !== resetConfirm) {
      toast({
        title: "Passwords do not match",
        description: "Confirm the new password.",
        variant: "destructive",
      });
      return;
    }
    try {
      await resetPasswordMutation.mutateAsync({
        id: resetTarget.id,
        newPassword: resetPassword,
      });
      toast({ 
        title: "Password reset",
        description: (
          <span>
            Password changed for{" "}
            <span className="font-medium text-foreground italic" title={resetTarget.name.trim()}>
              {truncateName(resetTarget.name.trim(), 25)}
            </span>
          </span>
        ), 
      });
      setIsResetDialogOpen(false);
    } catch (err) {
      toast({
        title: "Failed to reset password",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (target: AdminUser) => {
    try {
      await deleteUserMutation.mutateAsync(target.id);
      toast({ 
        title: "User deleted",
        description: (
          <span>
            <span className="font-medium text-foreground italic" title={target.name.trim()}>
              {truncateName(target.name.trim(), 25)}
            </span>{" "}
            deleted.
          </span>
        ), 
      });
    } catch (err) {
      toast({
        title: "Failed to delete user",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveDefaultMaterial = async () => {
    const payload = {
      name: defaultMaterialDraft.name.trim(),
      category: defaultMaterialDraft.category,
      description: defaultMaterialDraft.description,
      density: Number(defaultMaterialDraft.density),
      youngsModulus: Number(defaultMaterialDraft.youngsModulus),
      poissonRatio: Number(defaultMaterialDraft.poissonRatio),
      thermalConductivity: Number(defaultMaterialDraft.thermalConductivity),
      meltingPoint: Number(defaultMaterialDraft.meltingPoint),
      stressStrainCurve: pointsToCurve(defaultStressPointsState, "strain", "stress"),
      thermalExpansionCurve: pointsToCurve(defaultThermalPointsState, "temperature", "coefficient"),
    };
    const isCurvesValid =
      defaultStressValid &&
      defaultThermalValid &&
      normalizePoints(defaultStressPointsState).length >= 2 &&
      normalizePoints(defaultThermalPointsState).length >= 2;
    if (!isCurvesValid) {
      toast({
        title: "Invalid curve data",
        description: "Provide at least two valid points for each curve.",
        variant: "destructive",
      });
      return;
    }
    try {
      if (activeDefaultMaterial) {
        await updateDefaultMaterialMutation.mutateAsync({
          id: activeDefaultMaterial.id,
          data: payload,
        });
        toast({ 
          title: "Default material updated",
          description: (
            <span>
              <span className="font-medium text-foreground italic" title={defaultMaterialDraft.name.trim()}>
                {truncateName(defaultMaterialDraft.name.trim(), 25)}
              </span>{" "}
              updated.
            </span>
          ), 
        });
      } else {
        await createDefaultMaterialMutation.mutateAsync(payload);
        toast({ 
          title: "Default material added",
          description: (
            <span>
              <span className="font-medium text-foreground italic" title={defaultMaterialDraft.name.trim()}>
                {truncateName(defaultMaterialDraft.name.trim(), 25)}
              </span>{" "}
              added.
            </span>
          ), 
        });
      }
      setIsDefaultMaterialOpen(false);
    } catch (err) {
      toast({
        title: "Failed to save default material",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDefaultMaterial = async (target: DefaultMaterial) => {
    try {
      await deleteDefaultMaterialMutation.mutateAsync(target.id);
      toast({ 
        title: "Default material deleted",
        description: (
          <span>
            <span className="font-medium text-foreground italic" title={target.name.trim()}>
              {truncateName(target.name.trim(), 25)}
            </span>{" "}
            deleted.
          </span>
        ), 
      });
    } catch (err) {
      toast({
        title: "Failed to delete default material",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const handleDefaultGeometryFile = (file: File | null) => {
    setDefaultGeometryForm((prev) => ({
      ...prev,
      file,
      name: prev.name || (file ? file.name.replace(/\.[^.]+$/, "") : ""),
    }));
    if (!file) {
      setDefaultGeometryPreview(null);
      setDefaultGeometryFileName(activeDefaultGeometry?.originalName ?? "");
      return;
    }
    setDefaultGeometryFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setDefaultGeometryPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSaveDefaultGeometry = async () => {
    if (!defaultGeometryForm.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const file = defaultGeometryForm.file;
    let payload: Record<string, unknown> = {
      name: defaultGeometryForm.name.trim(),
    };
    if (file) {
      const contentBase64 = defaultGeometryPreview?.split(",")[1] ?? "";
      payload = {
        ...payload,
        originalName: file.name,
        format: file.name.split(".").pop() || "stl",
        contentBase64,
      };
    }
    try {
      if (activeDefaultGeometry) {
        await updateDefaultGeometryMutation.mutateAsync({
          id: activeDefaultGeometry.id,
          data: payload,
        });
        toast({ 
          title: "Default geometry updated",
          description: (
            <span>
              <span className="font-medium text-foreground italic" title={defaultGeometryForm.name.trim()}>
                {truncateName(defaultGeometryForm.name.trim(), 25)}
              </span>{" "}
              updated.
            </span>
          ), 
        });
      } else {
        if (!file || !defaultGeometryPreview) {
          toast({ title: "Upload an STL file", variant: "destructive" });
          return;
        }
        await createDefaultGeometryMutation.mutateAsync(payload as typeof api.admin.defaultGeometries.create.input._type);
        toast({ 
          title: "Default geometry added",
          description: (
            <span>
              <span className="font-medium text-foreground italic" title={defaultGeometryForm.name.trim()}>
                {truncateName(defaultGeometryForm.name.trim(), 25)}
              </span>{" "}
              added.
            </span>
          ), 
        });
      }
      setDefaultGeometryRefreshToken(String(Date.now()));
      setIsDefaultGeometryOpen(false);
    } catch (err) {
      toast({
        title: "Failed to save default geometry",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDefaultGeometry = async (target: DefaultGeometry) => {
    try {
      await deleteDefaultGeometryMutation.mutateAsync(target.id);
      toast({ 
        title: "Default geometry deleted",
        description: (
          <span>
            <span className="font-medium text-foreground italic" title={target.name.trim()}>
              {truncateName(target.name.trim(), 25)}
            </span>{" "}
            delete.
          </span>
        ), 
      });
    } catch (err) {
      toast({
        title: "Failed to delete default geometry",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveUserMaterial = async () => {
    if (!activeUserData) return;
    const payload = {
      name: userMaterialDraft.name.trim(),
      category: userMaterialDraft.category,
      description: userMaterialDraft.description,
      density: Number(userMaterialDraft.density),
      youngsModulus: Number(userMaterialDraft.youngsModulus),
      poissonRatio: Number(userMaterialDraft.poissonRatio),
      thermalConductivity: Number(userMaterialDraft.thermalConductivity),
      meltingPoint: Number(userMaterialDraft.meltingPoint),
      stressStrainCurve: pointsToCurve(userStressPoints, "strain", "stress"),
      thermalExpansionCurve: pointsToCurve(userThermalPoints, "temperature", "coefficient"),
    };
    const isCurvesValid =
      userStressValid &&
      userThermalValid &&
      normalizePoints(userStressPoints).length >= 2 &&
      normalizePoints(userThermalPoints).length >= 2;
    if (!isCurvesValid) {
      toast({
        title: "Invalid curve data",
        description: "Provide at least two valid points for each curve.",
        variant: "destructive",
      });
      return;
    }
    try {
      if (activeUserMaterial) {
        await updateUserMaterialMutation.mutateAsync({
          userId: activeUserData.id,
          materialId: activeUserMaterial.id,
          data: payload,
        });
        toast({ 
          title: "User material updated",
          description: (
            <span>
              <span className="font-medium text-foreground italic" title={userMaterialDraft.name.trim()}>
                {truncateName(userMaterialDraft.name.trim(), 25)}
              </span>{" "}
              updated.
            </span>
          ), 
        });
      } else {
        await createUserMaterialMutation.mutateAsync({
          userId: activeUserData.id,
          data: payload,
        });
        toast({ 
          title: "User material added",
          description: (
            <span>
              <span className="font-medium text-foreground italic" title={userMaterialDraft.name.trim()}>
                {truncateName(userMaterialDraft.name.trim(), 25)}
              </span>{" "}
              added.
            </span>
          ), 
        });
      }
      setIsUserMaterialOpen(false);
    } catch (err) {
      toast({
        title: activeUserMaterial ? "Failed to update user material" : "Failed to create user material",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUserMaterial = async (target: UserMaterial) => {
    if (!activeUserData) return;
    try {
      await deleteUserMaterialMutation.mutateAsync({
        userId: activeUserData.id,
        materialId: target.id,
      });
      toast({ 
        title: "User material deleted",
        description: (
          <span>
            <span className="font-medium text-foreground italic" title={target.name.trim()}>
              {truncateName(target.name.trim(), 25)}
            </span>{" "}
            deleted.
          </span>
        ), 
      });
    } catch (err) {
      toast({
        title: "Failed to delete user material",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const handleUserGeometryFile = (file: File | null) => {
    setUserGeometryFile(file);
    if (!userGeometryName.trim() && file) {
      setUserGeometryName(file.name.replace(/\.[^.]+$/, ""));
    }
    if (!file) {
      setUserGeometryPreview(null);
      setUserGeometryFileName(activeUserGeometry?.originalName ?? "");
      return;
    }
    setUserGeometryFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setUserGeometryPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSaveUserGeometry = async () => {
    if (!activeUserData) return;
    const payload: Record<string, unknown> = {
      name: userGeometryName.trim(),
    };
    if (userGeometryFile && userGeometryPreview) {
      payload.originalName = userGeometryFile.name;
      payload.format = userGeometryFile.name.split(".").pop() || "stl";
      payload.contentBase64 = userGeometryPreview.split(",")[1] ?? "";
    }
    try {
      if (activeUserGeometry) {
        await updateUserGeometryMutation.mutateAsync({
          userId: activeUserData.id,
          geometryId: activeUserGeometry.id,
          data: payload,
        });
        toast({ 
          title: "User geometry updated",
          description: (
            <span>
              <span className="font-medium text-foreground italic" title={userGeometryName.trim()}>
                {truncateName(userGeometryName.trim(), 25)}
              </span>{" "}
              updated.
            </span>
          ), 
        });
        setUserGeometryRefreshToken(String(Date.now()));
      } else {
        if (!userGeometryFile || !userGeometryPreview) {
          toast({ title: "Upload an STL file", variant: "destructive" });
          return;
        }
        await createUserGeometryMutation.mutateAsync({
          userId: activeUserData.id,
          data: payload,
        });
        toast({ 
          title: "User geometry added",
          description: (
            <span>
              <span className="font-medium text-foreground italic" title={userGeometryName.trim()}>
                {truncateName(userGeometryName.trim(), 25)}
              </span>{" "}
              added.
            </span>
          ), 
        });
        setUserGeometryRefreshToken(String(Date.now()));
      }
      setIsUserGeometryOpen(false);
    } catch (err) {
      toast({
        title: activeUserGeometry ? "Failed to update user geometry" : "Failed to create user geometry",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUserGeometry = async (target: UserGeometry) => {
    if (!activeUserData) return;
    try {
      await deleteUserGeometryMutation.mutateAsync({
        userId: activeUserData.id,
        geometryId: target.id,
      });
      toast({ 
        title: "User geometry deleted",
        description: (
          <span>
            <span className="font-medium text-foreground italic" title={target.name.trim()}>
              {truncateName(target.name.trim(), 25)}
            </span>{" "}
            deleted.
          </span>
        ), 
      });
    } catch (err) {
      toast({
        title: "Failed to delete user geometry",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadUserGeometry = async (geometry: UserGeometry) => {
    try {
      const res = await fetch(`/api/geometries/${geometry.id}/content`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to download geometry.");
      const data = await res.json();
      downloadBase64File(
        data,
        geometry.originalName || `${geometry.name}.${geometry.format || "stl"}`,
        geometry.format
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to download geometry.";
      toast({ title: "Download failed", description: message, variant: "destructive" });
    }
  };

  const handleDownloadDefaultGeometry = async (geometry: DefaultGeometry) => {
    try {
      const res = await fetch(`/api/admin/default-geometries/${geometry.id}/content`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to download default geometry.");
      const data = await res.json();
      downloadBase64File(
        data,
        geometry.originalName || `${geometry.name}.${geometry.format || "stl"}`,
        geometry.format
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to download default geometry.";
      toast({ title: "Download failed", description: message, variant: "destructive" });
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Admin Access Required</h2>
            <p className="text-sm text-muted-foreground">
              You do not have permission to view this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div>
      <aside className="mb-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Admin Console</h1>
          <p className="text-muted-foreground mt-1">Manage users, materials, and geometries for all accounts.</p>
        </div>
        <div className="bg-card flex gap-3 p-4 mt-8 rounded-2xl">
          {(
            [
              { id: "users", label: "Users", icon: Users },
              { id: "default-materials", label: "Default Materials", icon: Layers },
              { id: "default-geometries", label: "Default Geometries", icon: Box },
            ] as { id: AdminSection; label: string; icon: typeof Users }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeSection === item.id
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              onClick={() => setActiveSection(item.id)}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-2xl bg-card p-6">
        {activeSection === "users" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Users</h2>
                <p className="text-sm text-muted-foreground">
                  Manage accounts, roles, and access.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search..."
                  className="h-9 w-52"
                />
                <Button size="sm" onClick={() => setIsCreateUserOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Role</th>
                    <th className="px-4 py-3 text-left font-semibold">Verified</th>
                    <th className="px-4 py-3 text-left font-semibold">Created</th>
                    <th className="px-4 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdminUsers.length ? (
                    filteredAdminUsers.map((adminUser) => (
                      <tr key={adminUser.id} className="border-t border-border/70">
                        <td className="px-4 py-3 font-medium text-foreground truncate" title={adminUser.name}>
                          {adminUser.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground truncate" title={adminUser.email}>{adminUser.email}</td>
                        <td className={`px-4 py-3 text-sm truncate ${adminUser.roleId == 2 ? "text-primary" : "text-muted-foreground"}`}>
                          {adminUser.roleId === 2 ? "Admin" : "User"}
                        </td>
                        <td className="px-4 py-3 truncate" title={adminUser.emailVerified ? "Verified" : "Pending"}>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              adminUser.emailVerified
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {adminUser.emailVerified ? "Verified" : "Pending"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground truncate" title={adminUser.createdAt
                            ? new Date(adminUser.createdAt).toLocaleString("en-US", {
                                month: "short",
                                day: "2-digit",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : "—"}>
                          {adminUser.createdAt
                            ? new Date(adminUser.createdAt).toLocaleString("en-US", {
                                month: "short",
                                day: "2-digit",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openUserData(adminUser)}
                              title="View"
                              className="text-primary/80 bg-primary/10 hover:bg-primary/15 hover:text-primary"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openUserEdit(adminUser)}
                              className="text-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/15 hover:text-indigo-600"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => resetUserDialog(adminUser)}
                              className="text-amber-500 bg-amber-500/10 hover:bg-amber-500/15 hover:text-amber-600"
                              title="Reset password"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeleteUserTarget(adminUser)}
                                className="text-destructive/80 bg-destructive/10 hover:bg-destructive/15 hover:text-destructive"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === "default-materials" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Default materials</h2>
                <p className="text-sm text-muted-foreground">
                  Base library shared by every new account.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={defaultMaterialSearch}
                  onChange={(event) => setDefaultMaterialSearch(event.target.value)}
                  placeholder="Search..."
                  className="h-9 w-52"
                />
                <Button size="sm" onClick={() => openDefaultMaterialEdit(null)}>
                  <Layers className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredDefaultMaterials.length ? (
                filteredDefaultMaterials.map((material) => (
                  <div key={material.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{material.name}</h3>
                        <p className="text-xs text-muted-foreground">{material.category}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openDefaultMaterialEdit(material)}
                          className="rounded-lg p-2 m-[-8px] text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 transition"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteDefaultMaterialTarget(material)}
                        className="rounded-lg p-2 m-[-8px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">{material.description}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <div>
                        <p className="font-semibold text-foreground">
                          {material.youngsModulus ?? "—"} GPa
                        </p>
                        <p>Young’s modulus</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {material.density ?? "—"} kg/m³
                        </p>
                        <p>Density</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  No default materials yet.
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === "default-geometries" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Default geometries</h2>
                <p className="text-sm text-muted-foreground">
                  STL library available to all new accounts.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={defaultGeometrySearch}
                  onChange={(event) => setDefaultGeometrySearch(event.target.value)}
                  placeholder="Search..."
                  className="h-9 w-52"
                />
                <Button size="sm" onClick={() => openDefaultGeometryEdit(null)}>
                  <Box className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredDefaultGeometries.length ? (
                filteredDefaultGeometries.map((geometry) => (
                  <div key={geometry.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{geometry.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {geometry.format.toUpperCase()} · {formatSize(geometry.sizeBytes)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDownloadDefaultGeometry(geometry)}
                          className="rounded-lg p-2 m-[-8px] text-primary/80 hover:text-primary hover:bg-primary/10 transition"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openDefaultGeometryEdit(geometry)}
                          className="rounded-lg p-2 m-[-8px] text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 transition"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteDefaultGeometryTarget(geometry)}
                        className="rounded-lg p-2 m-[-8px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      </div>
                    </div>
                    <div className="mt-3 bg-card rounded-xl">
                      <AdminGeometryPreview
                        geometryId={geometry.id}
                        format={geometry.format}
                        refreshToken={`${geometry.id}-${geometry.updatedAt ?? geometry.createdAt ?? ""}-${defaultGeometryRefreshToken}`}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-card border border-dashed border-border p-6 text-sm text-muted-foreground">
                  No default geometries yet.
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>

    <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>Create a new account with a role.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Name</Label>
            <Input value={newUserName} onChange={(event) => setNewUserName(event.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} />
          </div>
          <div>
            <Label>Temporary password</Label>
            <Input
              type="password"
              value={newUserPassword}
              onChange={(event) => setNewUserPassword(event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Role</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">User</SelectItem>
                  <SelectItem value="2">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={newUserVerified}
                onCheckedChange={setNewUserVerified}
              />
              <span className="text-sm text-muted-foreground">Email verified</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsCreateUserOpen(false)}
              className="hover:text-primary hover:bg-primary/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={isCreateUserDisabled}
              className="opacity-90 hover:opacity-100 disabled:pointer-events-auto disabled:hover:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>Update profile and access for <span className="text-foreground italic font-semibold">{activeUserData?.name}</span>.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Name</Label>
            <Input value={userNameDraft} onChange={(event) => setUserNameDraft(event.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={userEmailDraft} onChange={(event) => setUserEmailDraft(event.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Role</Label>
              <Select value={userRoleDraft} onValueChange={setUserRoleDraft}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">User</SelectItem>
                  <SelectItem value="2">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={userEmailVerifiedDraft}
                onCheckedChange={setUserEmailVerifiedDraft}
              />
              <span className="text-sm text-muted-foreground">Email verified</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsUserDialogOpen(false)}
              className="hover:text-primary hover:bg-primary/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUser} 
              disabled={isUserSaveDisabled}
              className="opacity-90 hover:opacity-100 disabled:pointer-events-auto disabled:hover:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>Set a new password for <span className="text-foreground italic font-semibold">{activeUserData?.name}</span>.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>New password</Label>
            <Input
              type="password"
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
            />
          </div>
          <div>
            <Label>Confirm password</Label>
            <Input
              type="password"
              value={resetConfirm}
              onChange={(event) => setResetConfirm(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsResetDialogOpen(false)}
              className="hover:text-primary hover:bg-primary/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleResetPassword} 
              disabled={isResetPasswordDisabled}
              className="opacity-90 hover:opacity-100 disabled:pointer-events-auto disabled:hover:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={isUserDataOpen} onOpenChange={setIsUserDataOpen}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User data</DialogTitle>
          <DialogDescription>
            View and edit materials or geometries for <span className="text-foreground italic font-semibold">{activeUserData?.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 bg-card p-2 rounded-xl">
            {["materials", "geometries"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setUserDataTab(tab as "materials" | "geometries")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  userDataTab === tab
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab === "materials" ? "Materials" : "Geometries"}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {userDataTab === "materials" ? (
              <Input
                value={userMaterialSearch}
                onChange={(event) => setUserMaterialSearch(event.target.value)}
                placeholder="Search..."
                className="h-9 w-52"
              />
            ) : (
              <Input
                value={userGeometrySearch}
                onChange={(event) => setUserGeometrySearch(event.target.value)}
                placeholder="Search..."
                className="h-9 w-52"
              />
            )}
            {userDataTab === "materials" ? (
              <Button size="sm" onClick={openUserMaterialCreate}>
                <Layers className="h-4 w-4" />
                Add
              </Button>
            ) : (
              <Button size="sm" onClick={openUserGeometryCreate}>
                <Box className="h-4 w-4" />
                Add
              </Button>
            )}
          </div>
        </div>
        {userDataTab === "materials" ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredUserMaterials.length ? (
              filteredUserMaterials.map((material) => (
                <div key={material.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{material.name}</p>
                      <p className="text-xs text-muted-foreground">{material.category}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openUserMaterialEdit(material)}
                        className="rounded-lg p-2 m-[-8px] text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 transition"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteUserMaterialTarget(material)}
                        className="rounded-lg p-2 m-[-8px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{material.description}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <div>
                        <p className="font-semibold text-foreground">
                          {material.youngsModulus ?? "—"} GPa
                        </p>
                        <p>Young’s modulus</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {material.density ?? "—"} kg/m³
                        </p>
                        <p>Density</p>
                      </div>
                    </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No user materials found.
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredUserGeometries.length ? (
              filteredUserGeometries.map((geometry) => (
                <div key={geometry.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{geometry.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {geometry.format.toUpperCase()} · {formatSize(geometry.sizeBytes)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDownloadUserGeometry(geometry)}
                        className="rounded-lg p-2 m-[-8px] text-primary/80 hover:text-primary hover:bg-primary/10 transition"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openUserGeometryEdit(geometry)}
                        className="rounded-lg p-2 m-[-8px] text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 transition"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteUserGeometryTarget(geometry)}
                        className="rounded-lg p-2 m-[-8px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <AdminUserGeometryPreview
                      geometryId={geometry.id}
                      format={geometry.format}
                      refreshToken={`${geometry.id}-${geometry.updatedAt ?? geometry.createdAt ?? ""}-${userGeometryRefreshToken}`}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No user geometries found.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>

    <Dialog open={isUserMaterialOpen} onOpenChange={setIsUserMaterialOpen}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activeUserMaterial ? "Edit user material" : "Add user material"}</DialogTitle>
          <DialogDescription>Update the material and curves for <span className="text-foreground italic font-semibold">{activeUserData?.name}</span>.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input
                value={userMaterialDraft.name}
                onChange={(event) =>
                  setUserMaterialDraft((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={userMaterialDraft.category}
                onChange={(event) =>
                  setUserMaterialDraft((prev) => ({ ...prev, category: event.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={userMaterialDraft.description}
              onChange={(event) =>
                setUserMaterialDraft((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Density</Label>
              <Input
                type="number"
                step="any"
                value={userMaterialDraft.density}
                onChange={(event) =>
                  setUserMaterialDraft((prev) => ({ ...prev, density: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Young’s Modulus</Label>
              <Input
                type="number"
                step="any"
                value={userMaterialDraft.youngsModulus}
                onChange={(event) =>
                  setUserMaterialDraft((prev) => ({ ...prev, youngsModulus: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Poisson’s Ratio</Label>
              <Input
                type="number"
                step="any"
                value={userMaterialDraft.poissonRatio}
                onChange={(event) =>
                  setUserMaterialDraft((prev) => ({ ...prev, poissonRatio: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Thermal Conductivity</Label>
              <Input
                type="number"
                step="any"
                value={userMaterialDraft.thermalConductivity}
                onChange={(event) =>
                  setUserMaterialDraft((prev) => ({
                    ...prev,
                    thermalConductivity: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Melting Point</Label>
              <Input
                type="number"
                step="any"
                value={userMaterialDraft.meltingPoint}
                onChange={(event) =>
                  setUserMaterialDraft((prev) => ({ ...prev, meltingPoint: event.target.value }))
                }
              />
            </div>
          </div>
          <CurveEditor
            title="Stress-Strain Curve"
            xLabel="Strain (mm)"
            yLabel="Stress (MPa)"
            xKey="strain"
            yKey="stress"
            points={userStressPoints}
            onChange={setUserStressPoints}
            onValidityChange={setUserStressValid}
          />
          <CurveEditor
            title="Thermal Expansion Curve"
            xLabel="Temperature (°C)"
            yLabel="Coefficient (µm)"
            xKey="temperature"
            yKey="coefficient"
            points={userThermalPoints}
            onChange={setUserThermalPoints}
            onValidityChange={setUserThermalValid}
          />
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsUserMaterialOpen(false)}
              className="hover:text-primary hover:bg-primary/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveUserMaterial} 
              disabled={isUserMaterialSaveDisabled}
              className="opacity-90 hover:opacity-100 disabled:pointer-events-auto disabled:hover:opacity-50 disabled:cursor-not-allowed"
            >
              {activeUserMaterial ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={isUserGeometryOpen} onOpenChange={setIsUserGeometryOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activeUserGeometry ? "Edit user geometry" : "Add user geometry"}</DialogTitle>
          <DialogDescription>Update geometry metadata or STL file for <span className="text-foreground italic font-semibold">{activeUserData?.name}</span>.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Name</Label>
            <Input value={userGeometryName} onChange={(event) => setUserGeometryName(event.target.value)} />
          </div>
          <div>
            <Label>STL file</Label>
            <div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm">
              <input
                id="admin-user-geometry-file"
                type="file"
                accept=".stl"
                className="hidden"
                onChange={(event) => handleUserGeometryFile(event.target.files?.[0] ?? null)}
              />
              <Label
                htmlFor="admin-user-geometry-file"
                className="cursor-pointer rounded-md border border-input bg-muted/40 px-3 py-1 text-xs font-semibold text-foreground shadow-sm hover:bg-muted"
              >
                Choose File
              </Label>
              <span
                className="text-xs text-muted-foreground"
                title={userGeometryFileName || activeUserGeometry?.originalName || "No file chosen"}
              >
                {formatFileLabel(userGeometryFileName || activeUserGeometry?.originalName)}
              </span>
            </div>
          </div>
          <div>
            {userGeometryPreview ? (
              <GeometryPreview format="stl" contentBase64={userGeometryPreview.split(",")[1]} />
            ) : activeUserGeometry ? (
              <AdminUserGeometryPreview
                geometryId={activeUserGeometry.id}
                format={activeUserGeometry.format}
                refreshToken={`${activeUserGeometry.id}-${activeUserGeometry.updatedAt ?? activeUserGeometry.createdAt ?? ""}-${userGeometryRefreshToken}`}
              />
            ) : (
              <div className="text-xs text-muted-foreground rounded-xl border border-border bg-muted/10 p-3">No preview available.</div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsUserGeometryOpen(false)}
              className="hover:text-primary hover:bg-primary/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveUserGeometry} 
              disabled={isUserGeometrySaveDisabled}
              className="opacity-90 hover:opacity-100 disabled:pointer-events-auto disabled:hover:opacity-50 disabled:cursor-not-allowed"
            >
              {activeUserGeometry ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={isDefaultMaterialOpen} onOpenChange={setIsDefaultMaterialOpen}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activeDefaultMaterial ? "Edit default material" : "Add default material"}</DialogTitle>
          <DialogDescription>Update base materials visible to all users.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input
                value={defaultMaterialDraft.name}
                onChange={(event) =>
                  setDefaultMaterialDraft((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={defaultMaterialDraft.category}
                onChange={(event) =>
                  setDefaultMaterialDraft((prev) => ({ ...prev, category: event.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={defaultMaterialDraft.description}
              onChange={(event) =>
                setDefaultMaterialDraft((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Density</Label>
                <Input
                  type="number"
                  step="any"
                  value={defaultMaterialDraft.density}
                onChange={(event) =>
                  setDefaultMaterialDraft((prev) => ({ ...prev, density: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Young’s Modulus</Label>
                <Input
                  type="number"
                  step="any"
                  value={defaultMaterialDraft.youngsModulus}
                onChange={(event) =>
                  setDefaultMaterialDraft((prev) => ({ ...prev, youngsModulus: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Poisson’s Ratio</Label>
                <Input
                  type="number"
                  step="any"
                  value={defaultMaterialDraft.poissonRatio}
                onChange={(event) =>
                  setDefaultMaterialDraft((prev) => ({ ...prev, poissonRatio: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Thermal Conductivity</Label>
                <Input
                  type="number"
                  step="any"
                  value={defaultMaterialDraft.thermalConductivity}
                onChange={(event) =>
                  setDefaultMaterialDraft((prev) => ({
                    ...prev,
                    thermalConductivity: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Melting Point</Label>
                <Input
                  type="number"
                  step="any"
                  value={defaultMaterialDraft.meltingPoint}
                onChange={(event) =>
                  setDefaultMaterialDraft((prev) => ({ ...prev, meltingPoint: event.target.value }))
                }
              />
            </div>
          </div>
          <CurveEditor
            title="Stress-Strain Curve"
            xLabel="Strain (mm)"
            yLabel="Stress (MPa)"
            xKey="strain"
            yKey="stress"
            points={defaultStressPointsState}
            onChange={setDefaultStressPointsState}
            onValidityChange={setDefaultStressValid}
          />
          <CurveEditor
            title="Thermal Expansion Curve"
            xLabel="Temperature (°C)"
            yLabel="Coefficient (µm)"
            xKey="temperature"
            yKey="coefficient"
            points={defaultThermalPointsState}
            onChange={setDefaultThermalPointsState}
            onValidityChange={setDefaultThermalValid}
          />
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDefaultMaterialOpen(false)}
              className="hover:text-primary hover:bg-primary/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveDefaultMaterial} 
              disabled={isDefaultMaterialSaveDisabled}
              className="opacity-90 hover:opacity-100 disabled:pointer-events-auto disabled:hover:opacity-50 disabled:cursor-not-allowed"
            >
              {activeDefaultMaterial ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={isDefaultGeometryOpen} onOpenChange={setIsDefaultGeometryOpen}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activeDefaultGeometry ? "Edit default geometry" : "Add default geometry"}</DialogTitle>
          <DialogDescription>Upload STL geometry for all users.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Name</Label>
            <Input
              value={defaultGeometryForm.name}
              onChange={(event) =>
                setDefaultGeometryForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </div>
          <div>
            <Label>STL file</Label>
            <div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm">
              <input
                id="admin-default-geometry-file"
                type="file"
                accept=".stl"
                className="hidden"
                onChange={(event) => handleDefaultGeometryFile(event.target.files?.[0] ?? null)}
              />
              <Label
                htmlFor="admin-default-geometry-file"
                className="cursor-pointer rounded-md border border-input bg-muted/40 px-3 py-1 text-xs font-semibold text-foreground shadow-sm hover:bg-muted"
              >
                Choose File
              </Label>
              <span
                className="text-xs text-muted-foreground"
                title={defaultGeometryFileName || activeDefaultGeometry?.originalName || "No file chosen"}
              >
                {formatFileLabel(defaultGeometryFileName || activeDefaultGeometry?.originalName)}
              </span>
            </div>
          </div>
          <div>
            {defaultGeometryPreview ? (
              <GeometryPreview format="stl" contentBase64={defaultGeometryPreview.split(",")[1]} />
            ) : activeDefaultGeometry ? (
              <AdminGeometryPreview
                geometryId={activeDefaultGeometry.id}
                format={activeDefaultGeometry.format}
                refreshToken={defaultGeometryRefreshToken}
              />
            ) : (
              <div className="text-xs text-muted-foreground rounded-xl border border-border bg-muted/10 p-3">Upload an STL to preview.</div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDefaultGeometryOpen(false)}
              className="hover:text-primary hover:bg-primary/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveDefaultGeometry} 
              disabled={isDefaultGeometrySaveDisabled}
              className="opacity-90 hover:opacity-100 disabled:pointer-events-auto disabled:hover:opacity-50 disabled:cursor-not-allowed"
            >
              {activeDefaultGeometry ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog
      open={Boolean(deleteUserTarget)}
      onOpenChange={(open) => {
        if (!open) setDeleteUserTarget(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user?</AlertDialogTitle>
          <AlertDialogDescription>
            This will deactivate <span className="italic font-semibold text-foreground">{deleteUserTarget?.email}</span>. You can’t undo this action.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="hover:text-primary hover:bg-primary/10">Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              if (deleteUserTarget) {
                void handleDeleteUser(deleteUserTarget);
              }
              setDeleteUserTarget(null);
            }}
            className="opacity-90 hover:opacity-100 disabled:hover:opacity-50"
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog
      open={Boolean(deleteDefaultMaterialTarget)}
      onOpenChange={(open) => {
        if (!open) setDeleteDefaultMaterialTarget(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete default material?</AlertDialogTitle>
          <AlertDialogDescription>
            This will deactivate <span className="italic font-semibold text-foreground">{deleteDefaultMaterialTarget?.name}</span> for all users.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="hover:text-primary hover:bg-primary/10">Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              if (deleteDefaultMaterialTarget) {
                void handleDeleteDefaultMaterial(deleteDefaultMaterialTarget);
              }
              setDeleteDefaultMaterialTarget(null);
            }}
            className="opacity-90 hover:opacity-100 disabled:hover:opacity-50"
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog
      open={Boolean(deleteDefaultGeometryTarget)}
      onOpenChange={(open) => {
        if (!open) setDeleteDefaultGeometryTarget(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete default geometry?</AlertDialogTitle>
          <AlertDialogDescription>
            This will deactivate <span className="italic font-semibold text-foreground">{deleteDefaultGeometryTarget?.name}</span> for all users.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="hover:text-primary hover:bg-primary/10">Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              if (deleteDefaultGeometryTarget) {
                void handleDeleteDefaultGeometry(deleteDefaultGeometryTarget);
              }
              setDeleteDefaultGeometryTarget(null);
            }}
            className="opacity-90 hover:opacity-100 disabled:hover:opacity-50"
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog
      open={Boolean(deleteUserMaterialTarget)}
      onOpenChange={(open) => {
        if (!open) setDeleteUserMaterialTarget(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user material?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete <span className="italic font-semibold text-foreground">{deleteUserMaterialTarget?.name}</span> from the user’s library.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="hover:text-primary hover:bg-primary/10">Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              if (deleteUserMaterialTarget) {
                void handleDeleteUserMaterial(deleteUserMaterialTarget);
              }
              setDeleteUserMaterialTarget(null);
            }}
            className="opacity-90 hover:opacity-100 disabled:hover:opacity-50"
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog
      open={Boolean(deleteUserGeometryTarget)}
      onOpenChange={(open) => {
        if (!open) setDeleteUserGeometryTarget(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user geometry?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete <span className="italic font-semibold text-foreground">{deleteUserGeometryTarget?.name}</span> from the user’s library.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="hover:text-primary hover:bg-primary/10">Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              if (deleteUserGeometryTarget) {
                void handleDeleteUserGeometry(deleteUserGeometryTarget);
              }
              setDeleteUserGeometryTarget(null);
            }}
            className="opacity-90 hover:opacity-100 disabled:hover:opacity-50"
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function AdminGeometryPreview({
  geometryId,
  format,
  refreshToken,
}: {
  geometryId: number;
  format: string;
  refreshToken?: string;
}) {
  const [contentBase64, setContentBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!geometryId || format.toLowerCase() !== "stl") {
      setContentBase64(null);
      setError(null);
      return;
    }
    const url = buildUrl(api.admin.defaultGeometries.content.path, { id: geometryId });
    fetch(url, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load geometry");
        return res.json();
      })
      .then((data) => {
        setContentBase64(data.contentBase64 || null);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load geometry");
        setContentBase64(null);
      });
  }, [geometryId, format, refreshToken]);

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-destructive">
        {error}
      </div>
    );
  }

  return <GeometryPreview format={format} contentBase64={contentBase64 || undefined} />;
}

function AdminUserGeometryPreview({
  geometryId,
  format,
  refreshToken,
}: {
  geometryId: number;
  format: string;
  refreshToken?: string;
}) {
  const [contentBase64, setContentBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!geometryId || format.toLowerCase() !== "stl") {
      setContentBase64(null);
      setError(null);
      return;
    }
    const url = buildUrl(api.geometries.content.path, { id: geometryId });
    fetch(url, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load geometry");
        return res.json();
      })
      .then((data) => {
        setContentBase64(data.contentBase64 || null);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load geometry");
        setContentBase64(null);
      });
  }, [geometryId, format, refreshToken]);

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-destructive">
        {error}
      </div>
    );
  }

  return <GeometryPreview format={format} contentBase64={contentBase64 || undefined} />;
}
