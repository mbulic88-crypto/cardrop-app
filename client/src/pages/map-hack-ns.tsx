import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Loader2, AlertTriangle, Check, X, ChevronRight, ChevronDown, Building2, MapPin, MessageSquare, Send, Clock, Lock, Trash2, Target, Bell, BellOff, Home, Smartphone, Navigation, Search, Plus, RadioTower, Info, User, Download, Share, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePWA } from "@/hooks/use-pwa";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { MapHackMap, markerColor, markerEmoji, markerLabel, haversineMeters } from "@/components/MapHackMap";
import type { ParkingListing } from "@/components/MapHackMap";
import type { MapMarker, MapChatMessage, MapSafeZone, MapWatchArea } from "@shared/schema";
import type { MarkerType } from "@/components/MapHackMap";

type MapMarkerWithNickname = MapMarker & { mapNickname?: string | null };

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
          <GoldRow ok text="Radar Markeri: označi policijski radar i fotoredar na mapi" />
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
          <LightRow ok text="Sve Premium funkcije (Štek, Radar, Push, Safe Zone)" />
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
          <LightRow ok text="Sve Premium funkcije (Štek, Radar, Push, Safe Zone)" />
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
            <ChevronLeft className="w-5 h-5" />
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
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [legendOpen, setLegendOpen] = useState(false);
  const [burgerMenuOpen, setBurgerMenuOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [editAvatarId, setEditAvatarId] = useState(1);
  const [profileEditError, setProfileEditError] = useState("");
  const [profileEditSaving, setProfileEditSaving] = useState(false);
  const [premiumUpsellOpen, setPremiumUpsellOpen] = useState(false);
  const [upsellPending, setUpsellPending] = useState(false);

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
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerWithNickname | null>(null);
  const [selectedParking, setSelectedParking] = useState<ParkingListing | null>(null);
  const [markerLabelEdit, setMarkerLabelEdit] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatCooldown, setChatCooldown] = useState(0);
  const [replyingTo, setReplyingTo] = useState<{ id: string; nickname: string; text: string } | null>(null);
  const [smsOpen, setSmsOpen] = useState(false);
  const [watchZoneOpen, setWatchZoneOpen] = useState(false);
  const [watchZonePlaceMode, setWatchZonePlaceMode] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 45.2671, lng: 19.8335 });
  const [izdajOpen, setIzdajOpen] = useState(false);
  const [aktivnoOpen, setAktivnoOpen] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<number>(() => {
    const stored = localStorage.getItem("mh_chat_last_seen");
    return stored ? parseInt(stored, 10) : 0;
  });
  const [plateInput, setPlateInput] = useState<string>(() => localStorage.getItem("cardrop_plate") ?? "");
  const [pendingPlacement, setPendingPlacement] = useState<{ type: MarkerType; lat: number; lng: number } | null>(null);
  const [pendingComment, setPendingComment] = useState("");
  const [suggestedZone, setSuggestedZone] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ text: string; lat: number; lng: number }>>([]);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const { isInstallable, isInstalled, installApp } = usePWA();
  useEffect(() => {
    setIsIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMapView = viewMode === "map_view";

  const { data: mapMarkers = [], refetch: refetchMarkers } = useQuery<MapMarkerWithNickname[]>({
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

  const { data: watchArea = null } = useQuery<MapWatchArea | null>({
    queryKey: ["/api/map-hack/watch-area"],
    enabled: isMapView && (user?.isAdmin || ["premium","day_pass","godisnji_premium","firma"].includes(mapStatus?.plan ?? "")),
  });

  const isPremiumForQuery = user?.isAdmin || ["premium", "day_pass", "godisnji_premium", "firma"].includes(mapStatus?.plan ?? "");
  const { data: parkingListings = [] } = useQuery<ParkingListing[]>({
    queryKey: ["/api/map-hack/parking-listings"],
    enabled: isMapView && isPremiumForQuery,
    refetchInterval: isMapView && isPremiumForQuery ? 120000 : false,
  });

  const addMarkerMutation = useMutation({
    mutationFn: (data: { type: MarkerType; lat: number; lng: number; label?: string | null }) =>
      apiRequest("POST", "/api/map-hack/markers", data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-hack/markers"] });
      if (variables.type === "zlatni_minut" || variables.type === "pauk" || variables.type === "radar") {
        queryClient.invalidateQueries({ queryKey: ["/api/map-hack/chat"] });
      }
      setAddMode(null);
      setPendingPlacement(null);
      setPendingComment("");
      toast({ title: "Marker dodat" });
    },
    onError: (err: any) => {
      toast({ title: "Greška", description: err.message, variant: "destructive" });
      setAddMode(null);
      setPendingPlacement(null);
      setPendingComment("");
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

  const updateMarkerLabelMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string | null }) =>
      apiRequest("PATCH", `/api/map-hack/markers/${id}`, { label }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-hack/markers"] });
      setMarkerLabelEdit(null);
      toast({ title: "Sačuvano" });
    },
    onError: (err: any) => {
      toast({ title: "Greška", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  function startCooldown(seconds: number) {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setChatCooldown(seconds);
    cooldownRef.current = setInterval(() => {
      setChatCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); cooldownRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  const sendChatMutation = useMutation({
    mutationFn: (payload: { text: string; replyToId?: string; replyToNickname?: string; replyToText?: string }) =>
      apiRequest("POST", "/api/map-hack/chat", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-hack/chat"] });
      setChatInput("");
      setReplyingTo(null);
      startCooldown(60);
    },
    onError: (err: any) => {
      const msg: string = err.message ?? "";
      if (msg.startsWith("429:")) {
        try {
          const json = JSON.parse(msg.slice(4).trim());
          if (json.retryAfter) { startCooldown(json.retryAfter); return; }
        } catch {}
        startCooldown(60);
      } else {
        toast({ title: "Greška", description: msg, variant: "destructive" });
      }
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

  const setWatchAreaMutation = useMutation({
    mutationFn: (data: { lat: number; lng: number }) =>
      apiRequest("POST", "/api/map-hack/watch-area", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-hack/watch-area"] });
      setWatchZoneOpen(false);
      setWatchZonePlaceMode(false);
      toast({ title: "Zona upozorenja postavljena", description: "Dobit ćeš push kad Zlatni Minut ili Pauk uđe u tvoju zonu." });
    },
    onError: (err: any) => {
      setWatchZonePlaceMode(false);
      toast({ title: "Greška", description: err.message, variant: "destructive" });
    },
  });

  const deleteWatchAreaMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/map-hack/watch-area"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-hack/watch-area"] });
      toast({ title: "Zona upozorenja uklonjena" });
    },
    onError: (err: any) => {
      toast({ title: "Greška", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return;
    fetch("/api/map-hack/verify-plan-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(r => r.json())
      .then((data: { success?: boolean; plan?: string }) => {
        window.history.replaceState({}, "", "/map-hack");
        if (data.success && data.plan) {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          queryClient.invalidateQueries({ queryKey: ["/api/map-hack/status"] });
          toast({ title: "Plan aktiviran!", description: `${planLabel(data.plan)} je uspešno aktiviran.` });
        }
      })
      .catch(() => {
        window.history.replaceState({}, "", "/map-hack");
      });
  }, []);

  async function savePlan(planId: PlanId) {
    if (planId !== "free") {
      const res = await fetch("/api/map-hack/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message || "Greška pri kreiranju sesije");
      }
      const data = await res.json() as { url: string };
      window.location.href = data.url;
      return;
    }
    const res = await fetch("/api/map-hack/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "free" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { message?: string };
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
        body: JSON.stringify({
          nickname: nick,
          avatarId: selectedAvatar,
          ...(privacyAccepted && !user.mapPrivacyAcceptedAt ? { acceptedPrivacy: true } : {}),
        }),
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
    if (!user.mapPrivacyAcceptedAt && !privacyAccepted) { setError("Prihvati politiku privatnosti"); return; }
    setIsSaving(true);
    try {
      if (privacyAccepted && !user.mapPrivacyAcceptedAt) {
        await apiRequest("POST", "/api/map-hack/accept-privacy", {});
      }
      await savePlan(selectedPlan);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Greška. Pokušaj ponovo.";
      setError(msg);
      toast({ title: "Greška", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  const clearUnread = () => {
    const now = Date.now();
    setLastSeenAt(now);
    localStorage.setItem("mh_chat_last_seen", String(now));
  };

  useEffect(() => {
    if (chatMessages.length === 0) return;
    const timer = setTimeout(() => {
      clearUnread();
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 1500);
    return () => clearTimeout(timer);
  }, [chatMessages]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSearchSuggestions([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN as string;
        if (!token) return;
        const resp = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${token}&country=rs&proximity=19.8335,45.2671&limit=6&language=sr`
        );
        const data = await resp.json();
        const suggestions = (data.features ?? []).map((f: { place_name: string; center: [number, number] }) => ({
          text: f.place_name,
          lat: f.center[1],
          lng: f.center[0],
        }));
        setSearchSuggestions(suggestions);
      } catch (_) {
        setSearchSuggestions([]);
      }
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

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
    const alreadyAcceptedPrivacy = !!user.mapPrivacyAcceptedAt;
    const privacyOk = alreadyAcceptedPrivacy || privacyAccepted;
    const canSubmit = nickOk && selectedAvatar !== null && selectedPlan !== null && privacyOk;
    let hint = "";
    if (!selectedAvatar) hint = "Izaberi avatar";
    else if (!nickOk) hint = "Unesi nadimak (min. 3 znaka)";
    else if (!selectedPlan) hint = "Izaberi paket";
    else if (!privacyOk) hint = "Prihvati politiku privatnosti";

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

            {/* Politika privatnosti */}
            {!alreadyAcceptedPrivacy && (
              <div className="py-4 border-t border-border">
                <label className="flex items-start gap-3 cursor-pointer" data-testid="label-privacy-full">
                  <input
                    type="checkbox"
                    data-testid="checkbox-privacy-full"
                    checked={privacyAccepted}
                    onChange={e => setPrivacyAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-green-600 flex-shrink-0"
                  />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    Prihvatam{" "}
                    <Link href="/privacy-policy" className="text-green-600 dark:text-green-400 underline underline-offset-2">
                      Politiku privatnosti
                    </Link>
                    {" "}i razumem da su podaci na karti crowdsource informacije korisnika. CarDrop ne garantuje tačnost
                    podataka i ne preuzima odgovornost za odluke donete na osnovu informacija na mapi.
                  </span>
                </label>
              </div>
            )}

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
    const alreadyAcceptedPrivacy = !!user.mapPrivacyAcceptedAt;
    const privacyOk = alreadyAcceptedPrivacy || privacyAccepted;
    const canSubmit = selectedPlan !== null && privacyOk;

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
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
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

            {/* Politika privatnosti */}
            {!alreadyAcceptedPrivacy && (
              <div className="py-4 border-t border-border">
                <label className="flex items-start gap-3 cursor-pointer" data-testid="label-privacy-plan">
                  <input
                    type="checkbox"
                    data-testid="checkbox-privacy-plan"
                    checked={privacyAccepted}
                    onChange={e => setPrivacyAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-green-600 flex-shrink-0"
                  />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    Prihvatam{" "}
                    <Link href="/privacy-policy" className="text-green-600 dark:text-green-400 underline underline-offset-2">
                      Politiku privatnosti
                    </Link>
                    {" "}i razumem da su podaci na karti crowdsource informacije korisnika. CarDrop ne garantuje tačnost
                    podataka i ne preuzima odgovornost za odluke donete na osnovu informacija na mapi.
                  </span>
                </label>
              </div>
            )}

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
              <p className="text-xs text-muted-foreground text-center mb-2">
                {selectedPlan === null ? "Izaberi paket" : "Prihvati politiku privatnosti"}
              </p>
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

  const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f97316","#22c55e","#14b8a6","#3b82f6","#a16207"];

  const formatChatTime = (d: string | Date) => {
    const date = new Date(d);
    const now = new Date();
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return `${hh}:${mm}`;
    const dd = String(date.getDate()).padStart(2, "0");
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}.${mo} ${hh}:${mm}`;
  };

  const unreadCount = chatMessages.filter(
    m => new Date(m.createdAt).getTime() > lastSeenAt
  ).length;

  const firstZlatni = mapMarkers.find(m => m.type === "zlatni_minut");
  const firstPauk = mapMarkers.find(m => m.type === "pauk");
  const alarmActive = paukInZone.length > 0;

  const NS_ZONES = [
    { sms: "8210", name: "Extra zona",    short: "Extra",  color: "#a855f7", bg: "rgba(168,85,247,0.18)",  price: "80 din/h",  limit: "60 min" },
    { sms: "8211", name: "Crvena zona",   short: "Crvena", color: "#ef4444", bg: "rgba(239,68,68,0.18)",   price: "60 din/h",  limit: "120 min" },
    { sms: "8212", name: "Plava zona",    short: "Plava",  color: "#3b82f6", bg: "rgba(59,130,246,0.18)",  price: "50 din/h",  limit: "∞" },
    { sms: "8213", name: "Strand",        short: "Strand", color: "#06b6d4", bg: "rgba(6,182,212,0.18)",   price: "posebno",   limit: "posebno" },
    { sms: "8214", name: "Najlon pijaca", short: "Najlon", color: "#f97316", bg: "rgba(249,115,22,0.18)",  price: "posebno",   limit: "posebno" },
    { sms: "8215", name: "Dnevna karta",  short: "Dnevna", color: "#6b7280", bg: "rgba(107,114,128,0.15)", price: "posebno",   limit: "posebno" },
    { sms: "8218", name: "Bela zona",     short: "Bela",   color: "#d1d5db", bg: "rgba(209,213,219,0.12)", price: "30 din/h",  limit: "∞" },
    { sms: "8288", name: "Sajam",         short: "Sajam",  color: "#eab308", bg: "rgba(234,179,8,0.18)",   price: "posebno",   limit: "za vreme sajma" },
  ];

  function detectNSZone(lat: number, lng: number): string {
    const dCenter = haversineMeters(lat, lng, 45.2551, 19.8451);
    const dStrand = haversineMeters(lat, lng, 45.2580, 19.8120);
    const dNajlon = haversineMeters(lat, lng, 45.2440, 19.8480);
    if (dStrand < 500) return "8213";
    if (dNajlon < 350) return "8214";
    if (dCenter < 500) return "8210";
    if (dCenter < 1100) return "8211";
    if (dCenter < 2200) return "8212";
    return "8218";
  }

  function openSmsModal() {
    setSuggestedZone(null);
    setSmsOpen(true);
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSuggestedZone(detectNSZone(pos.coords.latitude, pos.coords.longitude));
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 8000, maximumAge: 30000 }
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#0d1117" }}>
      {/* ── Marker Detail Panel ── */}
      {selectedMarker && (
        <div
          className="absolute inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => { setSelectedMarker(null); setMarkerLabelEdit(null); }}
        >
          <div
            className="rounded-t-2xl px-4 pt-4 pb-6 flex flex-col gap-3"
            style={{ background: "#1a1f2b", border: "1px solid rgba(255,255,255,0.10)", maxHeight: "65vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${markerColor(selectedMarker.type)}22`, border: `1.5px solid ${markerColor(selectedMarker.type)}99` }}>
                  <span style={{ fontSize: 13 }}>{markerEmoji(selectedMarker.type)}</span>
                </div>
                <span className="font-bold text-white text-sm">{markerLabel(selectedMarker.type)}</span>
              </div>
              <button onClick={() => { setSelectedMarker(null); setMarkerLabelEdit(null); }}>
                <X size={16} style={{ color: "#9ca3af" }} />
              </button>
            </div>

            {/* Creator + time */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: "#9ca3af" }}>
                {selectedMarker.mapNickname || "Korisnik"}
              </span>
              <span style={{ color: "#4b5563", fontSize: 11 }}>·</span>
              <span className="text-xs" style={{ color: "#6b7280" }}>
                {timeAgo(selectedMarker.createdAt)}
              </span>
              {selectedMarker.expiresAt && (
                <>
                  <span style={{ color: "#4b5563", fontSize: 11 }}>·</span>
                  <span className="text-xs" style={{ color: "#6b7280" }}>
                    ističe za {timeLeft(selectedMarker.expiresAt)}
                  </span>
                </>
              )}
            </div>

            {/* Comment / info text */}
            {(selectedMarker.type === "zlatni_minut" || selectedMarker.type === "stek" || selectedMarker.type === "pauk") && (
              <>
                {selectedMarker.label && markerLabelEdit === null && (
                  <div className="px-3 py-2 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.05)", color: "#d1d5db", lineHeight: 1.5 }}>
                    {selectedMarker.label}
                  </div>
                )}

                {/* Edit textarea */}
                {markerLabelEdit !== null && (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={markerLabelEdit}
                      onChange={(e) => setMarkerLabelEdit(e.target.value)}
                      maxLength={120}
                      rows={3}
                      placeholder={selectedMarker.type === "zlatni_minut" ? "Dodaj komentar o parking mestu..." : "Dodaj informaciju o štek lokaciji..."}
                      className="w-full text-sm rounded-xl px-3 py-2 resize-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#e5e7eb", outline: "none" }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateMarkerLabelMutation.mutate({ id: selectedMarker.id, label: markerLabelEdit.trim() || null })}
                        disabled={updateMarkerLabelMutation.isPending}
                        className="flex-1 py-2 rounded-xl text-xs font-bold"
                        style={{ background: "#166534", color: "#4ade80" }}
                      >
                        {updateMarkerLabelMutation.isPending ? "Čuvam..." : "Sačuvaj"}
                      </button>
                      <button onClick={() => setMarkerLabelEdit(null)} className="px-4 py-2 rounded-xl text-xs" style={{ color: "#9ca3af", border: "1px solid rgba(255,255,255,0.10)" }}>
                        Otkaži
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit trigger */}
                {markerLabelEdit === null && (
                  (() => {
                    const canEdit = selectedMarker.type === "zlatni_minut"
                      ? selectedMarker.userId === user.id
                      : user.isAdmin;
                    if (!canEdit) return null;
                    return (
                      <button
                        onClick={() => setMarkerLabelEdit(selectedMarker.label ?? "")}
                        className="text-xs font-medium text-left"
                        style={{ color: markerColor(selectedMarker.type) }}
                      >
                        {selectedMarker.label ? "Izmeni komentar" : (selectedMarker.type === "zlatni_minut" ? "+ Dodaj komentar" : "+ Dodaj informaciju")}
                      </button>
                    );
                  })()
                )}
              </>
            )}

            {/* Google Maps link */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedMarker.lat},${selectedMarker.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-marker-gmaps"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "rgba(14,165,233,0.10)", border: "1px solid rgba(14,165,233,0.30)", color: "#38bdf8" }}
            >
              <Navigation size={14} />
              Otvori u Google Maps
            </a>

            {/* Admin: remove marker */}
            {user.isAdmin && (
              <button
                data-testid="btn-expire-selected-marker"
                onClick={() => expireMarkerMutation.mutate(selectedMarker.id)}
                disabled={expireMarkerMutation.isPending}
                className="w-full py-2 rounded-xl text-xs font-medium"
                style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.20)" }}
              >
                {expireMarkerMutation.isPending ? "Uklanjam..." : "Ukloni marker"}
              </button>
            )}
          </div>
        </div>
      )}
      {/* ── Private Parking Detail Panel (admin only) ── */}
      {selectedParking && (
        <div
          className="absolute inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSelectedParking(null)}
        >
          <div
            className="rounded-t-2xl px-4 pt-4 pb-6 flex flex-col gap-3"
            style={{ background: "#1a1f2b", border: "1px solid rgba(255,255,255,0.10)", maxHeight: "70vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.18)", border: "1.5px solid rgba(59,130,246,0.7)" }}>
                  <span className="font-bold text-xs" style={{ color: "#93c5fd" }}>P</span>
                </div>
                <span className="font-bold text-white text-sm truncate" style={{ maxWidth: 220 }}>{selectedParking.title}</span>
              </div>
              <button onClick={() => setSelectedParking(null)}>
                <X size={16} style={{ color: "#9ca3af" }} />
              </button>
            </div>

            {/* Address */}
            <div className="flex items-start gap-2">
              <MapPin size={13} style={{ color: "#6b7280", marginTop: 2, flexShrink: 0 }} />
              <span className="text-xs" style={{ color: "#9ca3af" }}>{selectedParking.address}</span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa" }}>
                {parseFloat(selectedParking.pricePerHour).toFixed(0)} RSD
                {selectedParking.pricingType === "hourly" ? "/h" : selectedParking.pricingType === "daily" ? "/dan" : selectedParking.pricingType === "monthly" ? "/mes" : "/dan"}
              </div>
              {selectedParking.spotType && (
                <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
                  {selectedParking.spotType === "covered" ? "Natkriveno" : selectedParking.spotType === "garage" ? "Garaža" : "Otvoreno"}
                </span>
              )}
            </div>

            {/* Amenities */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedParking.is24Hours && (
                <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(34,197,94,0.10)", color: "#4ade80" }}>24/7</span>
              )}
              {selectedParking.hasEvCharging && (
                <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(234,179,8,0.10)", color: "#fbbf24" }}>EV punjač</span>
              )}
              {selectedParking.hasSecurityCamera && (
                <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(107,114,128,0.15)", color: "#9ca3af" }}>Kamera</span>
              )}
            </div>

            {/* Description */}
            {selectedParking.description && (
              <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.04)", color: "#d1d5db", lineHeight: 1.6 }}>
                {selectedParking.description}
              </div>
            )}

            {/* Contact */}
            {(selectedParking.phone || selectedParking.contactEmail) && (
              <div className="flex flex-col gap-1">
                {selectedParking.phone && (
                  <div className="flex items-center gap-2">
                    <Smartphone size={12} style={{ color: "#6b7280" }} />
                    <span className="text-xs" style={{ color: "#9ca3af" }}>{selectedParking.phone}</span>
                  </div>
                )}
                {selectedParking.contactEmail && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "#6b7280" }}>@</span>
                    <span className="text-xs" style={{ color: "#9ca3af" }}>{selectedParking.contactEmail}</span>
                  </div>
                )}
              </div>
            )}

            {/* Google Maps */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedParking.latitude},${selectedParking.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-parking-gmaps"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "rgba(14,165,233,0.10)", border: "1px solid rgba(14,165,233,0.30)", color: "#38bdf8" }}
            >
              <Navigation size={14} />
              Otvori u Google Maps
            </a>
          </div>
        </div>
      )}
      {/* ── Header: logo back + plan badge + search + actions ── */}
      <div className="flex-shrink-0 z-30" style={{ background: "#0d1117", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between px-3 py-2.5">

          {/* Left: CarDrop logo (back to landing) + plan badge */}
          <div className="flex items-center gap-2">
            <button
              data-testid="btn-back-home"
              className="kraft-btn flex items-center gap-1 px-1.5 py-1 rounded-xl"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)" }}
              title="Nazad na početnu stranicu"
              onClick={() => { sessionStorage.setItem("bypassMapHackRedirect", "1"); setLocation("/"); }}
            >
              <ChevronLeft size={13} style={{ color: "#6b7280" }} />
              <img src={parkInLogo} alt="CarDrop" style={{ width: 26, height: 26, borderRadius: 7, objectFit: "cover" }} />
            </button>

            {/* Plan badge pill */}
            {(() => {
              const plan = user.isAdmin ? "admin" : (mapStatus?.plan ?? "free");
              const daysLeft = mapStatus?.daysLeft;
              const BADGE_STYLES: Record<string, { color: string; border: string; text: string }> = {
                admin:             { color: "#14b8a6", border: "rgba(20,184,166,0.35)", text: "ADMIN" },
                free:              { color: "#94a3b8", border: "rgba(148,163,184,0.25)", text: "FREE" },
                premium:           { color: "#DAA520", border: "rgba(218,165,32,0.40)",  text: daysLeft != null ? `PREMIUM · ${daysLeft}d` : "PREMIUM" },
                day_pass:          { color: "#ef4444", border: "rgba(239,68,68,0.35)",   text: daysLeft != null ? `DAY PASS · ${daysLeft}d` : "DAY PASS" },
                godisnji_premium:  { color: "#818cf8", border: "rgba(129,140,248,0.35)", text: daysLeft != null ? `GODIŠNJI · ${daysLeft}d` : "GODIŠNJI" },
                firma:             { color: "#14b8a6", border: "rgba(20,184,166,0.35)",  text: "FIRMA" },
              };
              const s = BADGE_STYLES[plan] ?? BADGE_STYLES["free"];
              return (
                <button
                  data-testid="btn-plan-badge"
                  onClick={() => setPremiumUpsellOpen(true)}
                  className="kraft-btn flex items-center px-2 py-0.5 rounded-full text-xs font-bold tracking-wide"
                  style={{ background: s.color + "18", border: `1px solid ${s.border}`, color: s.color, cursor: "pointer" }}
                >
                  {s.text}
                </button>
              );
            })()}
          </div>

          {/* Center: search — always flex-1 so it fills available space */}
          <div className="flex-1 mx-2 relative min-w-0">
            {searchOpen ? (
              <>
                <input
                  autoFocus
                  data-testid="input-map-search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); setSearchSuggestions([]); } }}
                  placeholder="Pretraži ulicu ili adresu..."
                  className="w-full text-sm rounded-xl px-3 py-1.5 outline-none"
                  style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.16)", color: "#e5e7eb" }}
                />
                {searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50"
                    style={{ background: "#1a1f2b", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
                    {searchSuggestions.map((s, i) => (
                      <button
                        key={i}
                        data-testid={`search-result-${i}`}
                        onClick={() => {
                          setFlyToLocation({ lat: s.lat, lng: s.lng });
                          setSearchOpen(false);
                          setSearchQuery("");
                          setSearchSuggestions([]);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm"
                        style={{ color: "#d1d5db", borderBottom: i < searchSuggestions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                        <MapPin size={12} style={{ color: "#6b7280", flexShrink: 0 }} />
                        <span className="text-left truncate">{s.text}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                data-testid="btn-map-search"
                onClick={() => setSearchOpen(true)}
                className="kraft-btn flex items-center justify-center w-full rounded-xl px-3 py-1.5 gap-2"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <Search size={14} style={{ color: "#9ca3af", flexShrink: 0 }} />
                <span className="text-xs truncate" style={{ color: "#6b7280" }}>Pretraži ulicu ili adresu...</span>
              </button>
            )}
          </div>

          {/* Right: PWA install + burger menu */}
          <div className="flex items-center gap-1.5">

            {/* PWA Install — shown on Android (installable) or iOS; hidden once installed */}
            {!isInstalled && (isInstallable || isIos) && (
              <button
                data-testid="btn-pwa-install"
                onClick={() => isInstallable ? installApp() : setShowPwaModal(true)}
                title="Instaliraj aplikaciju"
                className="kraft-btn relative flex items-center justify-center"
                style={{ width: 34, height: 34, borderRadius: "50%", background: "#059669", border: "none" }}>
                <Download size={15} style={{ color: "#fff" }} />
              </button>
            )}

            {/* Burger menu */}
            <div className="relative">
              <button
                data-testid="btn-burger-menu"
                onClick={() => setBurgerMenuOpen(prev => !prev)}
                className="kraft-btn relative flex items-center justify-center"
                style={{ width: 34, height: 34, borderRadius: "50%", background: "#4f46e5", border: "none" }}>
                <Menu size={16} style={{ color: "#fff" }} />
                {(alarmActive || showTrialBanner) && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
                    style={{ width: 16, height: 16, fontSize: 8,
                      background: alarmActive ? "#ef4444" : "#f59e0b" }}>
                    {alarmActive ? paukInZone.length : mapStatus?.daysLeft}
                  </span>
                )}
              </button>

              {/* Burger dropdown */}
              {burgerMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setBurgerMenuOpen(false)}
                  />
                  {/* Panel */}
                  <div
                    className="absolute right-0 top-full mt-2 z-50 rounded-2xl overflow-hidden"
                    style={{
                      minWidth: 200,
                      background: "#1a1f2e",
                      border: "1px solid rgba(255,255,255,0.12)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                    }}>
                    {/* Profile */}
                    <button
                      data-testid="btn-profile-edit"
                      onClick={() => {
                        setBurgerMenuOpen(false);
                        setEditNickname(user.mapNickname ?? "");
                        setEditAvatarId(user.mapAvatarId ?? 1);
                        setProfileEditError("");
                        setProfileEditOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover-elevate"
                      style={{ color: "#e5e7eb", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-center rounded-full"
                        style={{ width: 28, height: 28, background: "#0f766e" }}>
                        <User size={14} style={{ color: "#fff" }} />
                      </div>
                      <span>Profil</span>
                    </button>

                    {/* Legend */}
                    <button
                      data-testid="btn-legend"
                      onClick={() => {
                        setBurgerMenuOpen(false);
                        setLegendOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover-elevate"
                      style={{ color: "#e5e7eb", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-center rounded-full"
                        style={{ width: 28, height: 28, background: "#6d28d9" }}>
                        <Info size={14} style={{ color: "#fff" }} />
                      </div>
                      <span>Legenda</span>
                    </button>

                    {/* Notifications toggle */}
                    <button
                      data-testid="btn-notifications-toggle"
                      onClick={async () => {
                        const newEnabled = !(user.mapNotificationsEnabled ?? true);
                        setBurgerMenuOpen(false);
                        try {
                          await apiRequest("PATCH", "/api/map-hack/notifications", { enabled: newEnabled });
                          await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                        } catch {
                          toast({ title: "Greška", description: "Promena notifikacija nije uspela", variant: "destructive" });
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover-elevate"
                      style={{ color: "#e5e7eb" }}>
                      <div className="flex items-center justify-center rounded-full"
                        style={{ width: 28, height: 28, background: alarmActive ? "#b91c1c" : "#b45309" }}>
                        {(user.mapNotificationsEnabled ?? true)
                          ? <Bell size={14} style={{ color: "#fff" }} />
                          : <BellOff size={14} style={{ color: "rgba(255,255,255,0.6)" }} />
                        }
                      </div>
                      <span>Notifikacije {(user.mapNotificationsEnabled ?? true) ? "ukl." : "uklj."}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* ── Filter tabs row ── */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0 overflow-x-auto"
        style={{ display: chatFullscreen ? "none" : undefined, background: "#0d1117", borderBottom: "1px solid rgba(255,255,255,0.06)", scrollbarWidth: "none" }}>
        {([
          { key: "zlatni_minut", label: "Parking", icon: "🅿" },
          { key: "pauk",         label: "Pauk",    icon: "🚛" },
          { key: "stek",        label: "Štek",    icon: "🏠" },
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
              className="kraft-btn flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
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
        {isPremium && (() => {
          const isActive = activeFilters.includes("radar");
          return (
            <button
              key="radar"
              data-testid="filter-tab-radar"
              onClick={() => {
                setActiveFilters(prev => {
                  const without = prev.filter(x => x !== "sve" && x !== "radar");
                  const next = prev.includes("radar") ? without : [...without, "radar"];
                  return next.length === 0 ? ["sve"] : next;
                });
              }}
              className="kraft-btn flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: isActive ? "#8b5cf622" : "rgba(255,255,255,0.05)",
                border: `1px solid ${isActive ? "#8b5cf666" : "rgba(255,255,255,0.1)"}`,
                color: isActive ? "#8b5cf6" : "#9ca3af",
              }}>
              <span>📡</span>
              <span>Radar</span>
            </button>
          );
        })()}
        {(() => {
          const isActive = activeFilters.includes("safe_zone");
          return (
            <button
              key="safe_zone"
              data-testid="filter-tab-safe_zone"
              onClick={() => {
                setActiveFilters(prev => {
                  const without = prev.filter(x => x !== "sve" && x !== "safe_zone");
                  const next = prev.includes("safe_zone") ? without : [...without, "safe_zone"];
                  return next.length === 0 ? ["sve"] : next;
                });
              }}
              className="kraft-btn flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: isActive ? markerColor("safe_zone") + "22" : "rgba(255,255,255,0.05)",
                border: `1px solid ${isActive ? markerColor("safe_zone") + "66" : "rgba(255,255,255,0.1)"}`,
                color: isActive ? markerColor("safe_zone") : "#9ca3af",
              }}>
              <span>🛡</span>
              <span>Safe Zone</span>
            </button>
          );
        })()}
        {/* Aktivno dropdown */}
        <button
          data-testid="btn-filter-aktivno"
          onClick={() => setAktivnoOpen(p => !p)}
          className="kraft-btn flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ml-auto"
          style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.4)", color: "#f97316" }}>
          Aktivno ▾
        </button>
      </div>
      {/* ── Map area ── */}
      <div className="relative flex-shrink-0" style={{ height: "36vh", minHeight: 180, display: chatFullscreen ? "none" : undefined }}>
        <MapHackMap
          markers={mapMarkers}
          activeFilters={activeFilters}
          safeZone={safeZone}
          watchArea={watchArea}
          isPremium={isPremium}
          isAddMode={addMode !== null || watchZonePlaceMode}
          onMarkerClick={setSelectedMarker}
          onMapClick={(lat, lng) => {
            if (watchZonePlaceMode) {
              if (!setWatchAreaMutation.isPending) {
                setWatchAreaMutation.mutate({ lat, lng });
              }
              return;
            }
            if (!addMode) return;
            if (addMode === "zlatni_minut" || addMode === "pauk" || addMode === "radar") {
              setPendingPlacement({ type: addMode, lat, lng });
              setPendingComment("");
              return;
            }
            addMarkerMutation.mutate({ type: addMode, lat, lng });
          }}
          onContextMenu={(lat, lng) => {
            setSafeZoneMutation.mutate({ lat, lng, radiusMeters: 300 });
          }}
          onCenterChange={(lat, lng) => setMapCenter({ lat, lng })}
          chatPreviewMsg={null}
          onChatClick={undefined}
          parkingListings={parkingListings}
          flyToLocation={flyToLocation}
          onParkingClick={user.isAdmin ? setSelectedParking : undefined}
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

        {/* Watch zone placement banner */}
        {watchZonePlaceMode && !addMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "#1e2330", border: "1px solid rgba(245,158,11,0.7)", color: "#f59e0b" }}>
            <Bell size={12} />
            Tapni na mapu da postaviš zonu
            <button onClick={() => setWatchZonePlaceMode(false)} className="ml-1 opacity-60 hover:opacity-100">
              <X size={11} />
            </button>
          </div>
        )}
      </div>
      {/* ── Action bar below map ── */}
      <div className="flex-shrink-0 px-3 py-2.5"
        style={{ background: "#0d1117", borderTop: "1px solid rgba(255,255,255,0.08)", display: chatFullscreen ? "none" : undefined }}>
        <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {/* Chat */}
          <button
            data-testid="action-bar-chat"
            onClick={() => { clearUnread(); setChatFullscreen(true); }}
            className="kraft-btn flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl relative"
            style={{
              width: 58, height: 58,
              background: "#1d4ed8",
              border: "1.5px solid #3b82f6",
            }}>
            <div className="relative">
              <MessageSquare size={18} style={{ color: "#bfdbfe" }} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full font-bold"
                  style={{ width: 14, height: 14, background: "#ef4444", color: "#fff", fontSize: 7 }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className="font-bold text-center" style={{ color: "#bfdbfe", fontSize: 9, letterSpacing: "0.02em", lineHeight: 1.2 }}>Chat</span>
          </button>

          {/* Zlatni Minut */}
          {(() => {
            const count = mapMarkers.filter(m => m.type === "zlatni_minut").length;
            const isActive = addMode === "zlatni_minut";
            return (
              <button
                key="zlatni_minut"
                data-testid="action-bar-zlatni_minut"
                onClick={() => { setAddMode(isActive ? null : "zlatni_minut"); setActiveTab("zlatni_minut"); setWatchZonePlaceMode(false); }}
                className="kraft-btn flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl"
                style={{
                  width: 58, height: 58,
                  background: isActive ? "#c2410c" : "#9a3a05",
                  border: `1.5px solid ${isActive ? "#f97316" : "#d45a10"}`,
                }}>
                <div className="relative">
                  <Clock size={18} style={{ color: isActive ? "#fff" : "#fed7aa" }} />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full font-bold"
                      style={{ width: 14, height: 14, background: "#fff", color: "#c2410c", fontSize: 7 }}>{count}</span>
                  )}
                </div>
                <span className="font-bold text-center" style={{ color: isActive ? "#fff" : "#fed7aa", fontSize: 9, letterSpacing: "0.02em", lineHeight: 1.2 }}>Zlatni minut</span>
              </button>
            );
          })()}

          {/* Pauk Radar */}
          {(() => {
            const count = mapMarkers.filter(m => m.type === "pauk").length;
            const isActive = addMode === "pauk";
            return (
              <button
                key="pauk"
                data-testid="action-bar-pauk"
                onClick={() => { setAddMode(isActive ? null : "pauk"); setActiveTab("pauk"); setWatchZonePlaceMode(false); }}
                className="kraft-btn flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl"
                style={{
                  width: 58, height: 58,
                  background: isActive ? "#991b1b" : "#7a1212",
                  border: `1.5px solid ${isActive ? "#ef4444" : "#c42020"}`,
                }}>
                <div className="relative">
                  <span style={{ fontSize: 18, lineHeight: 1 }}>🕷️</span>
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full font-bold"
                      style={{ width: 14, height: 14, background: "#fff", color: "#991b1b", fontSize: 7 }}>{count}</span>
                  )}
                </div>
                <span className="font-bold" style={{ color: isActive ? "#fff" : "#fca5a5", fontSize: 10, letterSpacing: "0.02em" }}>Pauk</span>
              </button>
            );
          })()}

          {/* Štek */}
          {(() => {
            const locked = !isPremium;
            const count = mapMarkers.filter(m => m.type === "stek").length;
            const isActive = addMode === "stek";
            return (
              <button
                key="stek"
                data-testid="action-bar-stek"
                onClick={() => { if (!locked) { setAddMode(isActive ? null : "stek"); setActiveTab("stek"); setWatchZonePlaceMode(false); } else { setPremiumUpsellOpen(true); } }}
                className="kraft-btn flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl"
                style={{
                  width: 58, height: 58,
                  background: locked ? "#1f2937" : isActive ? "#15803d" : "#0e5c28",
                  border: `1.5px solid ${locked ? "#374151" : isActive ? "#22c55e" : "#1a8a3e"}`,
                  opacity: locked ? 0.5 : 1,
                }}>
                {locked ? <Lock size={18} style={{ color: "#6b7280" }} /> : (
                  <div className="relative">
                    <Home size={18} style={{ color: isActive ? "#fff" : "#86efac" }} />
                    {count > 0 && (
                      <span className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full font-bold"
                        style={{ width: 14, height: 14, background: "#fff", color: "#15803d", fontSize: 7 }}>{count}</span>
                    )}
                  </div>
                )}
                <span className="font-bold text-center" style={{ color: locked ? "#4b5563" : isActive ? "#fff" : "#86efac", fontSize: 9, letterSpacing: "0.02em", lineHeight: 1.2 }}>
                  {locked ? "Premium" : "Štek parking"}
                </span>
              </button>
            );
          })()}

          {/* Radar — premium only */}
          {isPremium && (() => {
            const count = mapMarkers.filter(m => m.type === "radar").length;
            const isActive = addMode === "radar";
            return (
              <button
                key="radar"
                data-testid="action-bar-radar"
                onClick={() => { setAddMode(isActive ? null : "radar"); setActiveTab("radar"); setWatchZonePlaceMode(false); }}
                className="kraft-btn flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl"
                style={{
                  width: 58, height: 58,
                  background: isActive ? "#6d28d9" : "#4c1d95",
                  border: `1.5px solid ${isActive ? "#8b5cf6" : "#7c3aed"}`,
                }}>
                <div className="relative">
                  <RadioTower size={18} style={{ color: isActive ? "#fff" : "#ddd6fe" }} />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full font-bold"
                      style={{ width: 14, height: 14, background: "#fff", color: "#6d28d9", fontSize: 7 }}>{count}</span>
                  )}
                </div>
                <span className="font-bold" style={{ color: isActive ? "#fff" : "#ddd6fe", fontSize: 10, letterSpacing: "0.02em" }}>Radar</span>
              </button>
            );
          })()}

          {/* SMS Parking */}
          <button
            data-testid="btn-sms-parking"
            onClick={openSmsModal}
            className="kraft-btn flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl"
            style={{ width: 58, height: 58, background: "#312e81", border: "1.5px solid #4f46e5" }}>
            <Smartphone size={18} style={{ color: "#c7d2fe" }} />
            <span className="font-bold text-center" style={{ color: "#c7d2fe", fontSize: 9, letterSpacing: "0.02em", lineHeight: 1.2 }}>SMS plaćanje</span>
          </button>

          {/* Zona upozorenja */}
          {(() => {
            const locked = !isPremium;
            const hasZone = !!watchArea;
            const isPlacing = watchZonePlaceMode;
            return (
              <button
                data-testid="btn-watch-zone"
                onClick={() => { if (!locked) setWatchZoneOpen(true); else setPremiumUpsellOpen(true); }}
                className="kraft-btn flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl"
                style={{
                  width: 58, height: 58,
                  background: locked ? "#1f2937" : (hasZone || isPlacing) ? "#92400e" : "#6b2d02",
                  border: `1.5px solid ${locked ? "#374151" : (hasZone || isPlacing) ? "#f59e0b" : "#b45309"}`,
                  opacity: locked ? 0.5 : 1,
                }}>
                {locked
                  ? <Lock size={18} style={{ color: "#6b7280" }} />
                  : <Bell size={18} style={{ color: (hasZone || isPlacing) ? "#fde68a" : "#fbbf24" }} />
                }
                <span className="font-bold text-center" style={{ color: locked ? "#4b5563" : (hasZone || isPlacing) ? "#fde68a" : "#fbbf24", fontSize: 9, letterSpacing: "0.02em", lineHeight: 1.2 }}>
                  {locked ? "Premium" : "Safe zona"}
                </span>
              </button>
            );
          })()}

          {/* Izdaj Parking — link to add-spot */}
          <button
            data-testid="btn-izdaj-parking"
            onClick={() => setLocation("/select-category")}
            className="kraft-btn flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl"
            style={{ width: 58, height: 58, background: "#0c4a6e", border: "1.5px solid #0ea5e9" }}>
            <Plus size={18} style={{ color: "#7dd3fc" }} />
            <span className="font-bold text-center" style={{ color: "#7dd3fc", fontSize: 9, letterSpacing: "0.02em", lineHeight: 1.2 }}>Izdaj parking</span>
          </button>
        </div>
      </div>
      {/* ── Chat panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden" data-testid="panel-chat"
        style={{ background: "#0d1117" }}>
        {chatFullscreen && (
          <div className="flex items-center justify-between px-3 py-2 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-sm font-semibold" style={{ color: "#e5e7eb" }}>Chat</span>
            <button
              data-testid="btn-chat-fullscreen-close"
              onClick={() => setChatFullscreen(false)}
              className="kraft-btn flex items-center justify-center"
              style={{ width: 32, height: 32, borderRadius: "50%", background: "#374151", border: "none" }}
              title="Zatvori fullscreen chat">
              <X size={16} style={{ color: "#fff" }} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {chatMessages.length === 0 && (
            <p className="text-xs text-center py-6" style={{ color: "#4b5563" }}>Nema poruka. Budi prvi!</p>
          )}
          {chatMessages.map(msg => {
            if (msg.isSystem) {
              const dashIdx = msg.text.indexOf(" — ");
              const baseText = dashIdx !== -1 ? msg.text.slice(0, dashIdx) : msg.text;
              const commentText = dashIdx !== -1 ? msg.text.slice(dashIdx + 3) : null;
              const isZlatniMinut = msg.text.includes("Zlatni Minut");
              const isPaukMsg = msg.text.includes("Pauk Radar");
              const isRadarMsg = msg.text.includes("Radar") && !isPaukMsg;
              const isKomentar = msg.text.includes("komentar");
              const TypeIcon = isZlatniMinut ? Clock : isPaukMsg ? AlertTriangle : isRadarMsg ? RadioTower : isKomentar ? MessageSquare : MessageSquare;
              const typeColor = isZlatniMinut ? "#f97316" : isPaukMsg ? "#ef4444" : isRadarMsg ? "#8b5cf6" : "#6b7280";
              const hasCoords = msg.lat != null && msg.lng != null;
              return (
                <div
                  key={msg.id}
                  data-testid={`chat-system-msg-${msg.id}`}
                  className="flex items-start gap-2 my-2"
                  style={{ cursor: hasCoords ? "pointer" : "default" }}
                  onClick={() => {
                    if (!hasCoords) return;
                    setFlyToLocation({ lat: parseFloat(msg.lat!), lng: parseFloat(msg.lng!) });
                    setChatFullscreen(false);
                  }}
                  title={hasCoords ? "Tapni da vidiš na mapi" : undefined}
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: typeColor + "22", border: `1px solid ${typeColor}44` }}>
                    <TypeIcon size={13} style={{ color: typeColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 mb-0.5">
                      <span style={{ color: "#4b5563", fontSize: 10 }}>{formatChatTime(msg.createdAt)}</span>
                      {hasCoords && (
                        <MapPin size={9} style={{ color: "#6b7280", flexShrink: 0 }} />
                      )}
                    </div>
                    <p style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.4 }}>{baseText}</p>
                    {commentText && (
                      <p style={{ color: "#d1d5db", fontStyle: "italic", fontSize: 12, lineHeight: 1.4, marginTop: 2 }}>{commentText}</p>
                    )}
                  </div>
                </div>
              );
            }
            return (
              <div key={msg.id} className="group flex items-start gap-2">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                  style={{ background: AVATAR_COLORS[(msg.avatarId - 1) % AVATAR_COLORS.length], fontSize: 10 }}>
                  {msg.avatarId}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold" style={{ color: "#d1d5db" }}>{msg.mapNickname}</span>
                    <span className="text-xs" style={{ color: "#4b5563" }}>{formatChatTime(msg.createdAt)}</span>
                  </div>
                  {msg.replyToNickname && msg.replyToText && (
                    <div className="mt-0.5 mb-0.5 pl-2 rounded-sm text-xs"
                      style={{ borderLeft: "2px solid rgba(249,115,22,0.5)", color: "#9ca3af" }}>
                      <span style={{ color: "#f97316" }}>@{msg.replyToNickname}</span>
                      <span className="ml-1 truncate">{msg.replyToText.slice(0, 60)}{msg.replyToText.length > 60 ? "…" : ""}</span>
                    </div>
                  )}
                  <p className="text-sm break-words mt-0.5" style={{ color: "#e5e7eb" }}>{msg.text}</p>
                </div>
                <button
                  data-testid={`btn-reply-${msg.id}`}
                  onClick={() => setReplyingTo({ id: msg.id, nickname: msg.mapNickname, text: msg.text })}
                  className="kraft-btn flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "#6b7280", padding: "2px 4px", marginTop: 2, background: "transparent", border: "none" }}
                  title="Odgovori">
                  <MessageSquare size={12} />
                </button>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
        <div className="flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {replyingTo && (
            <div className="flex items-center gap-2 px-3 pt-2 pb-0.5">
              <div className="flex-1 min-w-0 text-xs pl-2 rounded-sm"
                style={{ borderLeft: "2px solid #f97316", color: "#9ca3af" }}>
                <span style={{ color: "#f97316" }}>↩ @{replyingTo.nickname}</span>
                <span className="ml-1 truncate">{replyingTo.text.slice(0, 50)}{replyingTo.text.length > 50 ? "…" : ""}</span>
              </div>
              <button onClick={() => setReplyingTo(null)} style={{ color: "#6b7280" }}>
                <X size={12} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2.5">
            <Input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && chatInput.trim() && !chatCooldown) {
                  sendChatMutation.mutate({
                    text: chatInput,
                    ...(replyingTo ? { replyToId: replyingTo.id, replyToNickname: replyingTo.nickname, replyToText: replyingTo.text } : {}),
                  });
                }
              }}
              placeholder={chatCooldown > 0 ? `Čekaj ${chatCooldown}s...` : "Napiši poruku... (1/min)"}
              data-testid="input-chat-message"
              className="h-9 text-sm"
              style={{ background: "#12161e", border: "1px solid rgba(255,255,255,0.12)", color: "#e5e7eb" }}
              maxLength={280}
              disabled={chatCooldown > 0}
            />
            <Button size="icon" data-testid="btn-send-chat" className="kraft-btn"
              onClick={() => {
                if (chatInput.trim() && !chatCooldown) {
                  sendChatMutation.mutate({
                    text: chatInput,
                    ...(replyingTo ? { replyToId: replyingTo.id, replyToNickname: replyingTo.nickname, replyToText: replyingTo.text } : {}),
                  });
                }
              }}
              disabled={sendChatMutation.isPending || !chatInput.trim() || chatCooldown > 0}
              style={{ background: chatCooldown > 0 ? "#374151" : "#f97316", flexShrink: 0 }}>
              {chatCooldown > 0 ? <span style={{ fontSize: 9, fontWeight: 700 }}>{chatCooldown}</span> : <Send size={14} />}
            </Button>
          </div>
        </div>
      </div>
      {/* ── Pending Placement Comment Modal ── */}
      {pendingPlacement && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => { setPendingPlacement(null); setPendingComment(""); }}>
          <div className="w-full rounded-t-2xl flex flex-col"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.12)", maxWidth: 520 }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-4 pt-3 pb-2.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: pendingPlacement.type === "pauk"
                      ? "rgba(239,68,68,0.18)"
                      : pendingPlacement.type === "radar"
                      ? "rgba(139,92,246,0.18)"
                      : "rgba(249,115,22,0.18)",
                    border: `1px solid ${
                      pendingPlacement.type === "pauk"
                        ? "rgba(239,68,68,0.4)"
                        : pendingPlacement.type === "radar"
                        ? "rgba(139,92,246,0.4)"
                        : "rgba(249,115,22,0.4)"
                    }`,
                  }}>
                  {pendingPlacement.type === "pauk"
                    ? <AlertTriangle size={15} style={{ color: "#f87171" }} />
                    : pendingPlacement.type === "radar"
                    ? <RadioTower size={15} style={{ color: "#a78bfa" }} />
                    : <Clock size={15} style={{ color: "#fb923c" }} />
                  }
                </div>
                <div>
                  <p className="font-bold text-white text-sm">
                    {pendingPlacement.type === "pauk"
                      ? "Pauk Radar"
                      : pendingPlacement.type === "radar"
                      ? "Radar"
                      : "Zlatni Minut"}
                  </p>
                  <p className="text-xs" style={{ color: "#9ca3af" }}>Dodaj komentar (opciono)</p>
                </div>
              </div>
              <button onClick={() => { setPendingPlacement(null); setPendingComment(""); }}
                className="flex items-center justify-center rounded-full"
                style={{ width: 30, height: 30, background: "rgba(255,255,255,0.07)" }}>
                <X size={14} style={{ color: "#9ca3af" }} />
              </button>
            </div>

            <div className="px-4 py-4 flex flex-col gap-3">
              <textarea
                data-testid="input-marker-comment"
                value={pendingComment}
                onChange={e => setPendingComment(e.target.value.slice(0, 100))}
                placeholder={
                  pendingPlacement.type === "pauk"
                    ? "npr. Stoji tu već 30min, kruži po bloku..."
                    : pendingPlacement.type === "radar"
                    ? "npr. Mobilni radar na Bulevaru, pazi na 60..."
                    : "npr. Slobodnih mesta ima, ali frka na uglu..."
                }
                rows={3}
                className="w-full rounded-xl px-3 py-2.5 text-sm resize-none"
                style={{
                  background: "#1a1f2b",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#e5e7eb",
                  outline: "none",
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: pendingComment.length >= 90 ? "#f87171" : "#6b7280" }}>
                  {pendingComment.length}/100
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  data-testid="btn-cancel-placement"
                  onClick={() => { setPendingPlacement(null); setPendingComment(""); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(255,255,255,0.07)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)" }}>
                  Otkaži
                </button>
                <button
                  data-testid="btn-confirm-placement"
                  onClick={() => {
                    addMarkerMutation.mutate({
                      type: pendingPlacement.type,
                      lat: pendingPlacement.lat,
                      lng: pendingPlacement.lng,
                      label: pendingComment.trim() || null,
                    });
                  }}
                  disabled={addMarkerMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{
                    background: pendingPlacement.type === "pauk"
                      ? "#991b1b"
                      : pendingPlacement.type === "radar"
                      ? "#6d28d9"
                      : "#c2410c",
                    border: `1px solid ${
                      pendingPlacement.type === "pauk"
                        ? "#ef4444"
                        : pendingPlacement.type === "radar"
                        ? "#8b5cf6"
                        : "#f97316"
                    }`,
                    color: "#fff",
                    opacity: addMarkerMutation.isPending ? 0.6 : 1,
                  }}>
                  {addMarkerMutation.isPending ? "Postavljam..." : "Postavi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Zona upozorenja Modal ── */}
      {watchZoneOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setWatchZoneOpen(false)}>
          <div className="w-full rounded-t-2xl flex flex-col"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.12)", maxWidth: 520 }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-4 pt-3 pb-2.5 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(245,158,11,0.18)", border: "1px solid rgba(245,158,11,0.4)" }}>
                  <Bell size={15} style={{ color: "#f59e0b" }} />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">Zona upozorenja</p>
                  <p className="text-xs" style={{ color: "#9ca3af" }}>Push alert kad Zlatni Minut ili Pauk uđu u zonu</p>
                </div>
              </div>
              <button onClick={() => setWatchZoneOpen(false)}
                className="flex items-center justify-center rounded-full"
                style={{ width: 30, height: 30, background: "rgba(255,255,255,0.07)" }}>
                <X size={14} style={{ color: "#9ca3af" }} />
              </button>
            </div>

            <div className="px-4 py-4 flex flex-col gap-4">
              {watchArea ? (
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
                    <Bell size={16} style={{ color: "#f59e0b" }} className="flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">Zona aktivna</p>
                      <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                        Radius: {watchArea.radiusMeters}m · {parseFloat(watchArea.lat).toFixed(5)}, {parseFloat(watchArea.lng).toFixed(5)}
                      </p>
                    </div>
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#f59e0b", boxShadow: "0 0 6px rgba(245,158,11,0.6)" }} />
                  </div>
                  <p className="text-xs text-center" style={{ color: "#6b7280" }}>
                    Zona je prikazana na mapi. Možeš je premestiti tapom ili ukloniti.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-red-900/50 text-red-400 hover:bg-red-950/30"
                      data-testid="btn-delete-watch-zone"
                      onClick={() => deleteWatchAreaMutation.mutate()}
                      disabled={deleteWatchAreaMutation.isPending}>
                      {deleteWatchAreaMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      <span className="ml-1.5">Ukloni zonu</span>
                    </Button>
                    <Button
                      className="flex-1"
                      style={{ background: "#d97706" }}
                      data-testid="btn-update-watch-zone"
                      onClick={() => {
                        setWatchZoneOpen(false);
                        setAddMode(null);
                        setWatchZonePlaceMode(true);
                      }}
                      disabled={setWatchAreaMutation.isPending}>
                      <Navigation size={14} />
                      <span className="ml-1.5">Premesti tapom</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: "#9ca3af" }}>KAKO RADI</p>
                    <div className="flex flex-col gap-1.5">
                      {[
                        "Tapni na mapu na željenom mestu da postaviš zonu.",
                        "Kada neko prijavi Zlatni Minut ili Pauk u tvojoj zoni (krug 300m), dobijaš push notification odmah.",
                        "Možeš imati jednu aktivnu zonu u bilo kom trenutku.",
                      ].map((txt, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-xs font-bold mt-0.5 flex-shrink-0" style={{ color: "#f59e0b" }}>{i + 1}.</span>
                          <span className="text-xs" style={{ color: "#d1d5db" }}>{txt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    style={{ background: "#d97706", color: "#fff" }}
                    data-testid="btn-set-watch-zone"
                    onClick={() => {
                      setWatchZoneOpen(false);
                      setAddMode(null);
                      setWatchZonePlaceMode(true);
                    }}>
                    <Bell size={14} className="mr-2" />Tapni na mapu da postaviš zonu
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── SMS Parking Modal ── */}
      {smsOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setSmsOpen(false)}>
          <div className="w-full rounded-t-2xl flex flex-col"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.12)", maxWidth: 520, height: "88vh" }}
            onClick={e => e.stopPropagation()}>

            {/* Header — sticky, never scrolls */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 pt-3 pb-2.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <p className="font-bold" style={{ color: "#f9fafb", fontSize: 15 }}>SMS Parking — Novi Sad</p>
                <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>JKP Parking Servis · pošalji tablicu na broj zone</p>
              </div>
              <button onClick={() => setSmsOpen(false)}
                className="flex items-center justify-center rounded-full"
                style={{ width: 30, height: 30, background: "rgba(255,255,255,0.07)" }}>
                <X size={14} style={{ color: "#9ca3af" }} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>

            {/* Plate input */}
            <div className="px-4 pt-2.5 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-semibold mb-1.5" style={{ color: "#9ca3af" }}>REGISTARSKA TABLICA (opciono)</p>
              <Input
                value={plateInput}
                onChange={e => {
                  const val = e.target.value.toUpperCase().replace(/\s/g, "");
                  setPlateInput(val);
                  localStorage.setItem("cardrop_plate", val);
                }}
                placeholder="NS123AB"
                data-testid="input-plate"
                className="h-9 text-base font-bold text-center tracking-widest"
                style={{ background: "#1a1f2b", border: "1.5px solid rgba(255,255,255,0.2)", color: "#f9fafb", letterSpacing: "0.12em" }}
                maxLength={8}
              />
              {plateInput.trim().length > 0 && (
                <p className="text-xs mt-1" style={{ color: "#22c55e" }}>
                  {plateInput.trim().toUpperCase()} — tapni zonu da posalješ SMS
                </p>
              )}
            </div>

            {/* GPS suggestion */}
            <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <Navigation size={13} style={{ color: gpsLoading ? "#9ca3af" : suggestedZone ? "#22c55e" : "#6b7280", flexShrink: 0 }} />
              {gpsLoading ? (
                <span className="text-xs" style={{ color: "#9ca3af" }}>Određujem lokaciju...</span>
              ) : suggestedZone ? (
                <>
                  <span className="text-xs" style={{ color: "#9ca3af" }}>Preporučena zona:</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: (NS_ZONES.find(z => z.sms === suggestedZone)?.bg ?? "rgba(255,255,255,0.1)"),
                      color: (NS_ZONES.find(z => z.sms === suggestedZone)?.color ?? "#fff") }}>
                    {NS_ZONES.find(z => z.sms === suggestedZone)?.name ?? suggestedZone}
                  </span>
                </>
              ) : (
                <button onClick={() => {
                    setGpsLoading(true);
                    navigator.geolocation?.getCurrentPosition(
                      (pos) => { setSuggestedZone(detectNSZone(pos.coords.latitude, pos.coords.longitude)); setGpsLoading(false); },
                      () => setGpsLoading(false),
                      { timeout: 8000 }
                    );
                  }}
                  className="text-xs" style={{ color: "#6b7280" }}>
                  Tapni da odrediš lokaciju →
                </button>
              )}
            </div>

            {/* Zone grid */}
            <div className="px-4 pt-2.5 pb-2">
              <p className="text-xs font-semibold mb-2" style={{ color: "#6b7280" }}>IZABERI ZONU</p>
              <div className="grid grid-cols-2 gap-1.5">
                {NS_ZONES.map(zone => {
                  const plate = plateInput.trim();
                  const isSuggested = suggestedZone === zone.sms;
                  return (
                    <button
                      key={zone.sms}
                      data-testid={`btn-sms-zona-${zone.sms}`}
                      onClick={() => {
                        setSmsOpen(false);
                        const smsUrl = plate
                          ? `sms:${zone.sms}?body=${encodeURIComponent(plate)}`
                          : `sms:${zone.sms}`;
                        window.open(smsUrl, "_self");
                      }}
                      className="relative flex items-center gap-2 px-2.5 py-2 rounded-xl text-left"
                      style={{
                        background: isSuggested ? zone.bg.replace("0.18", "0.28") : zone.bg,
                        border: `1.5px solid ${isSuggested ? zone.color + "99" : zone.color + "40"}`,
                      }}>
                      {isSuggested && (
                        <span className="absolute -top-2 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: zone.color, color: "#fff", fontSize: 8 }}>GPS</span>
                      )}
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: zone.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm leading-tight" style={{ color: "#f9fafb" }}>{zone.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{zone.price} · max {zone.limit}</p>
                      </div>
                      <span className="text-xs font-mono font-bold flex-shrink-0" style={{ color: zone.color }}>{zone.sms}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-center mt-3 mb-4" style={{ color: "#4b5563" }}>
                Naplaćuje se standardna SMS tarifa · samo za +381 brojeve
              </p>
            </div>
            </div>{/* end scrollable body */}
          </div>
        </div>
      )}

      {/* ── Legend Modal ── */}
      {legendOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setLegendOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-2xl overflow-y-auto"
            style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "85vh" }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2">
                <Info size={16} style={{ color: "#6b7280" }} />
                <span className="font-bold text-white text-sm">Legenda mape</span>
              </div>
              <button onClick={() => setLegendOpen(false)} className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }}>
                <X size={14} style={{ color: "#9ca3af" }} />
              </button>
            </div>

            <div className="px-4 py-3 space-y-5">
              {/* Marker types */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: "#6b7280" }}>Tipovi markera</p>
                <div className="space-y-2.5">
                  {[
                    { icon: <Clock size={14} />, color: "#f97316", label: "Zlatni Minut", desc: "Slobodno parking mesto — ističe za 45 min", badge: "Free" },
                    { icon: <AlertTriangle size={14} />, color: "#ef4444", label: "Pauk Radar", desc: "Evakuator primećen u blizini — upozorenje!", badge: "Free" },
                    { icon: <Home size={14} />, color: "#22c55e", label: "Štek Parking", desc: "Tajno ili povoljno parking mesto", badge: "Premium" },
                    { icon: <Bell size={14} />, color: "#4ade80", label: "Safe Zone", desc: "Tvoja lična zona — alarm kad pauk uđe (300m)", badge: "Free" },
                    { icon: <Target size={14} />, color: "#fbbf24", label: "Watch Area", desc: "Zona praćenja — push alarm 300m radius", badge: "Premium" },
                    { icon: <RadioTower size={14} />, color: "#8b5cf6", label: "Radar", desc: "Policijski radar ili fotoredar na putu", badge: "Premium" },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: item.color + "22", border: `1px solid ${item.color}44` }}>
                        <span style={{ color: item.color }}>{item.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{item.label}</span>
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: item.badge === "Premium" ? "rgba(218,165,32,0.15)" : "rgba(255,255,255,0.08)", color: item.badge === "Premium" ? "#DAA520" : "#9ca3af" }}>{item.badge}</span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Push notifikacije */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16 }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>Push notifikacije</p>
                <div className="rounded-xl px-3 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-sm text-white mb-1 font-medium">Automatska upozorenja</p>
                  <p className="text-xs" style={{ color: "#9ca3af" }}>Kada neko prijavi Pauka ili Zlatni Minut u tvojoj Safe Zoni dobijaš push obaveštenje odmah. Zahteva: postavljenu Safe Zonu i dozvolu u browseru.</p>
                  <p className="text-xs mt-2" style={{ color: "#6b7280" }}>Notifikacije možeš isključiti klikom na zvonce u hederu.</p>
                </div>
              </div>

              {/* Plan info */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16 }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>Planovi</p>
                <div className="space-y-2">
                  {[
                    { plan: "Free — 0 RSD", items: ["Zlatni Minut i Pauk markeri", "Safe Zona alarm", "Live Chat", "Pregled parkinga"] },
                    { plan: "Premium — 390 RSD/mes", items: ["Sve iz Free +", "Štek lokacije", "Watch Area", "Radar markeri", "Push notifikacije"] },
                    { plan: "Day Pass — 120 RSD", items: ["Sve Premium funkcije", "Važi 24 sata", "Bez pretplate"] },
                  ].map(p => (
                    <div key={p.plan} className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <p className="text-xs font-bold text-white mb-1.5">{p.plan}</p>
                      <div className="space-y-0.5">
                        {p.items.map(item => (
                          <div key={item} className="flex items-center gap-1.5">
                            <Check size={10} style={{ color: "#4ade80", flexShrink: 0 }} />
                            <span className="text-xs" style={{ color: "#9ca3af" }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pb-2" />
            </div>
          </div>
        </div>
      )}

      {/* ── Premium Upsell Modal ── */}
      {premiumUpsellOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setPremiumUpsellOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-2xl overflow-y-auto"
            style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "90vh" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <span className="font-bold text-white text-sm">Otključaj Premium</span>
                <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>Štek lokacije, Watch Area, Radar, Push notifikacije</p>
              </div>
              <button
                onClick={() => setPremiumUpsellOpen(false)}
                className="flex items-center justify-center rounded-full"
                style={{ width: 30, height: 30, background: "rgba(255,255,255,0.07)" }}>
                <X size={14} style={{ color: "#9ca3af" }} />
              </button>
            </div>
            <div className="px-4 py-4 flex flex-col gap-3">

              {/* Premium card */}
              <button
                data-testid="upsell-plan-premium"
                disabled={upsellPending}
                onClick={async () => {
                  setUpsellPending(true);
                  try {
                    const res = await fetch("/api/map-hack/create-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "premium" }) });
                    const data = await res.json() as { url?: string; message?: string };
                    if (!res.ok) throw new Error(data.message || "Greška");
                    window.location.href = data.url!;
                  } catch (err) {
                    toast({ title: "Greška", description: err instanceof Error ? err.message : "Pokušaj ponovo", variant: "destructive" });
                    setUpsellPending(false);
                  }
                }}
                className="w-full text-left rounded-xl p-4 transition-all duration-200"
                style={{ background: "linear-gradient(145deg, #B8860B 0%, #DAA520 45%, #FFD700 100%)", boxShadow: "0 2px 12px rgba(218,165,32,0.3)", opacity: upsellPending ? 0.7 : 1 }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-yellow-950 font-extrabold text-base tracking-wide">PREMIUM</span>
                      <span className="bg-yellow-950/15 text-yellow-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Preporučeno</span>
                    </div>
                    <p className="text-yellow-900/70 text-xs mt-0.5">Štek, Watch Area, Radar, Push notifikacije</p>
                  </div>
                  <div className="text-right">
                    <span className="text-yellow-950 text-2xl font-extrabold leading-none">390</span>
                    <span className="text-yellow-800 text-xs ml-1">RSD/mes</span>
                  </div>
                </div>
                <div className="mt-3 py-2 px-4 rounded-lg text-center font-bold text-sm" style={{ background: "rgba(0,0,0,0.15)", color: "#713f12" }}>
                  {upsellPending ? "Učitava..." : "Pretplati se →"}
                </div>
              </button>

              {/* Day Pass card */}
              <button
                data-testid="upsell-plan-day-pass"
                disabled={upsellPending}
                onClick={async () => {
                  setUpsellPending(true);
                  try {
                    const res = await fetch("/api/map-hack/create-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "day_pass" }) });
                    const data = await res.json() as { url?: string; message?: string };
                    if (!res.ok) throw new Error(data.message || "Greška");
                    window.location.href = data.url!;
                  } catch (err) {
                    toast({ title: "Greška", description: err instanceof Error ? err.message : "Pokušaj ponovo", variant: "destructive" });
                    setUpsellPending(false);
                  }
                }}
                className="w-full text-left rounded-xl p-4 transition-all duration-200"
                style={{ background: "linear-gradient(145deg, #7f1d1d 0%, #dc2626 55%, #ef4444 100%)", boxShadow: "0 2px 12px rgba(220,38,38,0.25)", opacity: upsellPending ? 0.7 : 1 }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-white font-extrabold text-base tracking-wide">DAY PASS</span>
                    <p className="text-red-200 text-xs mt-0.5">Sve Premium funkcije na 24 sata</p>
                  </div>
                  <div className="text-right">
                    <span className="text-white text-2xl font-extrabold leading-none">120</span>
                    <span className="text-red-200 text-xs ml-1">RSD</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-2 mb-3">
                  <LightRow ok text="Važi 24 sata" />
                  <LightRow ok text="Bez pretplate" />
                </div>
                <div className="py-2 px-4 rounded-lg text-center font-bold text-sm text-white" style={{ background: "rgba(0,0,0,0.2)" }}>
                  {upsellPending ? "Učitava..." : "Pretplati se →"}
                </div>
              </button>

              {/* Godišnji card */}
              <button
                data-testid="upsell-plan-godisnji"
                disabled={upsellPending}
                onClick={async () => {
                  setUpsellPending(true);
                  try {
                    const res = await fetch("/api/map-hack/create-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "godisnji_premium" }) });
                    const data = await res.json() as { url?: string; message?: string };
                    if (!res.ok) throw new Error(data.message || "Greška");
                    window.location.href = data.url!;
                  } catch (err) {
                    toast({ title: "Greška", description: err instanceof Error ? err.message : "Pokušaj ponovo", variant: "destructive" });
                    setUpsellPending(false);
                  }
                }}
                className="w-full text-left rounded-xl p-4 transition-all duration-200"
                style={{ background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 60%, #3730a3 100%)", boxShadow: "0 2px 12px rgba(67,56,202,0.2)", opacity: upsellPending ? 0.7 : 1 }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-extrabold text-base tracking-wide">GODIŠNJI</span>
                      <span className="bg-green-400 text-green-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">2 mes. gratis</span>
                    </div>
                    <p className="text-indigo-300 text-xs mt-0.5">365 dana pristupa svim Premium funkcijama</p>
                  </div>
                  <div className="text-right">
                    <span className="text-white text-2xl font-extrabold leading-none">3.500</span>
                    <span className="text-indigo-300 text-xs ml-1">RSD/god</span>
                  </div>
                </div>
                <div className="py-2 px-4 rounded-lg text-center font-bold text-sm text-white" style={{ background: "rgba(0,0,0,0.2)" }}>
                  {upsellPending ? "Učitava..." : "Pretplati se →"}
                </div>
              </button>

              <p className="text-center text-xs pb-2" style={{ color: "#4b5563" }}>Sigurno plaćanje putem Stripe-a · RSD</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Edit Modal ── */}
      {profileEditOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setProfileEditOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-2xl overflow-y-auto"
            style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "85vh" }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <div>
                <span className="font-bold text-white text-sm">Promeni profil</span>
                <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>Možeš da menjaš jednom u 7 dana</p>
              </div>
              <button onClick={() => setProfileEditOpen(false)} className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }}>
                <X size={14} style={{ color: "#9ca3af" }} />
              </button>
            </div>

            <div className="px-4 py-4 space-y-4">
              {/* Cooldown info if applicable */}
              {(() => {
                if (!user?.mapProfileLastChangedAt || user?.isAdmin) return null;
                const lastChanged = new Date(user.mapProfileLastChangedAt);
                const nextAllowed = new Date(lastChanged.getTime() + 7 * 24 * 60 * 60 * 1000);
                if (new Date() < nextAllowed) {
                  const daysLeft = Math.ceil((nextAllowed.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                  return (
                    <div className="rounded-xl px-3 py-2.5 flex items-start gap-2"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                      <AlertTriangle size={14} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                      <p className="text-xs" style={{ color: "#f87171" }}>
                        Profil možeš promeniti za <strong>{daysLeft} {daysLeft === 1 ? "dan" : "dana"}</strong> ({nextAllowed.toLocaleDateString("sr-RS")})
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Avatar grid */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: "#6b7280" }}>Avatar</p>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }, (_, i) => i + 1).map(id => (
                    <button
                      key={id}
                      data-testid={`btn-avatar-${id}`}
                      onClick={() => setEditAvatarId(id)}
                      className="rounded-xl overflow-hidden flex-shrink-0"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: `2px solid ${editAvatarId === id ? "#f97316" : "rgba(255,255,255,0.1)"}`,
                        padding: 3,
                      }}>
                      <img src={`/avatars/avatar-${id}.png`} alt={`Avatar ${id}`} className="w-full aspect-square object-contain rounded-lg" style={{ background: "#F5EDD8" }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Nickname input */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>Nadimak na mapi</p>
                <input
                  data-testid="input-edit-nickname"
                  value={editNickname}
                  onChange={e => { setEditNickname(e.target.value); setProfileEditError(""); }}
                  placeholder="Nadimak (3–20 znakova)"
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "#e5e7eb" }}
                  maxLength={20}
                />
              </div>

              {/* Error */}
              {profileEditError && (
                <div className="rounded-xl px-3 py-2 flex items-start gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <AlertTriangle size={13} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                  <p className="text-xs" style={{ color: "#f87171" }}>{profileEditError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pb-2">
                <button
                  onClick={() => setProfileEditOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)" }}>
                  Otkaži
                </button>
                <button
                  data-testid="btn-save-profile-edit"
                  disabled={profileEditSaving}
                  onClick={async () => {
                    const trimmed = editNickname.trim();
                    if (trimmed.length < 3 || trimmed.length > 20) {
                      setProfileEditError("Nadimak mora imati između 3 i 20 znakova");
                      return;
                    }
                    if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
                      setProfileEditError("Nadimak sme da sadrži samo slova, brojeve, crtice i donju crtu");
                      return;
                    }
                    setProfileEditSaving(true);
                    try {
                      const res = await fetch("/api/map-hack/profile", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ mapNickname: trimmed, mapAvatarId: editAvatarId }),
                      });
                      if (res.status === 429) {
                        const data = await res.json() as { error: string; nextAllowed: string };
                        const next = new Date(data.nextAllowed);
                        setProfileEditError(`Možeš menjati jednom nedeljno. Sledeća promena: ${next.toLocaleDateString("sr-RS")}`);
                        return;
                      }
                      if (!res.ok) {
                        const data = await res.json() as { message: string };
                        setProfileEditError(data.message ?? "Greška pri čuvanju");
                        return;
                      }
                      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                      setProfileEditOpen(false);
                      toast({ title: "Profil ažuriran" });
                    } catch {
                      setProfileEditError("Greška pri čuvanju profila");
                    } finally {
                      setProfileEditSaving(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: profileEditSaving ? "rgba(249,115,22,0.4)" : "#f97316", color: "#fff", opacity: profileEditSaving ? 0.7 : 1 }}>
                  {profileEditSaving ? "Čuva se..." : "Sačuvaj"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PWA iOS Install Modal ── */}
      <Dialog open={showPwaModal} onOpenChange={setShowPwaModal}>
        <DialogContent className="max-w-sm" data-testid="modal-pwa-install">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              Instalacija na iPhone
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              iOS ne podržava automatsku instalaciju. Pratite ove korake u Safari-ju:
            </p>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">1</span>
                <p className="text-sm text-foreground pt-0.5">Otvori ovu stranicu u <strong>Safari-ju</strong> (ne Chrome ili drugi pretraživač)</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">2</span>
                <p className="text-sm text-foreground pt-0.5">
                  Tapni dugme za deljenje <Share className="inline w-4 h-4 align-text-bottom text-emerald-400" /> (na dnu ekrana)
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">3</span>
                <p className="text-sm text-foreground pt-0.5">Izaberi <strong>"Dodaj na početni ekran"</strong></p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">4</span>
                <p className="text-sm text-foreground pt-0.5">Tapni <strong>"Dodaj"</strong> u gornjem desnom uglu</p>
              </li>
            </ol>
            <Button className="w-full mt-2" onClick={() => setShowPwaModal(false)} data-testid="button-pwa-modal-close">
              Razumeo/la sam
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
