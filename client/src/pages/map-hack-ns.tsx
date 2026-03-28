import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, AlertTriangle, Check, X, ChevronRight, Building2, RefreshCw, MapPin, MessageSquare, Send, Clock, Lock, ShieldCheck, Trash2, Target } from "lucide-react";
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
  const ACTION_TABS: MarkerType[] = ["zlatni_minut", "pauk", "stek", "safe_zone"];

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#0d1117" }}>

      {/* Top header */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 z-30"
        style={{ background: "rgba(13,17,23,0.95)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button size="icon" variant="ghost" className="text-gray-300 h-8 w-8" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="w-7 h-7 rounded-full bg-[#F5EDD8] overflow-hidden ring-1 ring-white/20 flex-shrink-0">
            <img src={`/avatars/avatar-${user.mapAvatarId ?? 1}.png`} alt="avatar" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white leading-tight" data-testid="text-map-nickname">{user.mapNickname}</p>
            <p className="text-xs" style={{ color: "#6b7280" }}>{planLabel(mapStatus?.plan ?? null)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Chat bubble with latest message preview */}
          <button
            data-testid="btn-toggle-chat"
            onClick={() => setChatOpen(p => !p)}
            className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
            style={{
              background: chatOpen ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${chatOpen ? "rgba(249,115,22,0.5)" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            <MessageSquare size={13} style={{ color: chatOpen ? "#f97316" : "#9ca3af" }} />
            {latestChatMsg ? (
              <span className="text-xs max-w-[100px] truncate" style={{ color: "#9ca3af" }}>
                {latestChatMsg.mapNickname}: {latestChatMsg.text.slice(0, 20)}{latestChatMsg.text.length > 20 ? "..." : ""}
              </span>
            ) : (
              <span className="text-xs" style={{ color: "#6b7280" }}>Park Chat</span>
            )}
            {chatMessages.length > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
                style={{ width: 15, height: 15, background: "#ef4444", fontSize: 8 }}>
                {chatMessages.length > 9 ? "9+" : chatMessages.length}
              </span>
            )}
          </button>

          {/* Bell / alarm badge */}
          <div className="relative">
            {showTrialBanner ? (
              <Link href="/map-hack/subscribe">
                <button className="relative flex items-center justify-center rounded-full"
                  data-testid="banner-trial-expiry"
                  style={{ width: 32, height: 32, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}>
                  <AlertTriangle size={14} style={{ color: "#fbbf24" }} />
                  <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
                    style={{ width: 14, height: 14, background: "#f59e0b", fontSize: 7 }}>
                    {mapStatus?.daysLeft}
                  </span>
                </button>
              </Link>
            ) : paukInZone.length > 0 ? (
              <button className="relative flex items-center justify-center rounded-full"
                data-testid="banner-safe-zone-alarm"
                style={{ width: 32, height: 32, background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)" }}>
                <ShieldCheck size={14} style={{ color: "#fca5a5" }} />
                <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
                  style={{ width: 14, height: 14, background: "#ef4444", fontSize: 8 }}>
                  {paukInZone.length}
                </span>
              </button>
            ) : null}
          </div>

          {user.isAdmin && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600"
              onClick={handleResetProfile} disabled={isResetting} data-testid="button-reset-profile">
              {isResetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Main content: map (65%) + info panel (35%) */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Map area — 65% of remaining height */}
        <div className="relative" style={{ flex: "0 0 65%" }}>
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

          {/* Add-mode banner (floats over map) */}
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

          {/* Map filter chips (float top of map) */}
          <div className="absolute bottom-2 left-2 right-2 z-10 flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
            {(["sve", "zlatni_minut", "pauk", "stek", "safe_zone"] as const).map(f => {
              const isActive = activeFilters.includes(f);
              return (
                <button
                  key={f}
                  data-testid={`filter-tab-${f}`}
                  onClick={() => {
                    if (f === "sve") { setActiveFilters(["sve"]); return; }
                    setActiveFilters(prev => {
                      const without = prev.filter(x => x !== "sve" && x !== f);
                      const next = prev.includes(f) ? without : [...without, f];
                      return next.length === 0 ? ["sve"] : next;
                    });
                  }}
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    background: isActive ? (f === "sve" ? "#6366f1" : markerColor(f)) : "rgba(13,17,23,0.85)",
                    color: isActive ? "#fff" : "#9ca3af",
                    border: `1px solid ${isActive ? "transparent" : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  {f === "sve" ? "Sve" : `${markerEmoji(f)} ${mapMarkers.filter(m => m.type === f).length}`}
                  {f === "stek" && !isPremium && <Lock size={8} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Info panel — 35% with tab bar at bottom */}
        <div className="flex flex-col flex-1 overflow-hidden"
          style={{ background: "#12161e", borderTop: "1px solid rgba(255,255,255,0.08)" }}>

          {/* Tab-driven info card area */}
          <div className="flex-1 overflow-y-auto px-3 py-2">

            {/* Zlatni Minut tab */}
            {activeTab === "zlatni_minut" && (
              <div data-testid="info-card-zlatni-minut">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: "#f97316" }}>⏱ Slobodna mesta (10min)</span>
                  <button onClick={() => { refetchMarkers(); refetchChat(); }}
                    className="text-gray-500 hover:text-gray-300" data-testid="btn-refresh-map">
                    <RefreshCw size={11} />
                  </button>
                </div>
                {mapMarkers.filter(m => m.type === "zlatni_minut").length === 0 ? (
                  <p className="text-xs text-gray-600 py-2">Nema aktivnih Zlatnih Minuta. Budi prvi koji prijavi slobodno mesto!</p>
                ) : (
                  <div className="space-y-1.5">
                    {mapMarkers.filter(m => m.type === "zlatni_minut").slice(0, 5).map(m => (
                      <div key={m.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
                        style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">⏱</span>
                          <span className="text-xs text-gray-300">{m.label || "Slobodno mesto"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock size={9} />
                          {m.expiresAt ? <span style={{ color: "#f97316" }}>{timeLeft(m.expiresAt)}</span> : timeAgo(m.createdAt)}
                          {user.isAdmin && (
                            <button onClick={() => expireMarkerMutation.mutate(m.id)} className="text-red-500" data-testid="btn-expire-marker">
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setAddMode("zlatni_minut")}
                  data-testid="btn-add-zlatni_minut"
                  className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316" }}>
                  + Prijavi slobodno mesto
                </button>
              </div>
            )}

            {/* Pauk tab */}
            {activeTab === "pauk" && (
              <div data-testid="info-card-pauk">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: "#ef4444" }}>🚛 Pauk Radari (45min)</span>
                  {paukInZone.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.4)" }}>
                      ALARM: {paukInZone.length} u zoni!
                    </span>
                  )}
                </div>
                {mapMarkers.filter(m => m.type === "pauk").length === 0 ? (
                  <p className="text-xs text-gray-600 py-2">Nema aktivnih pauk radara. Čisto!</p>
                ) : (
                  <div className="space-y-1.5">
                    {mapMarkers.filter(m => m.type === "pauk").slice(0, 5).map(m => {
                      const inZone = paukInZone.some(p => p.id === m.id);
                      return (
                        <div key={m.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
                          style={{
                            background: inZone ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.06)",
                            border: `1px solid ${inZone ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.15)"}`,
                          }}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🚛</span>
                            <span className="text-xs" style={{ color: inZone ? "#fca5a5" : "#d1d5db" }}>
                              Pauk radar{inZone ? " — U VAŠOJ ZONI" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock size={9} />
                            {m.expiresAt ? <span style={{ color: "#ef4444" }}>{timeLeft(m.expiresAt)}</span> : timeAgo(m.createdAt)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button onClick={() => setAddMode("pauk")}
                  data-testid="btn-add-pauk"
                  className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>
                  + Prijavi pauk radara
                </button>
              </div>
            )}

            {/* Štek tab */}
            {activeTab === "stek" && (
              <div data-testid="info-card-stek">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: "#22c55e" }}>🅿 Štek mesta</span>
                  {!isPremium && (
                    <Link href="/map-hack/subscribe">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(218,165,32,0.15)", color: "#fbbf24", border: "1px solid rgba(218,165,32,0.3)" }}>
                        Premium
                      </span>
                    </Link>
                  )}
                </div>
                {!isPremium ? (
                  <div className="flex flex-col items-center gap-2 py-3">
                    <Lock size={22} style={{ color: "#4b5563" }} />
                    <p className="text-xs text-gray-500 text-center max-w-xs">
                      Štek lokacije su dostupne Premium korisnicima. Nadogradi plan da vidiš i dodaješ privatna parking mesta.
                    </p>
                    <Link href="/map-hack/subscribe">
                      <Button size="sm" className="text-xs h-7" data-testid="button-view-plans">Nadogradi plan</Button>
                    </Link>
                  </div>
                ) : mapMarkers.filter(m => m.type === "stek").length === 0 ? (
                  <p className="text-xs text-gray-600 py-2">Nema štek mesta. Dodaj prvo!</p>
                ) : (
                  <div className="space-y-1.5">
                    {mapMarkers.filter(m => m.type === "stek").slice(0, 5).map(m => (
                      <div key={m.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
                        style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)" }}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🅿</span>
                          <span className="text-xs text-gray-300">{m.label || "Štek mesto"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {timeAgo(m.createdAt)}
                          {user.isAdmin && (
                            <button onClick={() => expireMarkerMutation.mutate(m.id)} className="text-red-500">
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {isPremium && (
                  <button onClick={() => setAddMode("stek")}
                    data-testid="btn-add-stek"
                    className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}>
                    + Dodaj štek mesto
                  </button>
                )}
              </div>
            )}

            {/* Safe Zone tab */}
            {activeTab === "safe_zone" && (
              <div data-testid="info-card-safe-zone">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: "#3b82f6" }}>🛡 Safe Zone alarm</span>
                  {paukInZone.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium animate-pulse"
                      style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5" }}>
                      PAUK U ZONI!
                    </span>
                  )}
                </div>
                {safeZone ? (
                  <div className="space-y-2">
                    <div className="px-2.5 py-2 rounded-lg"
                      style={{ background: paukInZone.length > 0 ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.08)",
                        border: `1px solid ${paukInZone.length > 0 ? "rgba(239,68,68,0.4)" : "rgba(59,130,246,0.2)"}` }}>
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={14} style={{ color: paukInZone.length > 0 ? "#fca5a5" : "#93c5fd" }} />
                        <div>
                          <p className="text-xs font-medium" style={{ color: paukInZone.length > 0 ? "#fca5a5" : "#93c5fd" }}>
                            Safe Zone aktivna · {safeZone.radiusMeters}m radijus
                          </p>
                          {paukInZone.length > 0 ? (
                            <p className="text-xs" style={{ color: "#f87171" }}>
                              {paukInZone.length} pauk radar{paukInZone.length > 1 ? "a" : ""} u vašoj zoni!
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500">Zona čista. Nema aktualnih pauk radara.</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">Desni klik na mapu da pomeriš zonu.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 py-2">
                    <p className="text-xs text-gray-500">
                      Safe Zone alarm vas obaveštava kada pauk uđe u vaš radijus. Desni klik na mapu da postavite zonu.
                    </p>
                  </div>
                )}
                <button
                  data-testid="btn-add-safe_zone"
                  onClick={() => setSafeZoneMutation.mutate({ lat: 45.2671, lng: 19.8335, radiusMeters: 300 })}
                  className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#93c5fd" }}>
                  {safeZone ? "Resetuj na centar" : "Postavi Safe Zone na centar NS"}
                </button>
              </div>
            )}

            {/* Tapped marker info (shown in panel if marker selected) */}
            {selectedMarker && (
              <div className="mt-2 rounded-lg p-2.5" data-testid="card-selected-marker"
                style={{ background: `${markerColor(selectedMarker.type)}12`, border: `1px solid ${markerColor(selectedMarker.type)}30` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{markerEmoji(selectedMarker.type)}</span>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: markerColor(selectedMarker.type) }}>
                        {markerLabel(selectedMarker.type)}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
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
                        onClick={() => expireMarkerMutation.mutate(selectedMarker.id)} className="h-7 w-7 text-red-400">
                        <Trash2 size={12} />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" data-testid="btn-close-marker-info"
                      onClick={() => setSelectedMarker(null)} className="h-7 w-7 text-gray-400">
                      <X size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4-tab action bar */}
          <div className="flex-shrink-0 flex border-t"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            {ACTION_TABS.map(tab => {
              const isActive = activeTab === tab;
              const locked = tab === "stek" && !isPremium;
              const hasAlarm = tab === "pauk" && paukInZone.length > 0;
              return (
                <button
                  key={tab}
                  data-testid={`action-tab-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 flex flex-col items-center justify-center py-2 relative"
                  style={{
                    background: isActive ? `${markerColor(tab)}18` : "transparent",
                    borderTop: isActive ? `2px solid ${markerColor(tab)}` : "2px solid transparent",
                    color: isActive ? markerColor(tab) : "#6b7280",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{markerEmoji(tab)}</span>
                  <span className="text-xs mt-0.5 leading-tight"
                    style={{ fontSize: 9, color: isActive ? markerColor(tab) : "#6b7280" }}>
                    {markerLabel(tab).split(" ")[0]}
                    {locked && " 🔒"}
                  </span>
                  {hasAlarm && (
                    <span className="absolute top-1 right-2 w-2 h-2 rounded-full animate-pulse"
                      style={{ background: "#ef4444" }} />
                  )}
                  {tab === "zlatni_minut" && mapMarkers.filter(m => m.type === "zlatni_minut").length > 0 && (
                    <span className="absolute top-1 right-2 flex items-center justify-center rounded-full text-white"
                      style={{ width: 12, height: 12, background: "#f97316", fontSize: 7 }}>
                      {mapMarkers.filter(m => m.type === "zlatni_minut").length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
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
