import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, AlertTriangle, Check, X, ChevronRight, ChevronDown, Building2, RefreshCw, MapPin, MessageSquare, Send, Clock, Lock, ShieldCheck, Trash2, Target, Bell, Navigation, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { MapHackMap, markerColor, markerEmoji, markerLabel, haversineMeters } from "@/components/MapHackMap";
import type { MapMarker, MapChatMessage, MapSafeZone } from "@shared/schema";
import type { MarkerType } from "@/components/MapHackMap";

type MapHackStatus = {
  phase: "trial" | "trial_expired" | "active" | "plan_expired";
  trialStartedAt: string | null;
  trialExpiresAt: string | null;
  daysLeft: number;
  plan: string | null;
  planExpiresAt: string | null;
};

type PlanId = "free" | "premium" | "day_pass" | "godisnji_premium";
type ViewMode = "loading" | "onboarding_full" | "onboarding_plan_only" | "map_view";

function planLabel(plan: string | null): string {
  if (plan === "admin") return "Admin";
  if (plan === "premium") return "Premium";
  if (plan === "day_pass") return "Day Pass";
  if (plan === "godisnji_premium") return "Godišnji Premium";
  if (plan === "free") return "Free plan";
  if (plan === "firma") return "Za Firme";
  return "Probni period";
}

function LightRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className={[
        "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        ok ? "bg-white/25" : "bg-black/10",
      ].join(" ")}>
        {ok
          ? <Check className="w-2.5 h-2.5 text-white" />
          : <X className="w-2.5 h-2.5 text-white/40" />}
      </div>
      <span className={ok ? "text-white/90 text-sm leading-snug" : "text-white/35 text-sm leading-snug line-through"}>{text}</span>
    </div>
  );
}

function GoldRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className={[
        "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        ok ? "bg-yellow-900/20" : "bg-yellow-900/10",
      ].join(" ")}>
        {ok
          ? <Check className="w-2.5 h-2.5 text-yellow-950" />
          : <X className="w-2.5 h-2.5 text-yellow-900/30" />}
      </div>
      <span className={ok ? "text-yellow-950 text-sm leading-snug" : "text-yellow-900/30 text-sm leading-snug line-through"}>{text}</span>
    </div>
  );
}

function FreeRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className={[
        "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        ok ? "bg-slate-300/60 dark:bg-slate-600/60" : "bg-slate-200 dark:bg-slate-700",
      ].join(" ")}>
        {ok
          ? <Check className="w-2.5 h-2.5 text-slate-700 dark:text-slate-300" />
          : <X className="w-2.5 h-2.5 text-slate-400" />}
      </div>
      <span className={ok
        ? "text-slate-700 dark:text-slate-200 text-sm leading-snug"
        : "text-slate-400 dark:text-slate-500 text-sm leading-snug line-through"
      }>{text}</span>
    </div>
  );
}

function Radio({ selected, light = true }: { selected: boolean; light?: boolean }) {
  if (light) {
    return (
      <div className={[
        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
        selected ? "bg-white border-white" : "border-white/40",
      ].join(" ")}>
        {selected && <Check className="w-3 h-3 text-slate-800" />}
      </div>
    );
  }
  return (
    <div className={[
      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
      selected ? "bg-slate-700 border-slate-700" : "border-slate-300 dark:border-slate-600",
    ].join(" ")}>
      {selected && <Check className="w-3 h-3 text-white" />}
    </div>
  );
}

function PlanCards({ selectedPlan, onSelect }: { selectedPlan: PlanId | null; onSelect: (p: PlanId) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {/* 1. FREE — bijela kartica */}
      <button
        type="button"
        data-testid="button-plan-free"
        onClick={() => onSelect("free")}
        className={[
          "w-full text-left rounded-md p-4 transition-all duration-200",
          "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700",
          selectedPlan === "free" ? "ring-2 ring-slate-400 ring-offset-1 ring-offset-background" : "",
        ].join(" ")}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="text-slate-800 dark:text-slate-100 font-extrabold text-base tracking-wide">FREE</span>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Osnovni pristup zajednici i mapi Novog Sada.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-slate-800 dark:text-slate-100 text-2xl font-extrabold leading-none">0</span>
            <span className="text-slate-400 text-xs">RSD</span>
            <Radio selected={selectedPlan === "free"} light={false} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 mt-3">
          <FreeRow ok text="Brza Mapa NS sa zonama i ulicama" />
          <FreeRow ok text="Live Chat (pisanje i čitanje u realnom vremenu)" />
          <FreeRow ok text="Smart SMS plaćanje zone (1 klik)" />
          <FreeRow ok text="Pregled privatnih parkinga za najam" />
          <FreeRow ok text="Vizuelni markeri za Pauka i 'Zlatni minut'" />
          <FreeRow ok={false} text="Push notifikacije (moraš stalno gledati u mapu)" />
          <FreeRow ok={false} text="Štek lokacije (zaključane)" />
        </div>
      </button>
      {/* 2. PREMIUM — zlatni gradijent */}
      <button
        type="button"
        data-testid="button-plan-premium"
        onClick={() => onSelect("premium")}
        className={[
          "w-full text-left rounded-md p-4 transition-all duration-200",
          selectedPlan === "premium" ? "ring-2 ring-yellow-600 ring-offset-2 ring-offset-background" : "",
        ].join(" ")}
        style={{
          background: "linear-gradient(145deg, #B8860B 0%, #DAA520 45%, #FFD700 100%)",
          boxShadow: selectedPlan === "premium"
            ? "0 6px 28px rgba(218,165,32,0.6)"
            : "0 2px 12px rgba(218,165,32,0.3)",
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-yellow-950 font-extrabold text-base tracking-wide">PREMIUM</span>
              <span className="bg-yellow-950/15 text-yellow-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                Preporučeno
              </span>
            </div>
            <p className="text-yellow-900/70 text-xs mt-0.5">Potpuna automatizacija i maksimalna zaštita.</p>
          </div>
          <Radio selected={selectedPlan === "premium"} light={false} />
        </div>
        <div className="mb-3">
          <span className="text-yellow-950 text-3xl font-extrabold leading-none">390</span>
          <span className="text-yellow-800 text-sm ml-1 font-medium">RSD / mes</span>
        </div>
        <p className="text-yellow-900/60 text-xs font-semibold mb-2 uppercase tracking-wide">Sve iz Free PLUS:</p>
        <div className="flex flex-col gap-1.5">
          <GoldRow ok text="Push Notifikacije: instant obaveštenje za Pauka i Zlatni minut" />
          <GoldRow ok text="Safe Zone Alarm: 'Sidro' marker → AUTO-PUSH u krugu 300m sa sirenom" />
          <GoldRow ok text="Štek Lokacije: otključana baza skrivenih parkinga" />
          <GoldRow ok text="Pauk Heatmap: analitika kretanja pauka po danima i satima" />
        </div>
      </button>
      {/* 3. DAY PASS — crvena */}
      <button
        type="button"
        data-testid="button-plan-day-pass"
        onClick={() => onSelect("day_pass")}
        className={[
          "w-full text-left rounded-md p-4 transition-all duration-200",
          selectedPlan === "day_pass" ? "ring-2 ring-red-300 ring-offset-2 ring-offset-background" : "",
        ].join(" ")}
        style={{
          background: "linear-gradient(145deg, #7f1d1d 0%, #dc2626 55%, #ef4444 100%)",
          boxShadow: selectedPlan === "day_pass"
            ? "0 6px 28px rgba(220,38,38,0.55)"
            : "0 2px 12px rgba(220,38,38,0.25)",
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="text-white font-extrabold text-base tracking-wide">DAY PASS</span>
            <p className="text-red-200 text-xs mt-0.5">Sve iz PREMIUM paketa na 24 sata.</p>
          </div>
          <Radio selected={selectedPlan === "day_pass"} light />
        </div>
        <div className="mb-3">
          <span className="text-white text-3xl font-extrabold leading-none">120</span>
          <span className="text-red-200 text-sm ml-1 font-medium">RSD · jednokratno</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <LightRow ok text="Sve Premium funkcije" />
          <LightRow ok text="Važi 24 sata" />
          <LightRow ok text="Bez pretplate" />
          <LightRow ok text="Idealno za goste NS, turiste, subotnji izlazak u centar" />
        </div>
      </button>
      {/* 4. GODIŠNJI PREMIUM — tamnoplava */}
      <button
        type="button"
        data-testid="button-plan-godisnji"
        onClick={() => onSelect("godisnji_premium")}
        className={[
          "w-full text-left rounded-md p-4 transition-all duration-200",
          selectedPlan === "godisnji_premium" ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-background" : "",
        ].join(" ")}
        style={{
          background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 60%, #3730a3 100%)",
          boxShadow: selectedPlan === "godisnji_premium"
            ? "0 6px 28px rgba(67,56,202,0.5)"
            : "0 2px 12px rgba(67,56,202,0.2)",
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-extrabold text-base tracking-wide">GODIŠNJI</span>
              <span className="bg-green-400 text-green-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                2 mes. gratis
              </span>
            </div>
            <p className="text-indigo-300 text-xs mt-0.5">Sve iz PREMIUM paketa na godinu dana.</p>
          </div>
          <Radio selected={selectedPlan === "godisnji_premium"} light />
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-white text-3xl font-extrabold leading-none">3.500</span>
          <span className="text-indigo-300 text-sm font-medium">RSD / god</span>
        </div>
        <div className="bg-white/10 rounded-md px-3 py-1.5 mb-3">
          <p className="text-indigo-200 text-xs font-semibold">Ušteda od preko 1.000 RSD — praktično 2 meseca besplatno</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <LightRow ok text="Sve Premium funkcije" />
          <LightRow ok text="365 dana pristupa" />
          <LightRow ok text="Ušteda od preko 1.000 RSD godišnje" />
          <LightRow ok text="Praktično 2 meseca besplatno" />
        </div>
      </button>
      {/* 5. ZA FIRME — teal puna kartica, non-selectable */}
      <div
        className="rounded-md p-4"
        data-testid="card-plan-firme"
        style={{
          background: "linear-gradient(145deg, #134e4a 0%, #0f766e 60%, #14b8a6 100%)",
          boxShadow: "0 2px 12px rgba(20,184,166,0.2)",
        }}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-200 flex-shrink-0" />
            <span className="text-white font-extrabold text-base tracking-wide">ZA FIRME</span>
          </div>
          <span className="text-teal-200 text-xs font-medium">Po dogovoru</span>
        </div>
        <p className="text-teal-100/80 text-sm mb-3">
          Posebna rešenja za flote vozila i poslovne korisnike.
        </p>
        <a
          href="mailto:info@cardrop.app"
          className="inline-block text-sm font-bold text-white underline underline-offset-2"
          data-testid="link-firma-email"
        >
          info@cardrop.app
        </a>
      </div>
    </div>
  );
}

function CompactHero({ title = "Map Hack NS" }: { title?: string }) {
  return (
    <div
      className="flex-shrink-0"
      style={{ background: "linear-gradient(160deg, #14532d 0%, #166534 55%, #15803d 100%)" }}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <Link href="/">
          <Button
            size="icon"
            variant="ghost"
            className="text-white/80"
            style={{ background: "transparent" }}
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <img src={parkInLogo} alt="CarDrop" className="w-6 h-6 rounded-md" />
          <span className="font-bold text-white text-base">{title}</span>
        </div>
        <div className="[&_button]:text-white/80 [&_svg]:text-white/70">
          <ThemeToggle />
        </div>
      </div>
      <p className="text-center text-green-200 text-xs pb-3 tracking-wide">
        NS · Štek parkinzi · Crvene zone · Live chat
      </p>
    </div>
  );
}

export default function MapHackNS() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const hasProfile = !!user?.mapNickname && user?.mapAvatarId != null;

  const { data: mapStatus, isLoading: statusLoading } = useQuery<MapHackStatus>({
    queryKey: ["/api/map-hack/status"],
    enabled: isAuthenticated && hasProfile,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      localStorage.setItem("cardrop-returnTo", "/map-hack");
      setLocation("/auth");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  let viewMode: ViewMode = "loading";
  if (!isLoading && isAuthenticated && user) {
    if (!hasProfile) {
      viewMode = "onboarding_full";
    } else if (statusLoading || !mapStatus) {
      viewMode = "loading";
    } else if (mapStatus.phase === "trial_expired" || mapStatus.phase === "plan_expired") {
      viewMode = "onboarding_plan_only";
    } else {
      viewMode = "map_view";
    }
  }

  // Map view state — declared unconditionally before early returns
  const [activeFilters, setActiveFilters] = useState<string[]>(["sve"]);
  const [activeTab, setActiveTab] = useState<MarkerType>("zlatni_minut");
  const [addMode, setAddMode] = useState<MarkerType | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isMapView = viewMode === "map_view";

  const { data: mapMarkers = [], refetch: refetchMarkers } = useQuery<MapMarker[]>({
    queryKey: ["/api/map-hack/markers"],
    enabled: isMapView,
    refetchInterval: isMapView ? 30000 : false,
  });

  const { data: chatMessages = [], refetch: refetchChat } = useQuery<MapChatMessage[]>({
    queryKey: ["/api/map-hack/chat"],
    enabled: isMapView,
    refetchInterval: isMapView ? 30000 : false,
  });

  const { data: safeZone = null } = useQuery<MapSafeZone | null>({
    queryKey: ["/api/map-hack/safe-zone"],
    enabled: isMapView,
  });

  const addMarkerMutation = useMutation({
    mutationFn: (data: { type: MarkerType; lat: number; lng: number }) =>
      apiRequest("POST", "/api/map-hack/markers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-hack/markers"] });
      setAddMode(null);
      toast({ title: "Marker dodat" });
    },
    onError: (err: any) => {
      toast({ title: "Greška", description: err.message, variant: "destructive" });
      setAddMode(null);
    },
  });

  const expireMarkerMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/map-hack/markers/${id}/expire`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-hack/markers"] });
      setSelectedMarker(null);
      toast({ title: "Marker uklonjen" });
    },
    onError: (err: any) => {
      toast({ title: "Greška", description: err.message, variant: "destructive" });
    },
  });

  const sendChatMutation = useMutation({
    mutationFn: (text: string) => apiRequest("POST", "/api/map-hack/chat", { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-hack/chat"] });
      setChatInput("");
    },
    onError: (err: any) => {
      toast({ title: "Greška", description: err.message, variant: "destructive" });
    },
  });

  const setSafeZoneMutation = useMutation({
    mutationFn: (data: { lat: number; lng: number; radiusMeters: number }) =>
      apiRequest("PUT", "/api/map-hack/safe-zone", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-hack/safe-zone"] });
      toast({ title: "Safe Zone postavljena" });
    },
    onError: (err: any) => {
      toast({ title: "Greška", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatOpen]);

  async function savePlan(planId: PlanId) {
    if (planId !== "free") {
      toast({
        title: "Uskoro dostupno",
        description: `Plaćanje za ${planId === "premium" ? "Premium" : planId === "day_pass" ? "Day Pass" : "Godišnji Premium"} — info@cardrop.app`,
      });
    }
    const res = await fetch("/api/map-hack/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "free" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Greška pri aktivaciji plana");
    }
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/map-hack/status"] });
  }

  async function handleEnterMap() {
    setError("");
    const nick = nickname.trim();
    if (nick.length < 3) { setError("Nadimak mora imati najmanje 3 znaka"); return; }
    if (!/^[a-zA-Z0-9_\-]+$/.test(nick)) { setError("Samo slova, brojevi, crtica i donja crta"); return; }
    if (selectedAvatar === null) { setError("Izaberi avatar"); return; }
    if (selectedPlan === null) { setError("Izaberi paket"); return; }

    setIsSaving(true);
    try {
      const profileRes = await fetch("/api/map-hack/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nick, avatarId: selectedAvatar }),
      });
      const profileData = await profileRes.json();
      if (!profileRes.ok) { setError(profileData.message || "Greška pri čuvanju profila"); return; }
      await savePlan(selectedPlan);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Greška. Pokušaj ponovo.";
      setError(msg);
      toast({ title: "Greška", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleChoosePlan() {
    setError("");
    if (selectedPlan === null) { setError("Izaberi paket"); return; }
    setIsSaving(true);
    try {
      await savePlan(selectedPlan);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Greška. Pokušaj ponovo.";
      setError(msg);
      toast({ title: "Greška", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  if (viewMode === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  if (viewMode === "onboarding_full") {
    const nickOk = nickname.trim().length >= 3 && /^[a-zA-Z0-9_\-]+$/.test(nickname.trim());
    const canSubmit = nickOk && selectedAvatar !== null && selectedPlan !== null;
    let hint = "";
    if (!selectedAvatar) hint = "Izaberi avatar";
    else if (!nickOk) hint = "Unesi nadimak (min. 3 znaka)";
    else if (!selectedPlan) hint = "Izaberi paket";

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <CompactHero />

        <div className="flex-1 overflow-y-auto pb-24">
          <div className="max-w-md mx-auto px-4">

            {/* Avatar */}
            <div className="pt-5 pb-4">
              <p className="text-sm font-bold text-foreground mb-3">
                1. Izaberi avatar
              </p>
              <div className="grid grid-cols-5 gap-2 justify-items-center">
                {Array.from({ length: 10 }, (_, i) => {
                  const avatarId = i + 1;
                  const isSelected = selectedAvatar === avatarId;
                  return (
                    <button
                      key={avatarId}
                      type="button"
                      data-testid={`button-avatar-${avatarId}`}
                      onClick={() => { setSelectedAvatar(avatarId); setError(""); }}
                      className={[
                        "w-[56px] h-[56px] p-0 transition-all duration-150 bg-[#F5EDD8] flex-shrink-0",
                        isSelected
                          ? "ring-2 ring-green-600 dark:ring-green-400 ring-offset-2 ring-offset-background rounded-full scale-105"
                          : "rounded-md ring-1 ring-border",
                      ].join(" ")}
                      aria-label={`Avatar ${avatarId}`}
                      aria-pressed={isSelected}
                    >
                      <img
                        src={`/avatars/avatar-${avatarId}.png`}
                        alt={`Avatar ${avatarId}`}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nadimak */}
            <div className="py-4 border-t border-border">
              <p className="text-sm font-bold text-foreground mb-2">
                2. Tvoj nadimak
              </p>
              <Input
                id="nickname-input"
                data-testid="input-nickname"
                placeholder="npr. ParkMajstor"
                value={nickname}
                onChange={(e) => { setNickname(e.target.value); setError(""); }}
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                className="border-2"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Vidljivo svima u chatu i na mapi. Slova, brojevi, _ i -.
              </p>
            </div>

            {/* Paket */}
            <div className="py-4 border-t border-border">
              <p className="text-sm font-bold text-foreground mb-1">
                3. Izaberi paket
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Ulaz je besplatan. Premium donosi sve štek lokacije i live zaštitu.
              </p>
              <PlanCards
                selectedPlan={selectedPlan}
                onSelect={(p) => { setSelectedPlan(p); setError(""); }}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium py-2" data-testid="text-error">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t px-4 py-3">
          <div className="max-w-md mx-auto">
            {hint && !isSaving && (
              <p className="text-xs text-muted-foreground text-center mb-2">{hint}</p>
            )}
            <Button
              className="w-full"
              onClick={handleEnterMap}
              disabled={!canSubmit || isSaving}
              data-testid="button-enter-map"
            >
              {isSaving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Čuvamo...</>
                : <><ChevronRight className="w-4 h-4 mr-2" />Uđi na mapu</>
              }
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "onboarding_plan_only") {
    const canSubmit = selectedPlan !== null;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <CompactHero />

        <div className="flex-1 overflow-y-auto pb-24">
          <div className="max-w-md mx-auto px-4">

            {/* Profil prikaz (read-only) */}
            <div className="flex items-center gap-3 py-4 border-b border-border">
              <div className="w-12 h-12 rounded-full bg-[#F5EDD8] overflow-hidden ring-2 ring-border flex-shrink-0">
                <img
                  src={`/avatars/avatar-${user.mapAvatarId ?? 1}.png`}
                  alt="avatar"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="font-bold text-foreground text-base" data-testid="text-map-nickname">
                  {user.mapNickname}
                </p>
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 text-amber-500" />
                  <p className="text-amber-600 dark:text-amber-400 text-xs">
                    {mapStatus?.phase === "trial_expired" ? "Probni period istekao" : "Plan istekao"} — obnovi pristup
                  </p>
                </div>
              </div>
            </div>

            <div className="py-4">
              <p className="text-sm font-bold text-foreground mb-1">Izaberi paket</p>
              <p className="text-xs text-muted-foreground mb-4">
                Izaberi plan i nastavi na mapu.
              </p>
              <PlanCards
                selectedPlan={selectedPlan}
                onSelect={(p) => { setSelectedPlan(p); setError(""); }}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium py-2" data-testid="text-error-plan">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t px-4 py-3">
          <div className="max-w-md mx-auto">
            {!canSubmit && !isSaving && (
              <p className="text-xs text-muted-foreground text-center mb-2">Izaberi paket</p>
            )}
            <Button
              className="w-full"
              onClick={handleChoosePlan}
              disabled={!canSubmit || isSaving}
              data-testid="button-choose-plan"
            >
              {isSaving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Aktiviramo...</>
                : <><ChevronRight className="w-4 h-4 mr-2" />Nastavi na mapu</>
              }
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const showTrialBanner = mapStatus?.phase === "trial" && (mapStatus?.daysLeft ?? 30) <= 7;
  const isPremium = user.isAdmin || ["premium", "day_pass", "godisnji_premium", "firma"].includes(mapStatus?.plan ?? "");

  const paukInZone = safeZone?.lat && safeZone?.lng
    ? mapMarkers.filter(m =>
        m.type === "pauk" &&
        haversineMeters(
          parseFloat(safeZone.lat), parseFloat(safeZone.lng),
          parseFloat(m.lat), parseFloat(m.lng)
        ) <= safeZone.radiusMeters
      )
    : [];

  const handleResetProfile = async () => {
    setIsResetting(true);
    try {
      const res = await fetch("/api/map-hack/reset-profile", { method: "POST" });
      if (!res.ok) throw new Error("Reset failed");
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/map-hack/status"] });
      setLocation("/map-hack");
    } catch {
      toast({ title: "Greška", description: "Reset profila nije uspeo", variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  };

  const timeAgo = (d: string | Date) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "upravo";
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h`;
  };

  const timeLeft = (d: string | Date | null) => {
    if (!d) return null;
    const diff = new Date(d).getTime() - Date.now();
    if (diff <= 0) return "isteklo";
    const mins = Math.ceil(diff / 60000);
    return mins < 60 ? `${mins}min` : `${Math.ceil(mins / 60)}h`;
  };

  const latestChatMsg = chatMessages[chatMessages.length - 1];
  const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f97316","#22c55e","#14b8a6","#3b82f6","#a16207"];

  const [izdajOpen, setIzdajOpen] = useState(false);
  const [aktivnoOpen, setAktivnoOpen] = useState(false);

  const firstZlatni = mapMarkers.find(m => m.type === "zlatni_minut");
  const firstPauk = mapMarkers.find(m => m.type === "pauk");
  const alarmActive = paukInZone.length > 0;

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#0d1117" }}>

      {/* ── Header: Map Hack NS title + bell + chat ── */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 z-30"
        style={{ background: "#0d1117", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Title */}
        <p className="text-lg font-bold text-white tracking-tight" data-testid="text-map-title">Map Hack NS</p>
        {/* Right: bell + separator + chat */}
        <div className="flex items-center gap-3">
          {/* Bell alarm icon */}
          <button
            data-testid="btn-alarm-bell"
            onClick={() => alarmActive ? setActiveTab("safe_zone") : (showTrialBanner ? undefined : undefined)}
            className="relative flex items-center justify-center"
            style={{ width: 34, height: 34, borderRadius: "50%",
              background: alarmActive ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.07)",
              border: `1px solid ${alarmActive ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}` }}>
            <Bell size={15} style={{ color: alarmActive ? "#fca5a5" : "#9ca3af" }} />
            {(alarmActive || showTrialBanner) && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
                style={{ width: 16, height: 16, fontSize: 8,
                  background: alarmActive ? "#ef4444" : "#f59e0b" }}>
                {alarmActive ? paukInZone.length : mapStatus?.daysLeft}
              </span>
            )}
          </button>

          {/* Separator */}
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.12)" }} />

          {/* Chat bubble */}
          <button
            data-testid="btn-toggle-chat"
            onClick={() => setChatOpen(p => !p)}
            className="relative flex items-center justify-center"
            style={{ width: 34, height: 34, borderRadius: "50%",
              background: chatOpen ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.07)",
              border: `1px solid ${chatOpen ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.12)"}` }}>
            <MessageSquare size={15} style={{ color: chatOpen ? "#93c5fd" : "#9ca3af" }} />
            {chatMessages.length > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
                style={{ width: 16, height: 16, background: "#3b82f6", fontSize: 8 }}>
                {chatMessages.length > 9 ? "9+" : chatMessages.length}
              </span>
            )}
          </button>

          {user.isAdmin && (
            <button
              onClick={handleResetProfile} disabled={isResetting} data-testid="button-reset-profile"
              className="flex items-center justify-center"
              style={{ width: 28, height: 28, borderRadius: "50%",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {isResetting ? <Loader2 size={11} className="animate-spin text-gray-500" /> : <RefreshCw size={11} className="text-gray-600" />}
            </button>
          )}
        </div>
      </div>

      {/* ── Filter tabs row ── */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0 overflow-x-auto"
        style={{ background: "#0d1117", borderBottom: "1px solid rgba(255,255,255,0.06)", scrollbarWidth: "none" }}>
        {([
          { key: "zlatni_minut", label: "Parking", icon: "🅿" },
          { key: "pauk",         label: "Pauk",    icon: "🚛" },
          { key: "stek",        label: "Štek",    icon: "🏠" },
          { key: "safe_zone",   label: "Safe Zone", icon: "🛡" },
        ] as const).map(f => {
          const isActive = activeFilters.includes(f.key);
          return (
            <button
              key={f.key}
              data-testid={`filter-tab-${f.key}`}
              onClick={() => {
                setActiveFilters(prev => {
                  const without = prev.filter(x => x !== "sve" && x !== f.key);
                  const next = prev.includes(f.key) ? without : [...without, f.key];
                  return next.length === 0 ? ["sve"] : next;
                });
              }}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: isActive ? markerColor(f.key) + "22" : "rgba(255,255,255,0.05)",
                border: `1px solid ${isActive ? markerColor(f.key) + "66" : "rgba(255,255,255,0.1)"}`,
                color: isActive ? markerColor(f.key) : "#9ca3af",
              }}>
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          );
        })}
        {/* Aktivno dropdown */}
        <button
          data-testid="btn-filter-aktivno"
          onClick={() => setAktivnoOpen(p => !p)}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ml-auto"
          style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.4)", color: "#f97316" }}>
          Aktivno ▾
        </button>
      </div>

      {/* ── Map area ── */}
      <div className="relative flex-shrink-0" style={{ height: "44vh", minHeight: 200 }}>
        <MapHackMap
          markers={mapMarkers}
          activeFilters={activeFilters}
          safeZone={safeZone}
          isPremium={isPremium}
          isAddMode={addMode !== null}
          onMarkerClick={setSelectedMarker}
          onMapClick={(lat, lng) => {
            if (!addMode) return;
            addMarkerMutation.mutate({ type: addMode, lat, lng });
          }}
          onContextMenu={(lat, lng) => {
            setSafeZoneMutation.mutate({ lat, lng, radiusMeters: 300 });
          }}
        />

        {/* Add-mode banner */}
        {addMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "#1e2330", border: `1px solid ${markerColor(addMode)}`, color: markerColor(addMode) }}>
            <Target size={12} />
            Tapni na mapu — {markerLabel(addMode)}
            <button onClick={() => setAddMode(null)} className="ml-1 opacity-60 hover:opacity-100">
              <X size={11} />
            </button>
          </div>
        )}

        {/* Chat preview pill — bottom-left of map */}
        {latestChatMsg && !chatOpen && (
          <button
            data-testid="btn-chat-preview-pill"
            onClick={() => setChatOpen(true)}
            className="absolute bottom-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(15,20,35,0.88)", border: "1px solid rgba(255,255,255,0.14)", maxWidth: "70%" }}>
            <div className="w-5 h-5 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{ background: AVATAR_COLORS[(latestChatMsg.mapAvatarId ?? 1) % AVATAR_COLORS.length] }}>
              <img src={`/avatars/avatar-${latestChatMsg.mapAvatarId ?? 1}.png`} alt="" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs text-gray-300 truncate">
              {latestChatMsg.text.slice(0, 28)}{latestChatMsg.text.length > 28 ? "···" : ""}
            </span>
          </button>
        )}
      </div>

      {/* ── Action bar below map ── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2"
        style={{ background: "#0f1219", borderTop: "1px solid rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {([
          { type: "zlatni_minut", label: "Zlatni Minut", icon: "⏱" },
          { type: "pauk",         label: "Pauk Radar",   icon: "🚛" },
          { type: "stek",        label: "Štek Lokacija", icon: "🏠" },
        ] as const).map(item => {
          const locked = item.type === "stek" && !isPremium;
          const count = mapMarkers.filter(m => m.type === item.type).length;
          return (
            <button
              key={item.type}
              data-testid={`action-bar-${item.type}`}
              onClick={() => {
                setActiveTab(item.type);
                if (!locked) setAddMode(item.type);
              }}
              className="flex-1 flex flex-col items-center py-1.5 rounded-lg"
              style={{
                background: activeTab === item.type ? markerColor(item.type) + "22" : "rgba(255,255,255,0.04)",
                border: `1px solid ${activeTab === item.type ? markerColor(item.type) + "55" : "rgba(255,255,255,0.08)"}`,
              }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span className="text-xs font-medium mt-0.5" style={{ color: activeTab === item.type ? markerColor(item.type) : "#6b7280", fontSize: 10 }}>
                {item.label.split(" ")[0]}{locked ? " 🔒" : count > 0 ? ` (${count})` : ""}
              </span>
            </button>
          );
        })}

        {/* + Izdaj dropdown */}
        <div className="relative">
          <button
            data-testid="btn-izdaj"
            onClick={() => setIzdajOpen(p => !p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold"
            style={{ background: "#16a34a", border: "1px solid rgba(34,197,94,0.4)", color: "#fff" }}>
            <span>+ Izdaj</span>
            <ChevronDown size={12} />
          </button>
          {izdajOpen && (
            <div className="absolute bottom-full right-0 mb-2 rounded-lg overflow-hidden z-30"
              style={{ background: "#1a1f2b", border: "1px solid rgba(255,255,255,0.12)", minWidth: 150 }}>
              {([
                { type: "zlatni_minut", label: "Zlatni Minut", icon: "⏱" },
                { type: "pauk",         label: "Pauk Radar",   icon: "🚛" },
                { type: "stek",        label: "Štek Lokacija", icon: "🏠" },
                { type: "safe_zone",   label: "Safe Zone",     icon: "🛡" },
              ] as const).map(item => {
                const locked = item.type === "stek" && !isPremium;
                return (
                  <button
                    key={item.type}
                    data-testid={`izdaj-${item.type}`}
                    onClick={() => {
                      setIzdajOpen(false);
                      if (locked) return;
                      setAddMode(item.type);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left"
                    style={{ color: locked ? "#4b5563" : "#e5e7eb", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                    {locked && <Lock size={9} className="ml-auto text-gray-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Info cards (scrollable bottom section) ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
        style={{ background: "#0d1117" }}>

        {/* Selected marker detail card */}
        {selectedMarker && (
          <div className="rounded-xl p-3" data-testid="card-selected-marker"
            style={{ background: `${markerColor(selectedMarker.type)}14`, border: `1px solid ${markerColor(selectedMarker.type)}30` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 18 }}>{markerEmoji(selectedMarker.type)}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: markerColor(selectedMarker.type) }}>
                    {markerLabel(selectedMarker.type)}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <Clock size={9} />
                    {timeAgo(selectedMarker.createdAt)}
                    {selectedMarker.expiresAt && (
                      <span style={{ color: "#f97316" }}>· {timeLeft(selectedMarker.expiresAt)}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                {user.isAdmin && (
                  <Button size="icon" variant="ghost" data-testid="btn-expire-marker"
                    onClick={() => expireMarkerMutation.mutate(selectedMarker.id)} className="text-red-400">
                    <Trash2 size={13} />
                  </Button>
                )}
                <Button size="icon" variant="ghost" data-testid="btn-close-marker-info"
                  onClick={() => setSelectedMarker(null)} className="text-gray-400">
                  <X size={13} />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Card 1 — Zlatni Minut */}
        <div className="rounded-xl p-3" data-testid="card-zlatni-minut"
          style={{ background: "#12161e", border: "1px solid rgba(249,115,22,0.2)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: "rgba(249,115,22,0.15)" }}>
                <Clock size={16} style={{ color: "#f97316" }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Zlatni Minut</p>
                <p className="text-xs" style={{ color: "#6b7280" }}>Slobodna mesta</p>
              </div>
            </div>
            <button onClick={() => { refetchMarkers(); }} className="text-gray-600" data-testid="btn-refresh-zlatni">
              <RefreshCw size={11} />
            </button>
          </div>
          {firstZlatni ? (
            <>
              <p className="text-xs mb-2" style={{ color: "#9ca3af" }}>
                Izlazim za:{" "}
                <span style={{ color: "#f97316", fontWeight: 600 }}>
                  {firstZlatni.expiresAt ? timeLeft(firstZlatni.expiresAt) : timeAgo(firstZlatni.createdAt)}
                </span>
                {" | "}Slobodno za: <span style={{ color: "#fbbf24", fontWeight: 600 }}>~5 min</span>
              </p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {mapMarkers.filter(m => m.type === "zlatni_minut").map(m => (
                    <span key={m.id} className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(249,115,22,0.12)", color: "#fdba74", border: "1px solid rgba(249,115,22,0.25)" }}>
                      {m.expiresAt ? timeLeft(m.expiresAt) : timeAgo(m.createdAt)}
                    </span>
                  ))}
                </div>
                <a
                  data-testid="btn-navigiraj-zlatni"
                  href={`https://www.google.com/maps?q=${firstZlatni.lat},${firstZlatni.lng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(249,115,22,0.2)", color: "#f97316", border: "1px solid rgba(249,115,22,0.35)" }}>
                  Navigiraj <Navigation size={10} />
                </a>
              </div>
            </>
          ) : (
            <p className="text-xs py-1" style={{ color: "#4b5563" }}>
              Nema slobodnih mesta u blizini. Budi prvi koji prijavi!
            </p>
          )}
          <button onClick={() => setAddMode("zlatni_minut")}
            data-testid="btn-add-zlatni_minut"
            className="mt-2.5 w-full py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.22)", color: "#f97316" }}>
            + Prijavi slobodno mesto
          </button>
        </div>

        {/* Card 2 — Pauk Radar */}
        <div className="rounded-xl p-3" data-testid="card-pauk-radar"
          style={{ background: "#12161e", border: `1px solid ${firstPauk ? "rgba(239,68,68,0.4)" : "rgba(239,68,68,0.15)"}` }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-lg"
                style={{ width: 32, height: 32, background: firstPauk ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.08)" }}>
                <Truck size={16} style={{ color: firstPauk ? "#f87171" : "#6b7280" }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Pauk Radar</p>
                <p className="text-xs" style={{ color: "#6b7280" }}>
                  {firstPauk ? "Pauk aktivan!" : "Zona čista"}
                </p>
              </div>
            </div>
            {alarmActive && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold animate-pulse"
                style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.4)" }}>
                ALARM
              </span>
            )}
          </div>
          {firstPauk ? (
            <>
              <p className="text-xs mb-2.5 font-medium" style={{ color: "#fca5a5" }}>
                Pauk viđen u blizini · {timeAgo(firstPauk.createdAt)}
              </p>
              <div className="flex gap-2">
                <button
                  data-testid="btn-push-alert"
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171" }}>
                  PUSH ALERT
                </button>
                <button
                  data-testid="btn-detalji-pauk"
                  onClick={() => setActiveTab("pauk")}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af" }}>
                  Detalji &rsaquo;&rsaquo;
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs py-1" style={{ color: "#4b5563" }}>
              Sve čisto! Nema pauka u blizini.
            </p>
          )}
          <button onClick={() => setAddMode("pauk")}
            data-testid="btn-add-pauk"
            className="mt-2.5 w-full py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
            + Prijavi pauka
          </button>
        </div>

        {/* Card 3 — Safe Zone Alarm */}
        <div className="rounded-xl p-3" data-testid="card-safe-zone-alarm"
          style={{ background: "#12161e", border: `1px solid ${alarmActive ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.2)"}` }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-lg"
                style={{ width: 32, height: 32, background: alarmActive ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.12)" }}>
                {alarmActive
                  ? <AlertTriangle size={16} style={{ color: "#f87171" }} />
                  : <ShieldCheck size={16} style={{ color: "#93c5fd" }} />}
              </div>
              <div>
                <p className="text-sm font-bold text-white">Safe Zone Alarm</p>
                <p className="text-xs" style={{ color: "#6b7280" }}>
                  {safeZone ? `${safeZone.radiusMeters}m radijus` : "Nije postavljena"}
                </p>
              </div>
            </div>
            {/* Timer-style icon on right when alarm active */}
            {alarmActive && (
              <div className="flex items-center justify-center rounded-full"
                style={{ width: 36, height: 36, background: "rgba(239,68,68,0.12)", border: "2px solid rgba(239,68,68,0.3)" }}>
                <Clock size={16} style={{ color: "#f87171" }} />
              </div>
            )}
          </div>
          {alarmActive ? (
            <p className="text-xs font-bold mb-1 animate-pulse" style={{ color: "#f87171" }}>
              PAUK JE BLIZU TVOG AUTA! ({paukInZone.length} u zoni)
            </p>
          ) : safeZone ? (
            <p className="text-xs" style={{ color: "#4b5563" }}>
              Zona aktivna — nema pauka u radijusu. Alarm Aktiviran!
            </p>
          ) : (
            <p className="text-xs" style={{ color: "#4b5563" }}>
              Postavi zonu da dobijaš alarm kada pauk uđe u tvoj radijus.
            </p>
          )}
          <button
            data-testid="btn-set-safe-zone"
            onClick={() => setSafeZoneMutation.mutate({ lat: 45.2671, lng: 19.8335, radiusMeters: 300 })}
            className="mt-2.5 w-full py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.22)", color: "#93c5fd" }}>
            {safeZone ? "Resetuj safe zone" : "Postavi Safe Zone"}
          </button>
        </div>
      </div>


      {/* Chat panel (overlay) */}
      {chatOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col"
          data-testid="panel-chat"
          style={{ background: "#1a1f2b", borderTop: "1px solid rgba(255,255,255,0.1)", maxHeight: "55vh" }}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
            <span className="text-sm font-semibold text-white">Park Chat</span>
            <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ minHeight: 120 }}>
            {chatMessages.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">Nema poruka. Budi prvi!</p>
            )}
            {chatMessages.map(msg => (
              <div key={msg.id} className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                  style={{ background: AVATAR_COLORS[(msg.avatarId - 1) % AVATAR_COLORS.length], fontSize: 9 }}>
                  {msg.avatarId}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-300">{msg.mapNickname}</span>
                    <span className="text-xs text-gray-600">{timeAgo(msg.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-200 break-words">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border-t border-white/10">
            <Input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && chatInput.trim()) sendChatMutation.mutate(chatInput); }}
              placeholder="Napiši poruku..."
              data-testid="input-chat-message"
              className="h-9 text-sm"
              style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", color: "#e5e7eb" }}
              maxLength={280}
            />
            <Button size="icon" data-testid="btn-send-chat"
              onClick={() => { if (chatInput.trim()) sendChatMutation.mutate(chatInput); }}
              disabled={sendChatMutation.isPending || !chatInput.trim()}
              style={{ background: "#f97316" }}>
              <Send size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
