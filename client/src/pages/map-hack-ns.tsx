import { useEffect, useRef, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Loader2, AlertTriangle, Check, X, ChevronRight, ChevronDown, Building2, MapPin, MessageSquare, Send, Clock, Lock, Trash2, Target, Bell, BellOff, Home, Smartphone, Navigation, Search, Plus, RadioTower, Info, User, Download, Share, Menu, Maximize2, Minimize2, Mic, Shield, Car, Camera, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfDay } from "date-fns";
import { usePWA } from "@/hooks/use-pwa";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { MapHackMap, markerColor, markerEmoji, markerLabel, haversineMeters, parkingPinStyle } from "@/components/MapHackMap";
import type { ParkingListing } from "@/components/MapHackMap";
import type { MapMarker, MapChatMessage, MapSafeZone, MapWatchArea } from "@shared/schema";
import type { MarkerType } from "@/components/MapHackMap";
import { SiViber, SiWhatsapp } from "react-icons/si";
import googlePlayBadgeImg from "@assets/image_1777741996093.png";

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
type ViewMode = "loading" | "onboarding_full" | "onboarding_plan_only" | "permissions" | "map_view";

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
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Osnovni pristup parking zajednici Srbije.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-slate-800 dark:text-slate-100 text-2xl font-extrabold leading-none">0</span>
            <span className="text-slate-400 text-xs">RSD</span>
            <Radio selected={selectedPlan === "free"} light={false} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 mt-3">
          <FreeRow ok text="Parking mapa Srbije sa zonama i ulicama" />
          <FreeRow ok text="Live Chat (pisanje i čitanje u realnom vremenu)" />
          <FreeRow ok text="Smart SMS plaćanje javnih zona (1 klik)" />
          <FreeRow ok text="Pregled privatnih parkinga za najam" />
          <FreeRow ok text="Vizuelni markeri za Pauka i 'Zlatni minut'" />
          <FreeRow ok text="Pauk i Zlatni Minut push notifikacije (u Safe Zoni)" />
          <FreeRow ok={false} text="Safe Zone alarm i Radar notifikacije (samo Premium)" />
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
          <GoldRow ok text="Safe Zone Alarm: push za svaki marker u tvojoj zoni 300m (pauk, radar, zlatni minut, štek)" />
          <GoldRow ok text="Push Notifikacije: instant alarm — ne moraš gledati u mapu" />
          <GoldRow ok text="Štek Lokacije: otključana baza skrivenih parkinga" />
          <GoldRow ok text="Radar Markeri: označi policijski radar i patrolu na mapi" />
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

function CompactHero({ title = "Map Hack RS" }: { title?: string }) {
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

function formatPhoneForMessaging(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+381' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
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
  const [mapExpanded, setMapExpanded] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [editAvatarId, setEditAvatarId] = useState(1);
  const [profileEditError, setProfileEditError] = useState("");
  const [profileEditSaving, setProfileEditSaving] = useState(false);
  const [premiumUpsellOpen, setPremiumUpsellOpen] = useState(false);
  const [upsellContext, setUpsellContext] = useState<string>("");
  const [upsellFeature, setUpsellFeature] = useState<"stek" | "safe_zone" | "radar" | null>(null);
  const [upsellPending, setUpsellPending] = useState(false);
  const [mojPaketOpen, setMojPaketOpen] = useState(false);
  const [portalPending, setPortalPending] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [permLocStatus, setPermLocStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [permMicStatus, setPermMicStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [permRequesting, setPermRequesting] = useState(false);
  // Prevents map flash while async permissions check runs for returning users
  const [permCheckLoading, setPermCheckLoading] = useState<boolean>(
    () => !localStorage.getItem("cardrop_perms_asked")
  );

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

  // For returning users: check if we need to show the permissions screen
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user || !hasProfile || statusLoading || !mapStatus) return;
    if (mapStatus.phase === "trial_expired" || mapStatus.phase === "plan_expired") {
      setPermCheckLoading(false);
      return;
    }
    if (localStorage.getItem("cardrop_perms_asked")) {
      setPermCheckLoading(false);
      return;
    }
    // Check existing permission states without triggering browser dialog
    async function checkExisting() {
      try {
        const [locPerm, micPerm] = await Promise.all([
          navigator.permissions.query({ name: "geolocation" }),
          navigator.permissions.query({ name: "microphone" as PermissionName }),
        ]);
        if (locPerm.state === "granted" && micPerm.state === "granted") {
          localStorage.setItem("cardrop_perms_asked", "1");
          setPermCheckLoading(false);
          return;
        }
      } catch {
        // Permissions API not supported — just show the screen
      }
      setPermLocStatus("idle");
      setPermMicStatus("idle");
      setPermCheckLoading(false);
      setShowPermissions(true);
    }
    checkExisting();
  }, [isLoading, isAuthenticated, user, hasProfile, statusLoading, mapStatus]);

  let viewMode: ViewMode = "loading";
  if (!isLoading && isAuthenticated && user) {
    if (showPermissions) {
      viewMode = "permissions";
    } else if (!hasProfile) {
      viewMode = "onboarding_full";
    } else if (statusLoading || !mapStatus || permCheckLoading) {
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
  const [showParkingBookingForm, setShowParkingBookingForm] = useState(false);
  const [parkingLicensePlate, setParkingLicensePlate] = useState('');
  const [parkingBookingStartDate, setParkingBookingStartDate] = useState<Date | undefined>(undefined);
  const [parkingBookingEndDate, setParkingBookingEndDate] = useState<Date | undefined>(undefined);
  const [parkingStartHour, setParkingStartHour] = useState(8);
  const [parkingEndHour, setParkingEndHour] = useState(9);
  const [parkingNumMonths, setParkingNumMonths] = useState(1);
  const [descExpanded, setDescExpanded] = useState(false);
  const [markerLabelEdit, setMarkerLabelEdit] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatCooldown, setChatCooldown] = useState(0);
  const [replyingTo, setReplyingTo] = useState<{ id: string; nickname: string; text: string } | null>(null);
  const [voiceState, setVoiceState] = useState<"idle" | "recording" | "uploading">("idle");
  const [voiceSecondsLeft, setVoiceSecondsLeft] = useState(60);
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsCity, setSmsCity] = useState<string>(() => localStorage.getItem("cardrop_sms_city") ?? "novi_sad");
  const [smsCityDropdownOpen, setSmsCityDropdownOpen] = useState(false);
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
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ text: string; sub: string; lat: number; lng: number }>>([]);
  const [parkingFilterOpen, setParkingFilterOpen] = useState(false);
  const [parkingFilter, setParkingFilter] = useState<{
    city: string;
    pricingType: string;
    evCharging: boolean;
    is24Hours: boolean;
    hasCamera: boolean;
  }>({ city: "", pricingType: "", evCharging: false, is24Hours: false, hasCamera: false });
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapFlyToRef = useRef<{ flyTo: (lat: number, lng: number) => void } | null>(null);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const isTwa = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches && /Android/i.test(navigator.userAgent);
  const pushBannerKey = isTwa ? 'pushBannerDismissed-twa' : 'pushBannerDismissed-web';
  const [pushBannerDismissed, setPushBannerDismissedState] = useState(() => {
    try { return localStorage.getItem(pushBannerKey) === '1'; } catch { return false; }
  });
  const setPushBannerDismissed = (v: boolean) => {
    setPushBannerDismissedState(v);
    try { if (v) localStorage.setItem(pushBannerKey, '1'); } catch {}
  };
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const { isInstallable, isInstalled, installApp } = usePWA();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, subscribe: pushSubscribe, isLoading: pushLoading, permission: pushPermission } = usePushNotifications();
  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIos(/iPhone|iPad|iPod/i.test(ua));
    setIsAndroid(/Android/i.test(ua));
  }, []);

  useEffect(() => {
    const prevBg = document.body.style.background;
    const prevHtmlBg = document.documentElement.style.background;
    const prevScheme = document.documentElement.style.colorScheme;
    document.body.style.background = '#1B4332';
    document.documentElement.style.background = '#1B4332';
    document.documentElement.style.colorScheme = 'dark';
    return () => {
      document.body.style.background = prevBg;
      document.documentElement.style.background = prevHtmlBg;
      document.documentElement.style.colorScheme = prevScheme;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !pushSupported || pushSubscribed) return;
    if (pushPermission === 'denied') return;
    pushSubscribe();
  }, [isAuthenticated, pushSupported, pushSubscribed, pushPermission]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const { data: parkingListings = [] } = useQuery<ParkingListing[]>({
    queryKey: ["/api/map-hack/parking-listings"],
    enabled: isMapView,
    refetchInterval: isMapView ? 120000 : false,
  });

  // Derive unique cities from loaded listings (for city dropdown)
  const availableCities = Array.from(
    new Set(parkingListings.map(p => p.city).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b, "sr"));

  // Count active parking filters
  const parkingFilterCount = [
    parkingFilter.city !== "",
    parkingFilter.pricingType !== "",
    parkingFilter.evCharging,
    parkingFilter.is24Hours,
    parkingFilter.hasCamera,
  ].filter(Boolean).length;

  // Apply parking filters client-side in real time
  const filteredParkingListings = parkingListings.filter(p => {
    if (parkingFilter.city && p.city !== parkingFilter.city) return false;
    if (parkingFilter.pricingType && p.pricingType !== parkingFilter.pricingType) return false;
    if (parkingFilter.evCharging && !p.hasEvCharging) return false;
    if (parkingFilter.is24Hours && !p.is24Hours) return false;
    if (parkingFilter.hasCamera && !p.hasSecurityCamera) return false;
    return true;
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

  async function startVoiceRecording() {
    if (voiceState !== "idle" || chatCooldown > 0) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "";
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const resolvedMime = mr.mimeType || "audio/webm";
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (voiceTimerRef.current) { clearInterval(voiceTimerRef.current); voiceTimerRef.current = null; }
        const blob = new Blob(audioChunksRef.current, { type: resolvedMime });
        audioChunksRef.current = [];
        if (blob.size < 1000) { setVoiceState("idle"); setVoiceSecondsLeft(60); return; }
        setVoiceState("uploading");
        try {
          const headers: Record<string, string> = { "Content-Type": resolvedMime };
          if (replyingTo) {
            headers["X-Reply-To-Id"] = replyingTo.id;
            headers["X-Reply-To-Nickname"] = replyingTo.nickname;
            headers["X-Reply-To-Text"] = replyingTo.text.slice(0, 120);
          }
          const voiceRes = await fetch("/api/map-hack/chat/voice", {
            method: "POST",
            body: blob,
            headers,
            credentials: "include",
          });
          if (!voiceRes.ok) {
            const errJson = await voiceRes.json().catch(() => ({}));
            if (errJson.retryAfter) { startCooldown(errJson.retryAfter); }
            throw new Error(errJson.message || `Greška pri slanju (${voiceRes.status})`);
          }
          setReplyingTo(null);
          queryClient.invalidateQueries({ queryKey: ["/api/map-hack/chat"] });
          startCooldown(60);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : "Greška pri slanju glasovne poruke";
          toast({ title: "Greška", description: errMsg, variant: "destructive" });
        } finally {
          setVoiceState("idle");
          setVoiceSecondsLeft(60);
        }
      };
      mr.start();
      setVoiceState("recording");
      setVoiceSecondsLeft(60);
      let secs = 60;
      voiceTimerRef.current = setInterval(() => {
        secs -= 1;
        setVoiceSecondsLeft(secs);
        if (secs <= 0) {
          if (voiceTimerRef.current) { clearInterval(voiceTimerRef.current); voiceTimerRef.current = null; }
          mediaRecorderRef.current?.stop();
        }
      }, 1000);
    } catch {
      toast({ title: "Greška", description: "Dozvoli mikrofon u podešavanjima browsera", variant: "destructive" });
      setVoiceState("idle");
    }
  }

  function stopVoiceRecording() {
    if (voiceState !== "recording") return;
    if (voiceTimerRef.current) { clearInterval(voiceTimerRef.current); voiceTimerRef.current = null; }
    mediaRecorderRef.current?.stop();
  }

  const deleteChatMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/map-hack/chat/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-hack/chat"] });
      toast({ title: "Poruka obrisana" });
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : "Greška";
      toast({ title: "Greška", description: errMsg, variant: "destructive" });
    },
  });

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

  const deleteSafeZoneMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/map-hack/safe-zone"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-hack/safe-zone"] });
      toast({ title: "Safe Zone uklonjena" });
    },
    onError: (err: any) => {
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

  const parkingCalculatedPrice = useMemo(() => {
    if (!selectedParking) return 0;
    const price = Number(selectedParking.pricePerHour);
    if (selectedParking.pricingType === 'hourly') {
      const hours = parkingEndHour - parkingStartHour;
      return hours > 0 && parkingBookingStartDate ? Math.round(hours * price * 100) / 100 : 0;
    } else if (selectedParking.pricingType === 'daily') {
      if (!parkingBookingStartDate) return price;
      if (!parkingBookingEndDate) return price;
      const days = Math.max(1, Math.ceil((parkingBookingEndDate.getTime() - parkingBookingStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      return days * price;
    } else {
      return parkingNumMonths * price;
    }
  }, [selectedParking, parkingBookingStartDate, parkingBookingEndDate, parkingStartHour, parkingEndHour, parkingNumMonths]);

  function getParkingBookingTimes(): { startTime: Date; endTime: Date } {
    const base = parkingBookingStartDate || new Date();
    if (selectedParking?.pricingType === 'hourly') {
      const start = new Date(base);
      start.setHours(parkingStartHour, 0, 0, 0);
      const end = new Date(base);
      end.setHours(parkingEndHour, 0, 0, 0);
      return { startTime: start, endTime: end };
    } else if (selectedParking?.pricingType === 'daily') {
      const start = new Date(base);
      start.setHours(0, 0, 0, 0);
      const end = new Date(parkingBookingEndDate || base);
      end.setHours(23, 59, 59, 0);
      return { startTime: start, endTime: end };
    } else {
      const start = new Date(base);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + parkingNumMonths);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 0);
      return { startTime: start, endTime: end };
    }
  }

  const parkingBookingCheckoutMutation = useMutation({
    mutationFn: async () => {
      const { startTime, endTime } = getParkingBookingTimes();
      return await apiRequest("POST", "/api/stripe/create-booking-checkout", {
        spotId: selectedParking!.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        licensePlate: parkingLicensePlate,
      });
    },
    onSuccess: (data: { url?: string }) => {
      if (data?.url) window.location.href = data.url;
    },
    onError: (err: any) => {
      toast({ title: "Greška", description: "Nije moguće pokrenuti plaćanje. Pokušajte ponovo.", variant: "destructive" });
    },
  });

  function closeParkingPanel() {
    setSelectedParking(null);
    setDescExpanded(false);
    setShowParkingBookingForm(false);
    setParkingLicensePlate('');
    setParkingBookingStartDate(undefined);
    setParkingBookingEndDate(undefined);
    setParkingStartHour(8);
    setParkingEndHour(9);
    setParkingNumMonths(1);
  }

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
    if (!user) return;
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
      // After onboarding, show permissions screen before entering map
      setShowPermissions(true);
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
    if (!user) return;
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
          text: f.place_name.split(",")[0].trim(),
          sub: f.place_name.split(",").slice(1).join(",").trim(),
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

  if (viewMode === "permissions") {
    const handleRequestPermissions = async () => {
      setPermRequesting(true);
      // Location
      if (navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => { setPermLocStatus("granted"); resolve(); },
            () => { setPermLocStatus("denied"); resolve(); },
            { timeout: 15000 }
          );
        });
      } else {
        setPermLocStatus("denied");
      }
      // Microphone
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop());
          setPermMicStatus("granted");
        } catch {
          setPermMicStatus("denied");
        }
      } else {
        setPermMicStatus("denied");
      }
      setPermRequesting(false);
      localStorage.setItem("cardrop_perms_asked", "1");
      setPermCheckLoading(false);
      setShowPermissions(false);
    };

    const handleSkipPermissions = () => {
      localStorage.setItem("cardrop_perms_asked", "1");
      setPermCheckLoading(false);
      setShowPermissions(false);
    };

    const bothRequested = permLocStatus !== "idle" || permMicStatus !== "idle";

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <CompactHero />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-md mx-auto px-4 pt-8 pb-24">
            <h2 className="text-lg font-bold text-foreground mb-1">Dozvoli pristup</h2>
            <p className="text-sm text-muted-foreground mb-8">
              CarDrop koristi dve dozvole za puno iskustvo. Možeš ih odobriti sada ili kada ti zatreba svaka funkcija posebno.
            </p>

            {/* Location row */}
            <div className="flex items-start gap-4 p-4 rounded-md border border-border bg-card mb-3">
              <div className="w-10 h-10 rounded-md bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Lokacija</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  GPS plava tačka na mapi. Vidimo samo gde si dok koristiš aplikaciju.
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center pt-0.5">
                {permLocStatus === "idle" && (
                  <span className="text-xs text-muted-foreground">Čeka</span>
                )}
                {permLocStatus === "granted" && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 font-medium">
                    <Check className="w-3.5 h-3.5" /> Odobreno
                  </span>
                )}
                {permLocStatus === "denied" && (
                  <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
                    <X className="w-3.5 h-3.5" /> Odbijeno
                  </span>
                )}
              </div>
            </div>

            {/* Microphone row */}
            <div className="flex items-start gap-4 p-4 rounded-md border border-border bg-card mb-8">
              <div className="w-10 h-10 rounded-md bg-orange-100 dark:bg-orange-950 flex items-center justify-center flex-shrink-0">
                <Mic className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Mikrofon</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Glasovne poruke u live chatu. Snimamo samo dok držiš dugme.
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center pt-0.5">
                {permMicStatus === "idle" && (
                  <span className="text-xs text-muted-foreground">Čeka</span>
                )}
                {permMicStatus === "granted" && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 font-medium">
                    <Check className="w-3.5 h-3.5" /> Odobreno
                  </span>
                )}
                {permMicStatus === "denied" && (
                  <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
                    <X className="w-3.5 h-3.5" /> Odbijeno
                  </span>
                )}
              </div>
            </div>

            {!bothRequested && (
              <p className="text-xs text-muted-foreground text-center mb-4">
                Browser će prikazati standardni popup za svaku dozvolu.
              </p>
            )}
            {bothRequested && (
              <p className="text-xs text-muted-foreground text-center mb-4">
                Možeš promeniti dozvole u podešavanjima browsera u svakom trenutku.
              </p>
            )}
          </div>
        </div>

        {/* Sticky bottom */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t px-4 py-3">
          <div className="max-w-md mx-auto flex flex-col gap-2">
            <Button
              className="w-full"
              onClick={handleRequestPermissions}
              disabled={permRequesting}
              data-testid="button-allow-permissions"
            >
              {permRequesting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Čekamo odgovor...</>
                : <><Check className="w-4 h-4 mr-2" />Dozvoli i uđi na mapu</>
              }
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground text-center py-1 hover:text-foreground transition-colors"
              onClick={handleSkipPermissions}
              data-testid="button-skip-permissions"
            >
              Preskoči — pitaće me kad bude trebalo
            </button>
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

  type SmsZone = { sms: string; name: string; short: string; color: string; bg: string; price: string; limit: string };
  type SmsCity = { id: string; name: string; operator: string; operatorUrl: string; center: { lat: number; lng: number }; zones: SmsZone[]; detectZone: (lat: number, lng: number) => string };

  /*
   * SMS_CITIES — verification log (verified May 2026)
   *
   * City          | Source URL                              | Notes
   * --------------|------------------------------------------|-----------------------------------------------
   * Novi Sad      | https://parkingns.rs                    | Official operator site
   * Beograd       | https://www.parking-servis.co.rs        | Official operator site
   * Niš           | https://www.nisparking.rs               | Official operator site
   * Kragujevac    | https://www.jkpsumadija.rs              | Official operator site
   * Subotica      | https://suparking.rs                    | Official operator site
   * Zrenjanin     | https://www.zrenjanin.rs                | Official operator site
   * Čačak         | https://parkingcacak.co.rs/usluge/parking-zone | Codes 9320–9323 confirmed; prices 80/60/40/30 din/h
   * Valjevo       | https://vidrakvaljevo.com               | Codes 9060/9061 confirmed; zone II is Plava not Zelena
   * Novi Pazar    | https://www.parkingservisnp.rs          | Codes 9280/9281 confirmed; hourly prices not published
   * Pančevo       | https://parking.higijenapancevo.com     | Codes 9131–9134 (old 9154–9157 were wrong); prices 25/20/15 din/h
   * Šabac         | https://www.parkingsabac.rs             | Codes 9065/9066 confirmed; zone II is Plava not Zelena
   * Smederevo     | https://parkingsd.rs                    | Codes 8661–8664 (old 9058/9059 were wrong); prices 53/44/35 din/h
   * Požarevac     | https://parking012.rs                   | Codes 8120–8124 (old 9057/9056 were wrong); prices not published
   * Zaječar       | https://zajecarparking.co.rs            | Codes were swapped: 9053=I Crvena, 9055=II Žuta (not Zelena)
   * Kruševac      | https://parkingkrusevac.rs              | Codes 9344/9345 confirmed; 9346 daily unverified (inferred); prices nije obj.
   * Leskovac      | https://jkpleskovac.rs                  | Codes 9355/9356 confirmed; 9357 daily unverified (inferred); prices nije obj.
   * Vranje        | https://jkpvranje.rs                    | Codes 9370/9371 confirmed; 9372 daily unverified (inferred); prices nije obj.
   * Užice         | https://jkpkomunalac.rs                 | Codes 9305/9306 confirmed; 9307 daily unverified (inferred); prices nije obj.
   * Jagodina      | https://jkpjagodina.rs                  | Codes 9385/9386 confirmed; 9387 daily unverified (inferred); prices nije obj.
   * Sombor        | https://jkpsombor.rs                    | Codes 9262/9263 confirmed; 9264 daily unverified (inferred); prices nije obj.
   *
   * "nije obj." = price not publicly listed on official operator website
   */
  const SMS_CITIES: SmsCity[] = [
    {
      id: "novi_sad", name: "Novi Sad", operator: "JKP Parking Servis NS", operatorUrl: "https://parkingns.rs",
      center: { lat: 45.2551, lng: 19.8451 },
      zones: [
        { sms: "8210", name: "Extra zona",    short: "Extra",  color: "#a855f7", bg: "rgba(168,85,247,0.18)",  price: "80 din/h",  limit: "60 min" },
        { sms: "8211", name: "Crvena zona",   short: "Crvena", color: "#ef4444", bg: "rgba(239,68,68,0.18)",   price: "60 din/h",  limit: "120 min" },
        { sms: "8212", name: "Plava zona",    short: "Plava",  color: "#3b82f6", bg: "rgba(59,130,246,0.18)",  price: "50 din/h",  limit: "∞" },
        { sms: "8213", name: "Strand",        short: "Strand", color: "#06b6d4", bg: "rgba(6,182,212,0.18)",   price: "posebno",   limit: "posebno" },
        { sms: "8214", name: "Najlon pijaca", short: "Najlon", color: "#f97316", bg: "rgba(249,115,22,0.18)",  price: "posebno",   limit: "posebno" },
        { sms: "8215", name: "Dnevna karta",  short: "Dnevna", color: "#6b7280", bg: "rgba(107,114,128,0.15)", price: "posebno",   limit: "posebno" },
        { sms: "8218", name: "Bela zona",     short: "Bela",   color: "#d1d5db", bg: "rgba(209,213,219,0.12)", price: "30 din/h",  limit: "∞" },
        { sms: "8288", name: "Sajam",         short: "Sajam",  color: "#eab308", bg: "rgba(234,179,8,0.18)",   price: "posebno",   limit: "za vreme sajma" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 45.2551, 19.8451);
        const dStrand = haversineMeters(lat, lng, 45.2580, 19.8120);
        const dNajlon = haversineMeters(lat, lng, 45.2440, 19.8480);
        if (dStrand < 500) return "8213";
        if (dNajlon < 350) return "8214";
        if (dCenter < 500) return "8210";
        if (dCenter < 1100) return "8211";
        if (dCenter < 2200) return "8212";
        return "8218";
      },
    },
    {
      id: "beograd", name: "Beograd", operator: "JKP Parking Servis", operatorUrl: "https://www.parking-servis.co.rs",
      center: { lat: 44.8176, lng: 20.4569 },
      zones: [
        { sms: "9114", name: "Zona A — Ljubičasta", short: "Zona A", color: "#a855f7", bg: "rgba(168,85,247,0.18)", price: "posebno", limit: "30 min" },
        { sms: "9111", name: "Zona 1 — Crvena",     short: "Zona 1", color: "#ef4444", bg: "rgba(239,68,68,0.18)",  price: "posebno", limit: "1h" },
        { sms: "9112", name: "Zona 2 — Žuta",        short: "Zona 2", color: "#eab308", bg: "rgba(234,179,8,0.18)", price: "posebno", limit: "1h" },
        { sms: "9113", name: "Zona 3 — Zelena",      short: "Zona 3", color: "#22c55e", bg: "rgba(34,197,94,0.18)", price: "posebno", limit: "1h" },
        { sms: "9116", name: "Zona B — Bela",         short: "Zona B", color: "#d1d5db", bg: "rgba(209,213,219,0.12)", price: "posebno", limit: "1h" },
        { sms: "9119", name: "Plava zona (opšta)",    short: "Plava",  color: "#3b82f6", bg: "rgba(59,130,246,0.18)", price: "posebno", limit: "1h" },
        { sms: "9118", name: "Plava zona — Dnevna",   short: "Plava D", color: "#1d4ed8", bg: "rgba(29,78,216,0.18)", price: "posebno", limit: "dnevna" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 44.8184, 20.4580);
        if (dCenter < 300) return "9114";
        if (dCenter < 900) return "9111";
        if (dCenter < 1800) return "9112";
        if (dCenter < 3000) return "9113";
        return "9119";
      },
    },
    {
      id: "nis", name: "Niš", operator: "JKP Parking Servis Niš", operatorUrl: "https://www.nisparking.rs",
      center: { lat: 43.3209, lng: 21.8954 },
      zones: [
        { sms: "9180", name: "Ekstra zona",       short: "Ekstra",   color: "#a855f7", bg: "rgba(168,85,247,0.18)", price: "80 din/h",  limit: "60 min" },
        { sms: "9181", name: "I zona — Crvena",   short: "I zona",   color: "#ef4444", bg: "rgba(239,68,68,0.18)",  price: "50 din/sat", limit: "120 min" },
        { sms: "9182", name: "II zona — Zelena",  short: "II zona",  color: "#22c55e", bg: "rgba(34,197,94,0.18)",  price: "37 din/h",  limit: "180 min" },
        { sms: "9184", name: "I zona — Dnevna",   short: "I dnevna", color: "#dc2626", bg: "rgba(220,38,38,0.15)", price: "posebno",   limit: "do kraja naplate" },
        { sms: "9185", name: "II zona — Dnevna",  short: "II dnevna",color: "#16a34a", bg: "rgba(22,163,74,0.15)", price: "posebno",   limit: "do kraja naplate" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 43.3209, 21.8954);
        if (dCenter < 300) return "9180";
        if (dCenter < 900) return "9181";
        return "9182";
      },
    },
    {
      id: "kragujevac", name: "Kragujevac", operator: "JKP Šumadija", operatorUrl: "https://www.jkpsumadija.rs",
      center: { lat: 44.0128, lng: 20.9116 },
      zones: [
        { sms: "8340", name: "Zona 0",          short: "Zona 0",   color: "#f97316", bg: "rgba(249,115,22,0.18)", price: "posebno", limit: "120 min" },
        { sms: "8341", name: "Zona I",           short: "Zona I",   color: "#ef4444", bg: "rgba(239,68,68,0.18)", price: "posebno", limit: "1h" },
        { sms: "8342", name: "Zona II",          short: "Zona II",  color: "#22c55e", bg: "rgba(34,197,94,0.18)", price: "posebno", limit: "1h" },
        { sms: "8343", name: "Dnevna — Zona I",  short: "Dnevna I", color: "#dc2626", bg: "rgba(220,38,38,0.15)", price: "posebno", limit: "dnevna" },
        { sms: "8344", name: "Dnevna — Zona II", short: "Dnevna II",color: "#16a34a", bg: "rgba(22,163,74,0.15)", price: "posebno", limit: "dnevna" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 44.0128, 20.9116);
        if (dCenter < 300) return "8340";
        if (dCenter < 900) return "8341";
        return "8342";
      },
    },
    {
      id: "subotica", name: "Subotica", operator: "JKP Parking Subotica", operatorUrl: "https://suparking.rs",
      center: { lat: 46.1004, lng: 19.6674 },
      zones: [
        { sms: "9241", name: "Crvena zona",      short: "Crvena",   color: "#ef4444", bg: "rgba(239,68,68,0.18)",  price: "posebno", limit: "pon-pet 7-21h" },
        { sms: "9242", name: "Žuta zona",         short: "Žuta",     color: "#eab308", bg: "rgba(234,179,8,0.18)", price: "posebno", limit: "pon-pet 7-21h" },
        { sms: "9243", name: "Zelena zona",       short: "Zelena",   color: "#22c55e", bg: "rgba(34,197,94,0.18)", price: "posebno", limit: "pon-ned 5-15h" },
        { sms: "9244", name: "Plava zona",        short: "Plava",    color: "#3b82f6", bg: "rgba(59,130,246,0.18)", price: "posebno", limit: "pon-pet 7-21h" },
        { sms: "9245", name: "Dnevna — Crvena",  short: "Dnevna C", color: "#dc2626", bg: "rgba(220,38,38,0.15)", price: "posebno", limit: "dnevna" },
        { sms: "9246", name: "Dnevna — Žuta",    short: "Dnevna Ž", color: "#ca8a04", bg: "rgba(202,138,4,0.15)", price: "posebno", limit: "dnevna" },
        { sms: "9247", name: "Dnevna — Plava",   short: "Dnevna P", color: "#1d4ed8", bg: "rgba(29,78,216,0.15)", price: "posebno", limit: "dnevna" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 46.1004, 19.6674);
        if (dCenter < 400) return "9241";
        if (dCenter < 900) return "9242";
        if (dCenter < 1500) return "9243";
        return "9244";
      },
    },
    {
      id: "zrenjanin", name: "Zrenjanin", operator: "JKP Parking Zrenjanin", operatorUrl: "https://www.zrenjanin.rs",
      center: { lat: 45.3876, lng: 20.3918 },
      zones: [
        { sms: "8230", name: "Crvena zona",     short: "Crvena",   color: "#ef4444", bg: "rgba(239,68,68,0.18)",  price: "50 din/h", limit: "1h" },
        { sms: "8231", name: "Žuta zona",        short: "Žuta",     color: "#eab308", bg: "rgba(234,179,8,0.18)", price: "40 din/h", limit: "1h" },
        { sms: "8232", name: "Zelena zona",      short: "Zelena",   color: "#22c55e", bg: "rgba(34,197,94,0.18)", price: "30 din/h", limit: "1h" },
        { sms: "8235", name: "Dnevna — Crvena", short: "Dnevna C", color: "#dc2626", bg: "rgba(220,38,38,0.15)", price: "200 din",  limit: "dnevna" },
        { sms: "8236", name: "Dnevna — Žuta",   short: "Dnevna Ž", color: "#ca8a04", bg: "rgba(202,138,4,0.15)", price: "150 din",  limit: "dnevna" },
        { sms: "8237", name: "Dnevna — Zelena", short: "Dnevna Z", color: "#16a34a", bg: "rgba(22,163,74,0.15)", price: "100 din",  limit: "dnevna" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 45.3876, 20.3918);
        if (dCenter < 400) return "8230";
        if (dCenter < 900) return "8231";
        return "8232";
      },
    },
    {
      id: "cacak", name: "Čačak", operator: "JKP Parking servis Čačak", operatorUrl: "https://parkingcacak.co.rs",
      center: { lat: 43.8914, lng: 20.3497 },
      zones: [
        { sms: "9320", name: "Crvena zona",  short: "Crvena", color: "#ef4444", bg: "rgba(239,68,68,0.18)",  price: "80 din/h", limit: "pon-sub 7-16h" },
        { sms: "9321", name: "Žuta zona",    short: "Žuta",   color: "#eab308", bg: "rgba(234,179,8,0.18)",  price: "60 din/h", limit: "pon-sub 7-16h" },
        { sms: "9322", name: "Zelena zona",  short: "Zelena", color: "#22c55e", bg: "rgba(34,197,94,0.18)",  price: "40 din/h", limit: "pon-sub 7-16h" },
        { sms: "9323", name: "Plava zona",   short: "Plava",  color: "#3b82f6", bg: "rgba(59,130,246,0.18)", price: "30 din/h", limit: "pon-sub 7-16h" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 43.8914, 20.3497);
        if (dCenter < 300) return "9320";
        if (dCenter < 600) return "9321";
        if (dCenter < 1000) return "9322";
        return "9323";
      },
    },
    {
      id: "valjevo", name: "Valjevo", operator: "JKP Vidrak", operatorUrl: "https://vidrakvaljevo.com",
      center: { lat: 44.2749, lng: 19.8900 },
      zones: [
        { sms: "9060", name: "I zona — Crvena", short: "I zona",  color: "#ef4444", bg: "rgba(239,68,68,0.18)",  price: "36 din/h", limit: "120 min" },
        { sms: "9061", name: "II zona — Plava",  short: "II zona", color: "#3b82f6", bg: "rgba(59,130,246,0.18)", price: "30 din/h", limit: "pon-sub 7-20h" },
        { sms: "9063", name: "Dnevna — I zona",  short: "Dnevna",  color: "#dc2626", bg: "rgba(220,38,38,0.15)", price: "posebno",  limit: "dnevna" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 44.2749, 19.8900);
        if (dCenter < 500) return "9060";
        return "9061";
      },
    },
    {
      id: "novi_pazar", name: "Novi Pazar", operator: "JKP Parking Servis Novi Pazar", operatorUrl: "https://www.parkingservisnp.rs",
      center: { lat: 43.1367, lng: 20.5125 },
      zones: [
        { sms: "9280", name: "I zona — Crvena",  short: "I zona",  color: "#ef4444", bg: "rgba(239,68,68,0.18)",  price: "nije obj.", limit: "120 min" },
        { sms: "9281", name: "II zona — Zelena", short: "II zona", color: "#22c55e", bg: "rgba(34,197,94,0.18)",  price: "nije obj.", limit: "pon-sub 7-20h" },
        { sms: "9283", name: "Dnevna — I zona",  short: "Dnevna",  color: "#dc2626", bg: "rgba(220,38,38,0.15)", price: "nije obj.", limit: "dnevna" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 43.1367, 20.5125);
        if (dCenter < 500) return "9280";
        return "9281";
      },
    },
    {
      id: "pancevo", name: "Pančevo", operator: "JKP Higijena — Parking servis", operatorUrl: "https://parking.higijenapancevo.com",
      center: { lat: 44.8708, lng: 20.6407 },
      zones: [
        { sms: "9131", name: "I zona — Crvena",   short: "I zona",   color: "#ef4444", bg: "rgba(239,68,68,0.18)",   price: "25 din/h", limit: "max 2h" },
        { sms: "9132", name: "II zona — Žuta",    short: "II zona",  color: "#eab308", bg: "rgba(234,179,8,0.18)",   price: "20 din/h", limit: "max 4h" },
        { sms: "9134", name: "III zona — Zelena", short: "III zona", color: "#22c55e", bg: "rgba(34,197,94,0.18)",   price: "15 din/h", limit: "∞" },
        { sms: "9133", name: "Dnevna — III zona", short: "Dnevna",   color: "#6b7280", bg: "rgba(107,114,128,0.15)", price: "60 din",   limit: "dnevna" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 44.8708, 20.6407);
        if (dCenter < 400) return "9131";
        if (dCenter < 900) return "9132";
        return "9134";
      },
    },
    {
      id: "sabac", name: "Šabac", operator: "JKP Parking-Šabac", operatorUrl: "https://www.parkingsabac.rs",
      center: { lat: 44.7538, lng: 19.6925 },
      zones: [
        { sms: "9065", name: "I zona — Crvena", short: "I zona",  color: "#ef4444", bg: "rgba(239,68,68,0.18)",  price: "42 din/h", limit: "120 min" },
        { sms: "9066", name: "II zona — Plava",  short: "II zona", color: "#3b82f6", bg: "rgba(59,130,246,0.18)", price: "36 din/h", limit: "pon-sub 7-20h" },
        { sms: "9068", name: "Dnevna — I zona",  short: "Dnevna",  color: "#dc2626", bg: "rgba(220,38,38,0.15)", price: "nije obj.", limit: "dnevna" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 44.7538, 19.6925);
        if (dCenter < 500) return "9065";
        return "9066";
      },
    },
    {
      id: "smederevo", name: "Smederevo", operator: "JKP Parking servis Smederevo", operatorUrl: "https://parkingsd.rs",
      center: { lat: 44.6637, lng: 20.9285 },
      zones: [
        { sms: "8661", name: "I zona — Crvena",   short: "I zona",   color: "#ef4444", bg: "rgba(239,68,68,0.18)",   price: "53 din/h", limit: "max 2h" },
        { sms: "8662", name: "II zona — Žuta",    short: "II zona",  color: "#eab308", bg: "rgba(234,179,8,0.18)",   price: "44 din/h", limit: "max 4h" },
        { sms: "8663", name: "III zona — Zelena", short: "III zona", color: "#22c55e", bg: "rgba(34,197,94,0.18)",   price: "35 din/h", limit: "∞" },
        { sms: "8664", name: "Dnevna — III zona", short: "Dnevna",   color: "#6b7280", bg: "rgba(107,114,128,0.15)", price: "170 din",  limit: "dnevna" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 44.6637, 20.9285);
        if (dCenter < 400) return "8661";
        if (dCenter < 900) return "8662";
        return "8663";
      },
    },
    {
      id: "pozarevac", name: "Požarevac", operator: "JKP Požarevac Put", operatorUrl: "https://parking012.rs",
      center: { lat: 44.6155, lng: 21.1877 },
      zones: [
        { sms: "8121", name: "I zona",         short: "I zona",  color: "#ef4444", bg: "rgba(239,68,68,0.18)",   price: "nije obj.", limit: "max 2h" },
        { sms: "8122", name: "II zona",         short: "II zona", color: "#22c55e", bg: "rgba(34,197,94,0.18)",   price: "nije obj.", limit: "∞" },
        { sms: "8123", name: "Dnevna — II zona",short: "Dnevna",  color: "#6b7280", bg: "rgba(107,114,128,0.15)", price: "nije obj.", limit: "dnevna" },
        { sms: "8124", name: "B zona",          short: "B zona",  color: "#3b82f6", bg: "rgba(59,130,246,0.18)",  price: "nije obj.", limit: "max 2h" },
        { sms: "8120", name: "Extra B zona",    short: "Extra B", color: "#a855f7", bg: "rgba(168,85,247,0.18)",  price: "nije obj.", limit: "1h" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 44.6155, 21.1877);
        if (dCenter < 400) return "8121";
        if (dCenter < 900) return "8122";
        return "8124";
      },
    },
    {
      id: "zajecar", name: "Zaječar", operator: "JKP Zaječarparking", operatorUrl: "https://zajecarparking.co.rs",
      center: { lat: 43.9057, lng: 22.2728 },
      zones: [
        { sms: "9053", name: "I zona — Crvena", short: "I zona",  color: "#ef4444", bg: "rgba(239,68,68,0.18)",   price: "nije obj.", limit: "pon-sub 7-21h" },
        { sms: "9055", name: "II zona — Žuta",  short: "II zona", color: "#eab308", bg: "rgba(234,179,8,0.18)",   price: "nije obj.", limit: "pon-sub 7-21h" },
        { sms: "9054", name: "Dnevna karta",    short: "Dnevna",  color: "#6b7280", bg: "rgba(107,114,128,0.15)", price: "nije obj.", limit: "dnevna" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 43.9057, 22.2728);
        if (dCenter < 500) return "9053";
        return "9055";
      },
    },
    {
      id: "krusevac", name: "Kruševac", operator: "JKP Komunalac Kruševac", operatorUrl: "https://parkingkrusevac.rs",
      center: { lat: 43.5819, lng: 21.3311 },
      zones: [
        { sms: "9344", name: "I zona — Crvena", short: "I zona",  color: "#ef4444", bg: "rgba(239,68,68,0.18)",  price: "nije obj.", limit: "120 min" },
        { sms: "9345", name: "II zona — Žuta",  short: "II zona", color: "#eab308", bg: "rgba(234,179,8,0.18)",  price: "nije obj.", limit: "pon-sub 7-20h" },
        { sms: "9346", name: "Dnevna — I zona", short: "Dnevna",  color: "#dc2626", bg: "rgba(220,38,38,0.15)", price: "nije obj.", limit: "dnevna" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 43.5819, 21.3311);
        if (dCenter < 500) return "9344";
        return "9345";
      },
    },
    {
      id: "leskovac", name: "Leskovac", operator: "JKP Komunalne usluge Leskovac", operatorUrl: "https://jkpleskovac.rs",
      center: { lat: 42.9982, lng: 21.9459 },
      zones: [
        { sms: "9355", name: "I zona — Crvena",  short: "I zona",  color: "#ef4444", bg: "rgba(239,68,68,0.18)",  price: "nije obj.", limit: "120 min" },
        { sms: "9356", name: "II zona — Zelena", short: "II zona", color: "#22c55e", bg: "rgba(34,197,94,0.18)",  price: "nije obj.", limit: "pon-sub 7-20h" },
        { sms: "9357", name: "Dnevna — I zona",  short: "Dnevna",  color: "#dc2626", bg: "rgba(220,38,38,0.15)", price: "nije obj.", limit: "dnevna" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 42.9982, 21.9459);
        if (dCenter < 500) return "9355";
        return "9356";
      },
    },
    {
      id: "vranje", name: "Vranje", operator: "JKP Komunalne delatnosti Vranje", operatorUrl: "https://jkpvranje.rs",
      center: { lat: 42.5497, lng: 21.9001 },
      zones: [
        { sms: "9370", name: "I zona — Crvena",  short: "I zona",  color: "#ef4444", bg: "rgba(239,68,68,0.18)",  price: "nije obj.", limit: "120 min" },
        { sms: "9371", name: "II zona — Zelena", short: "II zona", color: "#22c55e", bg: "rgba(34,197,94,0.18)",  price: "nije obj.", limit: "pon-sub 7-20h" },
        { sms: "9372", name: "Dnevna — I zona",  short: "Dnevna",  color: "#dc2626", bg: "rgba(220,38,38,0.15)", price: "nije obj.", limit: "dnevna" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 42.5497, 21.9001);
        if (dCenter < 500) return "9370";
        return "9371";
      },
    },
    {
      id: "uzice", name: "Užice", operator: "JKP Komunalac Užice", operatorUrl: "https://jkpkomunalac.rs",
      center: { lat: 43.8571, lng: 19.8441 },
      zones: [
        { sms: "9305", name: "I zona — Crvena",  short: "I zona",  color: "#ef4444", bg: "rgba(239,68,68,0.18)",  price: "nije obj.", limit: "120 min" },
        { sms: "9306", name: "II zona — Zelena", short: "II zona", color: "#22c55e", bg: "rgba(34,197,94,0.18)",  price: "nije obj.", limit: "pon-sub 7-20h" },
        { sms: "9307", name: "Dnevna — I zona",  short: "Dnevna",  color: "#dc2626", bg: "rgba(220,38,38,0.15)", price: "nije obj.", limit: "dnevna" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 43.8571, 19.8441);
        if (dCenter < 500) return "9305";
        return "9306";
      },
    },
    {
      id: "jagodina", name: "Jagodina", operator: "JKP Jagodina", operatorUrl: "https://jkpjagodina.rs",
      center: { lat: 43.9784, lng: 21.2614 },
      zones: [
        { sms: "9385", name: "I zona — Crvena",  short: "I zona",  color: "#ef4444", bg: "rgba(239,68,68,0.18)",  price: "nije obj.", limit: "120 min" },
        { sms: "9386", name: "II zona — Zelena", short: "II zona", color: "#22c55e", bg: "rgba(34,197,94,0.18)",  price: "nije obj.", limit: "pon-sub 7-20h" },
        { sms: "9387", name: "Dnevna — I zona",  short: "Dnevna",  color: "#dc2626", bg: "rgba(220,38,38,0.15)", price: "nije obj.", limit: "dnevna" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 43.9784, 21.2614);
        if (dCenter < 500) return "9385";
        return "9386";
      },
    },
    {
      id: "sombor", name: "Sombor", operator: "JKP Sombor", operatorUrl: "https://jkpsombor.rs",
      center: { lat: 45.7742, lng: 19.1122 },
      zones: [
        { sms: "9262", name: "I zona — Crvena", short: "I zona",  color: "#ef4444", bg: "rgba(239,68,68,0.18)",  price: "nije obj.", limit: "120 min" },
        { sms: "9263", name: "II zona — Žuta",  short: "II zona", color: "#eab308", bg: "rgba(234,179,8,0.18)",  price: "nije obj.", limit: "pon-sub 7-20h" },
        { sms: "9264", name: "Dnevna — I zona", short: "Dnevna",  color: "#dc2626", bg: "rgba(220,38,38,0.15)", price: "nije obj.", limit: "dnevna" },
      ],
      detectZone: (lat, lng) => {
        const dCenter = haversineMeters(lat, lng, 45.7742, 19.1122);
        if (dCenter < 500) return "9262";
        return "9263";
      },
    },
  ];

  if (process.env.NODE_ENV !== "production") {
    for (const city of SMS_CITIES) {
      const zoneSmsSet = new Set(city.zones.map(z => z.sms));
      const testCodes = [city.detectZone(city.center.lat, city.center.lng)];
      for (const code of testCodes) {
        if (!zoneSmsSet.has(code)) {
          console.warn(`[SMS_CITIES] ${city.id}: detectZone returned "${code}" which is not in zones array`);
        }
      }
    }
  }

  function detectCityByGps(lat: number, lng: number): string {
    if (lat >= 45.20 && lat <= 45.36 && lng >= 19.72 && lng <= 19.98) return "novi_sad";
    if (lat >= 43.27 && lat <= 43.40 && lng >= 21.82 && lng <= 22.06) return "nis";
    if (lat >= 43.98 && lat <= 44.08 && lng >= 20.82 && lng <= 21.05) return "kragujevac";
    if (lat >= 46.06 && lat <= 46.12 && lng >= 19.61 && lng <= 19.73) return "subotica";
    if (lat >= 45.36 && lat <= 45.42 && lng >= 20.35 && lng <= 20.44) return "zrenjanin";
    if (lat >= 43.87 && lat <= 43.91 && lng >= 20.33 && lng <= 20.37) return "cacak";
    if (lat >= 44.26 && lat <= 44.29 && lng >= 19.87 && lng <= 19.91) return "valjevo";
    if (lat >= 43.12 && lat <= 43.16 && lng >= 20.50 && lng <= 20.53) return "novi_pazar";
    if (lat >= 44.85 && lat <= 44.90 && lng >= 20.62 && lng <= 20.66) return "pancevo";
    if (lat >= 44.74 && lat <= 44.77 && lng >= 19.68 && lng <= 19.71) return "sabac";
    if (lat >= 44.65 && lat <= 44.68 && lng >= 20.91 && lng <= 20.95) return "smederevo";
    if (lat >= 44.60 && lat <= 44.63 && lng >= 21.17 && lng <= 21.21) return "pozarevac";
    if (lat >= 43.89 && lat <= 43.92 && lng >= 22.26 && lng <= 22.30) return "zajecar";
    if (lat >= 43.56 && lat <= 43.60 && lng >= 21.31 && lng <= 21.35) return "krusevac";
    if (lat >= 42.97 && lat <= 43.02 && lng >= 21.92 && lng <= 21.97) return "leskovac";
    if (lat >= 42.53 && lat <= 42.57 && lng >= 21.88 && lng <= 21.93) return "vranje";
    if (lat >= 43.84 && lat <= 43.88 && lng >= 19.82 && lng <= 19.87) return "uzice";
    if (lat >= 43.96 && lat <= 44.00 && lng >= 21.24 && lng <= 21.29) return "jagodina";
    if (lat >= 45.76 && lat <= 45.79 && lng >= 19.09 && lng <= 19.14) return "sombor";
    if (lat >= 44.65 && lat <= 44.95 && lng >= 20.20 && lng <= 20.65) return "beograd";
    let closest = "novi_sad";
    let minDist = Infinity;
    for (const city of SMS_CITIES) {
      const d = haversineMeters(lat, lng, city.center.lat, city.center.lng);
      if (d < minDist) { minDist = d; closest = city.id; }
    }
    return closest;
  }

  const activeSmsCity = SMS_CITIES.find(c => c.id === smsCity) ?? SMS_CITIES[0];

  function openSmsModal() {
    setSuggestedZone(null);
    setSmsCityDropdownOpen(false);
    setSmsOpen(true);
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detectedCity = detectCityByGps(pos.coords.latitude, pos.coords.longitude);
        const city = SMS_CITIES.find(c => c.id === detectedCity) ?? SMS_CITIES[0];
        setSmsCity(detectedCity);
        localStorage.setItem("cardrop_sms_city", detectedCity);
        setSuggestedZone(city.detectZone(pos.coords.latitude, pos.coords.longitude));
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 8000, maximumAge: 30000 }
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#0d1117", paddingTop: 'env(safe-area-inset-top)' }}>
      {/* ── Push notification banner — blocked ── */}
      {isAuthenticated && pushSupported && pushPermission === 'denied' && !pushBannerDismissed && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-3 py-2"
          style={{ background: "#7f1d1d", borderBottom: "1px solid rgba(255,255,255,0.10)" }}
        >
          <BellOff size={14} style={{ color: "#fca5a5", flexShrink: 0 }} />
          <span className="text-xs flex-1" style={{ color: "#fecaca" }}>
            Notifikacije blokirane → Podešavanja → Chrome → Obaveštenja
          </span>
          <button
            data-testid="btn-push-banner-dismiss"
            onClick={() => setPushBannerDismissed(true)}
            className="flex-shrink-0"
          >
            <X size={14} style={{ color: "#f87171" }} />
          </button>
        </div>
      )}
      {/* ── Push notification banner — not subscribed ── */}
      {isAuthenticated && pushSupported && !pushSubscribed && pushPermission !== 'denied' && !pushBannerDismissed && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-3 py-2"
          style={{ background: "#1B4332", borderBottom: "1px solid rgba(255,255,255,0.10)" }}
        >
          <Bell size={14} style={{ color: "#6ee7b7", flexShrink: 0 }} />
          <span className="text-xs flex-1" style={{ color: "#d1fae5" }}>
            Aktiviraj obavještenja za paukove i zlatne minute
          </span>
          <button
            data-testid="btn-push-banner-activate"
            onClick={async () => {
              const ok = await pushSubscribe();
              if (ok) setPushBannerDismissed(true);
            }}
            disabled={pushLoading}
            className="text-xs font-semibold px-2 py-1 rounded-md flex-shrink-0"
            style={{ background: "#059669", color: "#fff" }}
          >
            {pushLoading ? "..." : "Aktiviraj"}
          </button>
          <button
            data-testid="btn-push-banner-dismiss"
            onClick={() => setPushBannerDismissed(true)}
            className="flex-shrink-0"
          >
            <X size={14} style={{ color: "#6b7280" }} />
          </button>
        </div>
      )}
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
            {(selectedMarker.type === "zlatni_minut" || selectedMarker.type === "stek" || selectedMarker.type === "pauk" || selectedMarker.type === "kamera") && (
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
                      placeholder={
                        selectedMarker.type === "zlatni_minut"
                          ? "Dodaj komentar o parking mestu..."
                          : selectedMarker.type === "kamera"
                          ? "Dodaj opis kamere..."
                          : "Dodaj informaciju o štek lokaciji..."
                      }
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
          onClick={() => closeParkingPanel()}
        >
          <div
            className="rounded-t-2xl px-4 pt-4 pb-6 flex flex-col gap-3"
            style={{ background: "#1a1f2b", border: "1px solid rgba(255,255,255,0.10)", maxHeight: "70vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {(() => {
                  const ps = parkingPinStyle(selectedParking.subscriptionType);
                  return (
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: ps.bg, border: `1.5px solid ${ps.border}` }}>
                      <span className="font-bold text-xs" style={{ color: ps.text }}>P</span>
                    </div>
                  );
                })()}
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-white text-sm truncate">{selectedParking.title}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-semibold" style={{ color: "#14b8a6" }}>Privatni parking</span>
                    {selectedParking.subscriptionType === "gold" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(218,165,32,0.18)", color: "#fbbf24", border: "1px solid rgba(218,165,32,0.4)" }}>Gold</span>
                    )}
                    {selectedParking.subscriptionType === "silver" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(148,163,184,0.18)", color: "#cbd5e1", border: "1px solid rgba(148,163,184,0.4)" }}>Silver</span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => closeParkingPanel()} className="flex-shrink-0 ml-2">
                <X size={16} style={{ color: "#9ca3af" }} />
              </button>
            </div>

            {/* Parking number + Address */}
            {selectedParking.parkingNumber && (
              <div className="inline-flex items-center gap-1.5">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-lg" style={{ background: "rgba(82,183,136,0.15)", color: "#52B788", border: "1px solid rgba(82,183,136,0.35)" }}>
                  #{selectedParking.parkingNumber}
                </span>
              </div>
            )}
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

            {/* Images gallery — iznad opisa da bude uvijek vidljiva */}
            {selectedParking.imageUrls && selectedParking.imageUrls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {selectedParking.imageUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Parking slika ${i + 1}`}
                    className="rounded-xl flex-shrink-0 object-cover"
                    style={{ width: 120, height: 80, border: "1px solid rgba(255,255,255,0.10)" }}
                  />
                ))}
              </div>
            )}

            {/* Description — truncated sa "Prikaži više" */}
            {selectedParking.description && (
              <div>
                <div
                  className="px-3 py-2 rounded-xl text-xs"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    color: "#d1d5db",
                    lineHeight: 1.6,
                    display: '-webkit-box',
                    WebkitLineClamp: descExpanded ? undefined : 3,
                    WebkitBoxOrient: 'vertical' as const,
                    overflow: descExpanded ? 'visible' : 'hidden',
                  } as React.CSSProperties}
                >
                  {selectedParking.description}
                </div>
                {selectedParking.description.length > 120 && (
                  <button
                    onClick={() => setDescExpanded(prev => !prev)}
                    className="text-xs mt-1 font-medium"
                    style={{ color: "#14b8a6" }}
                  >
                    {descExpanded ? "Prikaži manje ▲" : "Prikaži više ▼"}
                  </button>
                )}
              </div>
            )}

            {/* Contact */}
            {(selectedParking.phone || selectedParking.contactEmail) && (
              <div className="flex flex-col gap-2">
                {selectedParking.phone && (
                  <a
                    href={`tel:${selectedParking.phone}`}
                    className="flex items-center gap-2 py-2 px-3 rounded-xl"
                    style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}
                    data-testid="link-parking-phone"
                  >
                    <Smartphone size={13} style={{ color: "#4ade80" }} />
                    <span className="text-sm font-semibold" style={{ color: "#4ade80" }}>{selectedParking.phone}</span>
                  </a>
                )}
                {selectedParking.phone && (
                  <div className="flex gap-2">
                    <a
                      href={`viber://chat?number=${encodeURIComponent(formatPhoneForMessaging(selectedParking.phone))}`}
                      data-testid="link-parking-viber"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: "rgba(115,96,242,0.12)", border: "1px solid rgba(115,96,242,0.30)", color: "#a78bfa" }}
                    >
                      <SiViber size={14} />
                      Viber
                    </a>
                    <a
                      href={`https://wa.me/${formatPhoneForMessaging(selectedParking.phone).replace('+', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="link-parking-whatsapp"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.30)", color: "#4ade80" }}
                    >
                      <SiWhatsapp size={14} />
                      WhatsApp
                    </a>
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

            {/* Booking button */}
            <button
              data-testid="button-rezervisi-parking"
              onClick={() => setShowParkingBookingForm(prev => !prev)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "rgba(64,145,108,0.18)", border: "1px solid rgba(82,183,136,0.45)", color: "#52B788" }}
            >
              <CreditCard size={14} />
              Plati ili rezerviši parking
            </button>

            {/* No payment message */}
            {showParkingBookingForm && !selectedParking.stripeLinkActive && (
              <div className="px-3 py-2.5 rounded-xl text-xs text-center" style={{ background: "rgba(255,255,255,0.04)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.08)" }}>
                Za ovaj parking nije aktivno online plaćanje. Molimo kontaktirajte vlasnika za plaćanje.
              </div>
            )}

            {/* Booking form */}
            {showParkingBookingForm && selectedParking.stripeLinkActive && (
              <div className="flex flex-col gap-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {/* License plate */}
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "#9ca3af" }}>Registarska tablica</label>
                  <Input
                    placeholder="npr. NS 123-AB"
                    value={parkingLicensePlate}
                    onChange={(e) => setParkingLicensePlate(e.target.value.toUpperCase())}
                    data-testid="input-license-plate-map"
                    className="bg-transparent border-white/10 text-white placeholder:text-white/30 focus-visible:ring-green-500/40"
                  />
                </div>

                {/* Monthly */}
                {selectedParking.pricingType === 'monthly' && (
                  <div className="space-y-2">
                    <p className="text-xs rounded-lg px-2 py-1.5" style={{ background: "rgba(255,255,255,0.04)", color: "#9ca3af" }}>
                      Mesečno iznajmljivanje.
                    </p>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "#9ca3af" }}>Datum početka</label>
                      <Calendar
                        mode="single"
                        selected={parkingBookingStartDate}
                        onSelect={setParkingBookingStartDate}
                        disabled={(date) => date < startOfDay(new Date())}
                        className="rounded-xl border-white/10 bg-transparent text-white w-full"
                        data-testid="calendar-booking-monthly-map"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "#9ca3af" }}>Broj meseci</label>
                      <Select value={String(parkingNumMonths)} onValueChange={(v) => setParkingNumMonths(Number(v))}>
                        <SelectTrigger data-testid="select-num-months-map" className="bg-transparent border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 6, 12].map(n => (
                            <SelectItem key={n} value={String(n)}>
                              {n} {n === 1 ? 'mesec' : n < 5 ? 'meseca' : 'meseci'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Daily */}
                {selectedParking.pricingType === 'daily' && (
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "#9ca3af" }}>Period zakupa</label>
                    <Calendar
                      mode="range"
                      selected={{ from: parkingBookingStartDate, to: parkingBookingEndDate }}
                      onSelect={(range) => { setParkingBookingStartDate(range?.from); setParkingBookingEndDate(range?.to); }}
                      disabled={(date) => date < startOfDay(new Date())}
                      className="rounded-xl border-white/10 bg-transparent text-white w-full"
                      data-testid="calendar-booking-daily-map"
                    />
                  </div>
                )}

                {/* Hourly */}
                {selectedParking.pricingType === 'hourly' && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "#9ca3af" }}>Dan</label>
                      <Calendar
                        mode="single"
                        selected={parkingBookingStartDate}
                        onSelect={setParkingBookingStartDate}
                        disabled={(date) => date < startOfDay(new Date())}
                        className="rounded-xl border-white/10 bg-transparent text-white w-full"
                        data-testid="calendar-booking-hourly-map"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "#9ca3af" }}>Od sata</label>
                        <Select value={String(parkingStartHour)} onValueChange={(v) => { const h = Number(v); setParkingStartHour(h); if (parkingEndHour <= h) setParkingEndHour(h + 1); }}>
                          <SelectTrigger data-testid="select-start-hour-map" className="bg-transparent border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 23 }, (_, i) => i).map(h => (
                              <SelectItem key={h} value={String(h)}>{String(h).padStart(2, '0')}:00</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "#9ca3af" }}>Do sata</label>
                        <Select value={String(parkingEndHour)} onValueChange={(v) => setParkingEndHour(Number(v))}>
                          <SelectTrigger data-testid="select-end-hour-map" className="bg-transparent border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 23 }, (_, i) => i + 1).map(h => (
                              <SelectItem key={h} value={String(h)} disabled={h <= parkingStartHour}>
                                {String(h).padStart(2, '0')}:00
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Price total */}
                {parkingCalculatedPrice > 0 && (
                  <div className="flex justify-between items-center px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <span className="text-xs" style={{ color: "#9ca3af" }}>Ukupno:</span>
                    <span className="text-lg font-bold" style={{ color: "#52B788" }} data-testid="text-total-price-map">
                      {parkingCalculatedPrice.toLocaleString('sr-RS')} RSD
                    </span>
                  </div>
                )}

                <p className="text-xs text-center" style={{ color: "#6b7280" }}>
                  Kada jednom uplatite, sledeći put sve ide na samo jedan klik.
                </p>

                <button
                  data-testid="button-nastavi-na-placanje-map"
                  onClick={() => parkingBookingCheckoutMutation.mutate()}
                  disabled={parkingBookingCheckoutMutation.isPending || !parkingLicensePlate.trim() || parkingCalculatedPrice <= 0}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "rgba(64,145,108,0.25)", border: "1px solid rgba(82,183,136,0.5)", color: "#52B788" }}
                >
                  {parkingBookingCheckoutMutation.isPending
                    ? <><Loader2 size={14} className="animate-spin" />Učitavanje...</>
                    : <><CreditCard size={14} />Nastavi na plaćanje</>
                  }
                </button>
              </div>
            )}
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
              const isSubscriptionPlan = plan === "premium" || plan === "godisnji_premium";
              return (
                <button
                  data-testid="btn-plan-badge"
                  onClick={() => {
                    if (isSubscriptionPlan) {
                      setMojPaketOpen(true);
                    } else {
                      setUpsellFeature(null);
                      setUpsellContext("");
                      setPremiumUpsellOpen(true);
                    }
                  }}
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
                  <div className="absolute top-full mt-1 rounded-xl overflow-visible z-50"
                    style={{ minWidth: 280, left: "50%", transform: "translateX(-50%)", background: "#1a1f2b", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
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
                        className="w-full flex items-start gap-2 px-3 py-2.5 text-left"
                        style={{ borderBottom: i < searchSuggestions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                        <MapPin size={12} style={{ color: "#6b7280", flexShrink: 0, marginTop: 3 }} />
                        <div className="flex flex-col gap-0.5">
                          <span style={{ color: "#e5e7eb", fontSize: 13, lineHeight: 1.3 }}>{s.text}</span>
                          {s.sub && <span style={{ color: "#9ca3af", fontSize: 11, lineHeight: 1.3 }}>{s.sub}</span>}
                        </div>
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

            {/* Google Play — shown on Android when not installed via Play */}
            {isAndroid && !isInstalled && (
              <a
                href="https://play.google.com/store/apps/details?id=cardrop.app"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="btn-google-play"
                title="Preuzmi na Google Play"
                style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
                <img
                  src={googlePlayBadgeImg}
                  alt="Get it on Google Play"
                  style={{ height: 32, width: "auto", display: "block" }}
                />
              </a>
            )}
            {/* PWA Install — shown on iOS only; hidden on Android (use Play Store instead) */}
            {!isInstalled && !isAndroid && isIos && (
              <button
                data-testid="btn-pwa-install"
                onClick={() => setShowPwaModal(true)}
                title="Instaliraj aplikaciju"
                className="kraft-btn relative flex items-center justify-center"
                style={{ width: 34, height: 34, borderRadius: "50%", background: "#059669", border: "none" }}>
                <Download size={15} style={{ color: "#fff" }} />
              </button>
            )}
            {/* PWA Install — shown on non-Android/non-iOS when installable */}
            {!isInstalled && !isAndroid && !isIos && isInstallable && (
              <button
                data-testid="btn-pwa-install-desktop"
                onClick={() => installApp()}
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
                        setBurgerMenuOpen(false);
                        if (!pushSubscribed) {
                          await pushSubscribe();
                        }
                        const newEnabled = !(user.mapNotificationsEnabled ?? true);
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
          { key: "zlatni_minut", label: "Zlatni Minut",     icon: "⏱" },
          { key: "pauk",         label: "Pauk",             icon: "🚛" },
          { key: "stek",         label: "Štek",             icon: "🏠" },
          { key: "parking",      label: "Privatan Parking", icon: "🅿" },
        ] as const).map(f => {
          const isActive = activeFilters.includes(f.key);
          const isLocked = f.key === "stek" && !isPremium;
          return (
            <button
              key={f.key}
              data-testid={`filter-tab-${f.key}`}
              onClick={() => {
                if (isLocked) {
                  setUpsellFeature("stek");
                  setUpsellContext("");
                  setPremiumUpsellOpen(true);
                  return;
                }
                setActiveFilters(prev => {
                  const without = prev.filter(x => x !== "sve" && x !== f.key);
                  const next = prev.includes(f.key) ? without : [...without, f.key];
                  return next.length === 0 ? ["sve"] : next;
                });
              }}
              className="kraft-btn flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: isLocked ? "rgba(255,255,255,0.07)" : isActive ? markerColor(f.key) + "22" : "rgba(255,255,255,0.05)",
                border: `1px solid ${isLocked ? "rgba(255,255,255,0.15)" : isActive ? markerColor(f.key) + "66" : "rgba(255,255,255,0.1)"}`,
                color: isLocked ? "#6b7280" : isActive ? markerColor(f.key) : "#9ca3af",
                opacity: isLocked ? 0.78 : 1,
              }}>
              {isLocked ? <Lock size={11} style={{ color: "#6b7280" }} /> : <span>{f.icon}</span>}
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
          const isLocked = !isPremium;
          return (
            <button
              key="safe_zone"
              data-testid="filter-tab-safe_zone"
              onClick={() => {
                if (isLocked) {
                  setUpsellFeature("safe_zone");
                  setUpsellContext("");
                  setPremiumUpsellOpen(true);
                  return;
                }
                const willActivate = !activeFilters.includes("safe_zone");
                setActiveFilters(prev => {
                  const without = prev.filter(x => x !== "sve" && x !== "safe_zone");
                  const next = prev.includes("safe_zone") ? without : [...without, "safe_zone"];
                  return next.length === 0 ? ["sve"] : next;
                });
                if (willActivate && safeZone?.lat && safeZone?.lng) {
                  const lat = parseFloat(safeZone.lat);
                  const lng = parseFloat(safeZone.lng);
                  if (mapFlyToRef.current) {
                    mapFlyToRef.current.flyTo(lat, lng);
                  } else {
                    setFlyToLocation({ lat, lng });
                  }
                }
              }}
              className="kraft-btn flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: isLocked ? "rgba(255,255,255,0.07)" : isActive ? markerColor("safe_zone") + "22" : "rgba(255,255,255,0.05)",
                border: `1px solid ${isLocked ? "rgba(255,255,255,0.15)" : isActive ? markerColor("safe_zone") + "66" : "rgba(255,255,255,0.1)"}`,
                color: isLocked ? "#6b7280" : isActive ? markerColor("safe_zone") : "#9ca3af",
                opacity: isLocked ? 0.78 : 1,
              }}>
              {isLocked ? <Lock size={11} style={{ color: "#6b7280" }} /> : <span>🛡</span>}
              <span>Safe Zone</span>
            </button>
          );
        })()}
        {safeZone && (
          <button
            key="safe_zone_delete"
            data-testid="btn-delete-safe-zone"
            onClick={() => deleteSafeZoneMutation.mutate()}
            disabled={deleteSafeZoneMutation.isPending}
            title="Ukloni Safe Zonu"
            className="kraft-btn flex-shrink-0 flex items-center justify-center rounded-full"
            style={{
              width: 26, height: 26,
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.4)",
              color: "#f87171",
            }}>
            {deleteSafeZoneMutation.isPending
              ? <Loader2 size={11} className="animate-spin" />
              : <Trash2 size={11} />}
          </button>
        )}
        {/* Kamere — vidljivo svima (free + premium) */}
        {(() => {
          const isActive = activeFilters.includes("kamera");
          return (
            <button
              key="kamera"
              data-testid="filter-tab-kamera"
              onClick={() => {
                setActiveFilters(prev => {
                  const without = prev.filter(x => x !== "sve" && x !== "kamera");
                  const next = prev.includes("kamera") ? without : [...without, "kamera"];
                  return next.length === 0 ? ["sve"] : next;
                });
              }}
              className="kraft-btn flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: isActive ? "#0ea5e922" : "rgba(255,255,255,0.05)",
                border: `1px solid ${isActive ? "#0ea5e966" : "rgba(255,255,255,0.1)"}`,
                color: isActive ? "#0ea5e9" : "#9ca3af",
              }}>
              <Camera size={11} />
              <span>Kamere</span>
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
      {/* ── Parking filter bar ── */}
      {!chatFullscreen && parkingListings.length > 0 && (
        <>
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5"
            style={{ background: "rgba(20,184,166,0.08)", borderBottom: parkingFilterOpen ? "none" : "1px solid rgba(20,184,166,0.15)" }}>
            <Car size={12} style={{ color: "#14b8a6", flexShrink: 0 }} />
            <span className="text-xs flex-1" style={{ color: "#14b8a6" }}>
              Privatni parking oglasi — {filteredParkingListings.length}
              {parkingFilterCount > 0 && ` / ${parkingListings.length}`}
            </span>
            <button
              data-testid="btn-parking-filter-toggle"
              onClick={() => setParkingFilterOpen(p => !p)}
              className="kraft-btn flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background: parkingFilterCount > 0 ? "rgba(20,184,166,0.25)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${parkingFilterCount > 0 ? "rgba(20,184,166,0.5)" : "rgba(255,255,255,0.12)"}`,
                color: parkingFilterCount > 0 ? "#14b8a6" : "#9ca3af",
              }}>
              <Search size={10} />
              <span>Filter</span>
              {parkingFilterCount > 0 && (
                <span className="flex items-center justify-center rounded-full font-bold"
                  style={{ width: 14, height: 14, background: "#14b8a6", color: "#0d1117", fontSize: 9 }}>
                  {parkingFilterCount}
                </span>
              )}
            </button>
            {parkingFilterCount > 0 && (
              <button
                data-testid="btn-parking-filter-reset"
                onClick={() => setParkingFilter({ city: "", pricingType: "", evCharging: false, is24Hours: false, hasCamera: false })}
                className="kraft-btn flex items-center justify-center rounded-full"
                style={{ width: 20, height: 20, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", flexShrink: 0 }}>
                <X size={10} />
              </button>
            )}
          </div>
          {/* ── Filter drawer ── */}
          {parkingFilterOpen && (
            <div className="flex-shrink-0 px-3 py-3 flex flex-col gap-3"
              style={{ background: "rgba(13,17,23,0.97)", borderBottom: "1px solid rgba(20,184,166,0.15)" }}>
              {/* City row */}
              {availableCities.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold" style={{ color: "#6b7280" }}>Grad</span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableCities.map(c => {
                      const CITY_LABELS: Record<string, string> = {
                        beograd: "Beograd", novi_sad: "Novi Sad", nis: "Niš", kragujevac: "Kragujevac",
                        subotica: "Subotica", zrenjanin: "Zrenjanin", pancevo: "Pančevo", cacak: "Čačak",
                        novi_pazar: "Novi Pazar", kraljevo: "Kraljevo", smederevo: "Smederevo",
                        leskovac: "Leskovac", sabac: "Šabac", uzice: "Užice", valjevo: "Valjevo",
                        vranje: "Vranje", ostalo: "Ostalo",
                      };
                      const label = CITY_LABELS[c] ?? c;
                      const active = parkingFilter.city === c;
                      return (
                        <button
                          key={c}
                          data-testid={`parking-filter-city-${c}`}
                          onClick={() => setParkingFilter(prev => ({ ...prev, city: active ? "" : c }))}
                          className="kraft-btn px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: active ? "rgba(20,184,166,0.25)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${active ? "#14b8a6" : "rgba(255,255,255,0.1)"}`,
                            color: active ? "#14b8a6" : "#9ca3af",
                          }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Pricing type row */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold" style={{ color: "#6b7280" }}>Tip zakupa</span>
                <div className="flex gap-1.5">
                  {([
                    { key: "daily", label: "Dnevno" },
                    { key: "monthly", label: "Mesečno" },
                    { key: "hourly", label: "Po satu" },
                  ] as const).map(({ key, label }) => {
                    const active = parkingFilter.pricingType === key;
                    return (
                      <button
                        key={key}
                        data-testid={`parking-filter-pricing-${key}`}
                        onClick={() => setParkingFilter(prev => ({ ...prev, pricingType: active ? "" : key }))}
                        className="kraft-btn px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: active ? "rgba(20,184,166,0.25)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${active ? "#14b8a6" : "rgba(255,255,255,0.1)"}`,
                          color: active ? "#14b8a6" : "#9ca3af",
                        }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Boolean feature toggles */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold" style={{ color: "#6b7280" }}>Karakteristike</span>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { key: "evCharging" as const, label: "EV punjač" },
                    { key: "is24Hours" as const, label: "Otvoreno 24/7" },
                    { key: "hasCamera" as const, label: "Kamera" },
                  ]).map(({ key, label }) => {
                    const active = parkingFilter[key];
                    return (
                      <button
                        key={key}
                        data-testid={`parking-filter-feat-${key}`}
                        onClick={() => setParkingFilter(prev => ({ ...prev, [key]: !prev[key] }))}
                        className="kraft-btn px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: active ? "rgba(20,184,166,0.25)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${active ? "#14b8a6" : "rgba(255,255,255,0.1)"}`,
                          color: active ? "#14b8a6" : "#9ca3af",
                        }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {/* ── Map area ── */}
      <div
        className={mapExpanded ? "relative flex-1" : "relative flex-shrink-0"}
        style={{ height: mapExpanded ? undefined : "36vh", minHeight: 180, display: chatFullscreen ? "none" : undefined }}
      >
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
            if (addMode === "zlatni_minut" || addMode === "pauk" || addMode === "radar" || addMode === "kamera") {
              setPendingPlacement({ type: addMode, lat, lng });
              setPendingComment("");
              return;
            }
            addMarkerMutation.mutate({ type: addMode, lat, lng });
          }}
          onContextMenu={(lat, lng) => {
            if (!isPremium) { setUpsellFeature(null); setUpsellContext("Safe Zone alarm dostupan je Premium korisnicima"); setPremiumUpsellOpen(true); return; }
            setSafeZoneMutation.mutate({ lat, lng, radiusMeters: 300 });
          }}
          onCenterChange={(lat, lng) => setMapCenter({ lat, lng })}
          chatPreviewMsg={null}
          onChatClick={undefined}
          parkingListings={filteredParkingListings}
          flyToLocation={flyToLocation}
          onParkingClick={setSelectedParking}
          sizeKey={mapExpanded}
          onMapReady={(controls) => { mapFlyToRef.current = controls; }}
        />

        {/* Map expand/collapse toggle button */}
        <button
          data-testid="btn-map-expand"
          onClick={() => setMapExpanded(prev => !prev)}
          className="kraft-btn flex items-center justify-center"
          style={{
            position: "absolute", top: 8, left: 8, zIndex: 10,
            width: 34, height: 34, borderRadius: "50%",
            background: "rgba(13,17,23,0.75)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}>
          {mapExpanded
            ? <Minimize2 size={15} style={{ color: "#fff" }} />
            : <Maximize2 size={15} style={{ color: "#fff" }} />
          }
        </button>

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
      <div className="flex-shrink-0 px-3 pt-2.5"
        style={{ background: "#0d1117", borderTop: "1px solid rgba(255,255,255,0.08)", display: chatFullscreen ? "none" : undefined, paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {/* Izdaj Parking — prvo mesto u action baru */}
          <button
            data-testid="btn-izdaj-parking"
            onClick={() => setLocation("/select-category")}
            className="kraft-btn flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl"
            style={{ width: 58, height: 58, background: "#0c4a6e", border: "1.5px solid #0ea5e9" }}>
            <Plus size={18} style={{ color: "#7dd3fc" }} />
            <span className="font-bold text-center" style={{ color: "#7dd3fc", fontSize: 9, letterSpacing: "0.02em", lineHeight: 1.2 }}>Izdaj parking</span>
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
                onClick={() => { if (!locked) { setAddMode(isActive ? null : "stek"); setActiveTab("stek"); setWatchZonePlaceMode(false); } else { setUpsellFeature("stek"); setUpsellContext("Štek lokacije su dostupne Premium korisnicima"); setPremiumUpsellOpen(true); } }}
                className="kraft-btn flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl"
                style={{
                  width: 58, height: 58,
                  background: locked ? "#1f2937" : isActive ? "#15803d" : "#0e5c28",
                  border: `1.5px solid ${locked ? "#374151" : isActive ? "#22c55e" : "#1a8a3e"}`,
                  opacity: locked ? 0.5 : 1,
                }}>
                <div className="relative">
                  <Home size={18} style={{ color: locked ? "#4b5563" : isActive ? "#fff" : "#86efac" }} />
                  {locked && <Lock size={9} style={{ color: "#6b7280", position: "absolute", bottom: -2, right: -3 }} />}
                  {!locked && count > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full font-bold"
                      style={{ width: 14, height: 14, background: "#fff", color: "#15803d", fontSize: 7 }}>{count}</span>
                  )}
                </div>
                <span className="font-bold text-center" style={{ color: locked ? "#4b5563" : isActive ? "#fff" : "#86efac", fontSize: 9, letterSpacing: "0.02em", lineHeight: 1.2 }}>
                  Štek
                </span>
              </button>
            );
          })()}

          {/* Radar — locked za free, vidljiv ali zaključan */}
          {(() => {
            const locked = !isPremium;
            const count = mapMarkers.filter(m => m.type === "radar").length;
            const isActive = addMode === "radar";
            return (
              <button
                key="radar"
                data-testid="action-bar-radar"
                onClick={() => {
                  if (!locked) { setAddMode(isActive ? null : "radar"); setActiveTab("radar"); setWatchZonePlaceMode(false); }
                  else { setUpsellFeature("radar"); setUpsellContext("Radar markeri dostupni su Premium korisnicima"); setPremiumUpsellOpen(true); }
                }}
                className="kraft-btn flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl"
                style={{
                  width: 58, height: 58,
                  background: locked ? "#1f2937" : isActive ? "#6d28d9" : "#4c1d95",
                  border: `1.5px solid ${locked ? "#374151" : isActive ? "#8b5cf6" : "#7c3aed"}`,
                  opacity: locked ? 0.5 : 1,
                }}>
                <div className="relative">
                  <RadioTower size={18} style={{ color: locked ? "#4b5563" : isActive ? "#fff" : "#ddd6fe" }} />
                  {locked && <Lock size={9} style={{ color: "#6b7280", position: "absolute", bottom: -2, right: -3 }} />}
                  {!locked && count > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full font-bold"
                      style={{ width: 14, height: 14, background: "#fff", color: "#6d28d9", fontSize: 7 }}>{count}</span>
                  )}
                </div>
                <span className="font-bold text-center" style={{ color: locked ? "#4b5563" : isActive ? "#fff" : "#ddd6fe", fontSize: 9, letterSpacing: "0.02em", lineHeight: 1.2 }}>
                  Radar
                </span>
              </button>
            );
          })()}

          {/* Kamera — samo admin */}
          {user?.isAdmin && (() => {
            const count = mapMarkers.filter(m => m.type === "kamera").length;
            const isActive = addMode === "kamera";
            return (
              <button
                key="kamera"
                data-testid="action-bar-kamera"
                onClick={() => { setAddMode(isActive ? null : "kamera"); setWatchZonePlaceMode(false); }}
                className="kraft-btn flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl"
                style={{
                  width: 58, height: 58,
                  background: isActive ? "#0369a1" : "#0c4a6e",
                  border: `1.5px solid ${isActive ? "#0ea5e9" : "#0284c7"}`,
                }}>
                <div className="relative">
                  <Camera size={18} style={{ color: isActive ? "#fff" : "#7dd3fc" }} />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full font-bold"
                      style={{ width: 14, height: 14, background: "#fff", color: "#0369a1", fontSize: 7 }}>{count}</span>
                  )}
                </div>
                <span className="font-bold text-center" style={{ color: isActive ? "#fff" : "#7dd3fc", fontSize: 9, letterSpacing: "0.02em", lineHeight: 1.2 }}>Kamera</span>
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
            <span className="font-bold text-center" style={{ color: "#c7d2fe", fontSize: 9, letterSpacing: "0.02em", lineHeight: 1.2 }}>SMS plaćanje javnih</span>
          </button>

          {/* Zona upozorenja */}
          {(() => {
            const locked = !isPremium;
            const hasZone = !!watchArea;
            const isPlacing = watchZonePlaceMode;
            return (
              <button
                data-testid="btn-watch-zone"
                onClick={() => { if (!locked) setWatchZoneOpen(true); else { setUpsellFeature("safe_zone"); setUpsellContext("Safe Zone alarm dostupna je Premium korisnicima"); setPremiumUpsellOpen(true); } }}
                className="kraft-btn flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl"
                style={{
                  width: 58, height: 58,
                  background: locked ? "#1f2937" : (hasZone || isPlacing) ? "#92400e" : "#6b2d02",
                  border: `1.5px solid ${locked ? "#374151" : (hasZone || isPlacing) ? "#f59e0b" : "#b45309"}`,
                  opacity: locked ? 0.5 : 1,
                }}>
                <div className="relative">
                  <Bell size={18} style={{ color: locked ? "#4b5563" : (hasZone || isPlacing) ? "#fde68a" : "#fbbf24" }} />
                  {locked && <Lock size={9} style={{ color: "#6b7280", position: "absolute", bottom: -2, right: -3 }} />}
                </div>
                <span className="font-bold text-center" style={{ color: locked ? "#4b5563" : (hasZone || isPlacing) ? "#fde68a" : "#fbbf24", fontSize: 9, letterSpacing: "0.02em", lineHeight: 1.2 }}>
                  Safe zona
                </span>
              </button>
            );
          })()}

          {/* Chat — na kraju action bara */}
          <button
            data-testid="action-bar-chat"
            onClick={() => { clearUnread(); setChatFullscreen(true); }}
            className="kraft-btn flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl relative"
            style={{ width: 58, height: 58, background: "#1d4ed8", border: "1.5px solid #3b82f6" }}>
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
        </div>
      </div>
      {/* ── Chat panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden" data-testid="panel-chat"
        style={{ background: "#0d1117", display: mapExpanded && !chatFullscreen ? "none" : undefined }}>
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
              const rawText = msg.text ?? "";
              const dashIdx = rawText.indexOf(" — ");
              const baseText = dashIdx !== -1 ? rawText.slice(0, dashIdx) : rawText;
              const commentText = dashIdx !== -1 ? rawText.slice(dashIdx + 3) : null;
              const isZlatniMinut = rawText.includes("Zlatni Minut");
              const isPaukMsg = rawText.includes("Pauk Radar");
              const isRadarMsg = rawText.includes("Radar") && !isPaukMsg;
              const isKomentar = rawText.includes("komentar");
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
                  {msg.audioUrl ? (
                    <div className="mt-0.5 flex items-center gap-2 rounded-lg px-3 py-2"
                      style={{ background: "#1e3a5f", border: "1px solid rgba(59,130,246,0.3)", maxWidth: 240 }}>
                      <Mic size={13} style={{ color: "#60a5fa", flexShrink: 0 }} />
                      <audio controls
                        src={`/api/map-hack/chat/voice/${msg.audioUrl.split("/").pop()}`}
                        preload="none"
                        style={{ height: 28, minWidth: 0, flex: 1 }} />
                    </div>
                  ) : (
                    <p className="text-sm break-words mt-0.5" style={{ color: "#e5e7eb" }}>{msg.text}</p>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ marginTop: 2 }}>
                  <button
                    data-testid={`btn-reply-${msg.id}`}
                    onClick={() => setReplyingTo({ id: msg.id, nickname: msg.mapNickname, text: msg.audioUrl ? "Glasovna poruka" : (msg.text ?? "") })}
                    className="kraft-btn"
                    style={{ color: "#6b7280", padding: "2px 4px", background: "transparent", border: "none" }}
                    title="Odgovori">
                    <MessageSquare size={12} />
                  </button>
                  {user?.isAdmin && (
                    <button
                      data-testid={`btn-admin-delete-msg-${msg.id}`}
                      onClick={() => deleteChatMutation.mutate(msg.id)}
                      className="kraft-btn"
                      style={{ color: "#ef4444", padding: "2px 4px", background: "transparent", border: "none" }}
                      title="Obriši (Admin)">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
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
          {voiceState === "recording" && (
            <div className="flex items-center gap-2 px-3 pt-2 pb-0"
              style={{ animation: "none" }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "#ef4444", boxShadow: "0 0 6px #ef4444", animation: "pulse 1s infinite" }} />
              <span className="text-xs font-semibold" style={{ color: "#ef4444" }}>
                Snima se... {voiceSecondsLeft}s
              </span>
              <span className="text-xs" style={{ color: "#6b7280" }}>Pusti za slanje</span>
            </div>
          )}
          {voiceState === "uploading" && (
            <div className="flex items-center gap-2 px-3 pt-2 pb-0">
              <Loader2 size={12} className="animate-spin" style={{ color: "#60a5fa" }} />
              <span className="text-xs" style={{ color: "#60a5fa" }}>Šalje se glasovna poruka...</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2.5">
            {voiceState === "idle" && (
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
            )}
            {voiceState !== "idle" && (
              <div className="flex-1" />
            )}
            <Button size="icon" data-testid="btn-voice-chat"
              onMouseDown={voiceState === "idle" ? startVoiceRecording : undefined}
              onMouseUp={voiceState === "recording" ? stopVoiceRecording : undefined}
              onMouseLeave={voiceState === "recording" ? stopVoiceRecording : undefined}
              onTouchStart={voiceState === "idle" ? (e) => { e.preventDefault(); startVoiceRecording(); } : undefined}
              onTouchEnd={voiceState === "recording" ? (e) => { e.preventDefault(); stopVoiceRecording(); } : undefined}
              disabled={chatCooldown > 0 || voiceState === "uploading"}
              style={{
                background: voiceState === "recording" ? "#ef4444" : chatCooldown > 0 ? "#374151" : "#1e3a5f",
                border: voiceState === "recording" ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(59,130,246,0.3)",
                flexShrink: 0,
              }}>
              <Mic size={14} style={{ color: voiceState === "recording" ? "#fff" : "#60a5fa" }} />
            </Button>
            {voiceState === "idle" && (
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
            )}
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
                      : pendingPlacement.type === "kamera"
                      ? "rgba(14,165,233,0.18)"
                      : "rgba(249,115,22,0.18)",
                    border: `1px solid ${
                      pendingPlacement.type === "pauk"
                        ? "rgba(239,68,68,0.4)"
                        : pendingPlacement.type === "radar"
                        ? "rgba(139,92,246,0.4)"
                        : pendingPlacement.type === "kamera"
                        ? "rgba(14,165,233,0.4)"
                        : "rgba(249,115,22,0.4)"
                    }`,
                  }}>
                  {pendingPlacement.type === "pauk"
                    ? <AlertTriangle size={15} style={{ color: "#f87171" }} />
                    : pendingPlacement.type === "radar"
                    ? <RadioTower size={15} style={{ color: "#a78bfa" }} />
                    : pendingPlacement.type === "kamera"
                    ? <Camera size={15} style={{ color: "#38bdf8" }} />
                    : <Clock size={15} style={{ color: "#fb923c" }} />
                  }
                </div>
                <div>
                  <p className="font-bold text-white text-sm">
                    {pendingPlacement.type === "pauk"
                      ? "Pauk Radar"
                      : pendingPlacement.type === "radar"
                      ? "Radar"
                      : pendingPlacement.type === "kamera"
                      ? "Saobraćajna Kamera"
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
                    : pendingPlacement.type === "kamera"
                    ? "npr. Nadzorna kamera na raskrižju, radi 24h..."
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
                      : pendingPlacement.type === "kamera"
                      ? "#0369a1"
                      : "#c2410c",
                    border: `1px solid ${
                      pendingPlacement.type === "pauk"
                        ? "#ef4444"
                        : pendingPlacement.type === "radar"
                        ? "#8b5cf6"
                        : pendingPlacement.type === "kamera"
                        ? "#0ea5e9"
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
          onClick={() => { setSmsOpen(false); setSmsCityDropdownOpen(false); }}>
          <div className="w-full rounded-t-2xl flex flex-col"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.12)", maxWidth: 520, height: "88vh" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 pt-3 pb-2.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <p className="font-bold" style={{ color: "#f9fafb", fontSize: 15 }}>SMS Parking</p>
                <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{activeSmsCity.operator} · pošalji tablicu na broj zone</p>
              </div>
              <button onClick={() => { setSmsOpen(false); setSmsCityDropdownOpen(false); }}
                className="flex items-center justify-center rounded-full"
                style={{ width: 30, height: 30, background: "rgba(255,255,255,0.07)" }}>
                <X size={14} style={{ color: "#9ca3af" }} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>

            {/* City selector */}
            <div className="px-4 pt-2.5 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-xs font-semibold mb-1.5" style={{ color: "#9ca3af" }}>GRAD</p>
              <div className="relative">
                <button
                  data-testid="btn-sms-city-dropdown"
                  onClick={() => setSmsCityDropdownOpen(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left"
                  style={{ background: "#1a1f2b", border: "1.5px solid rgba(255,255,255,0.2)" }}>
                  <div className="flex items-center gap-2">
                    <MapPin size={13} style={{ color: "#22c55e" }} />
                    <span className="font-bold text-sm" style={{ color: "#f9fafb" }}>{activeSmsCity.name}</span>
                  </div>
                  <ChevronDown size={14} style={{ color: "#9ca3af", transform: smsCityDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                </button>
                {smsCityDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden z-10"
                    style={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                    {SMS_CITIES.map(city => (
                      <button
                        key={city.id}
                        data-testid={`btn-city-${city.id}`}
                        onClick={() => {
                          setSmsCity(city.id);
                          localStorage.setItem("cardrop_sms_city", city.id);
                          setSuggestedZone(null);
                          setSmsCityDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                        style={{
                          background: city.id === smsCity ? "rgba(34,197,94,0.12)" : "transparent",
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                        }}>
                        <span className="text-sm" style={{ color: city.id === smsCity ? "#22c55e" : "#f9fafb" }}>{city.name}</span>
                        {city.id === smsCity && <Check size={12} style={{ color: "#22c55e" }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

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
                placeholder={activeSmsCity.id === "novi_sad" ? "NS123AB" : activeSmsCity.id === "beograd" ? "BG123AB" : activeSmsCity.id === "nis" ? "NI123AB" : activeSmsCity.id === "kragujevac" ? "KG123AB" : activeSmsCity.id === "subotica" ? "SU123AB" : "ZR123AB"}
                data-testid="input-plate"
                className="h-9 text-base font-bold text-center tracking-widest"
                style={{ background: "#1a1f2b", border: "1.5px solid rgba(255,255,255,0.2)", color: "#f9fafb", letterSpacing: "0.12em" }}
                maxLength={8}
              />
              {plateInput.trim().length > 0 && (
                <p className="text-xs mt-1" style={{ color: "#22c55e" }}>
                  {plateInput.trim().toUpperCase()} — tapni zonu da pošalješ SMS
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
                  <span className="text-xs" style={{ color: "#9ca3af" }}>GPS preporučuje:</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: activeSmsCity.zones.find(z => z.sms === suggestedZone)?.bg ?? "rgba(255,255,255,0.1)",
                      color: activeSmsCity.zones.find(z => z.sms === suggestedZone)?.color ?? "#fff",
                    }}>
                    {activeSmsCity.zones.find(z => z.sms === suggestedZone)?.name ?? suggestedZone}
                  </span>
                </>
              ) : (
                <button onClick={() => {
                    setGpsLoading(true);
                    navigator.geolocation?.getCurrentPosition(
                      (pos) => {
                        const detectedCity = detectCityByGps(pos.coords.latitude, pos.coords.longitude);
                        const city = SMS_CITIES.find(c => c.id === detectedCity) ?? activeSmsCity;
                        setSmsCity(detectedCity);
                        localStorage.setItem("cardrop_sms_city", detectedCity);
                        setSuggestedZone(city.detectZone(pos.coords.latitude, pos.coords.longitude));
                        setGpsLoading(false);
                      },
                      () => setGpsLoading(false),
                      { timeout: 8000 }
                    );
                  }}
                  className="text-xs" style={{ color: "#6b7280" }}>
                  Tapni za GPS detekciju grada i zone →
                </button>
              )}
            </div>

            {/* Zone grid */}
            <div className="px-4 pt-2.5 pb-2">
              <p className="text-xs font-semibold mb-2" style={{ color: "#6b7280" }}>IZABERI ZONU — {activeSmsCity.name.toUpperCase()}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {activeSmsCity.zones.map(zone => {
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
                        background: isSuggested ? zone.bg.replace("0.18", "0.28").replace("0.15", "0.25").replace("0.12", "0.22") : zone.bg,
                        border: `1.5px solid ${isSuggested ? zone.color + "99" : zone.color + "40"}`,
                      }}>
                      {isSuggested && (
                        <span className="absolute -top-2 -right-1 font-bold px-1.5 py-0.5 rounded-full"
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
              <p className="text-xs text-center mt-3 mb-1" style={{ color: "#4b5563" }}>
                Naplaćuje se standardna SMS tarifa · samo za +381 brojeve
              </p>
              <p className="text-xs text-center mb-4" style={{ color: "#374151" }}>
                {activeSmsCity.operator}
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
                    { icon: <Clock size={14} />, color: "#f97316", label: "Zlatni Minut", desc: "Slobodno parking mesto ili dojava da neko izlazi — ističe za 45 min", badge: "Free" },
                    { icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="10" r="3"/><circle cx="12" cy="16" r="4"/>
                          <line x1="12" y1="7" x2="8" y2="3"/><line x1="12" y1="7" x2="16" y2="3"/>
                          <line x1="9" y1="9" x2="4" y2="7"/><line x1="15" y1="9" x2="20" y2="7"/>
                          <line x1="8" y1="14" x2="3" y2="13"/><line x1="16" y1="14" x2="21" y2="13"/>
                          <line x1="8" y1="18" x2="3" y2="21"/><line x1="16" y1="18" x2="21" y2="21"/>
                        </svg>
                      ), color: "#ef4444", label: "Pauk Radar", desc: "Pauk primećen u blizini — upozorenje!", badge: "Free" },
                    { icon: <Home size={14} />, color: "#22c55e", label: "Štek Parking", desc: "Tajno, skriveni ili povoljno parking mesto", badge: "Premium" },
                    { icon: <Shield size={14} />, color: "#3b82f6", label: "Safe Zone", desc: "Dobijas notifikaciju šta god da se desi u tvojoj Safe Zoni (pauk, radar, zlatni minut, štek)", badge: "Premium" },
                    { icon: <Smartphone size={14} />, color: "#6366f1", label: "SMS Plaćanje javnih", desc: "Plati javni parking putem SMS-a — 1 klik", badge: "Free" },
                    { icon: <RadioTower size={14} />, color: "#8b5cf6", label: "Radar", desc: "Policijski radar ili patrola na putu", badge: "Premium" },
                    { icon: <Car size={14} />, color: "#14b8a6", label: "Privatni Parkinzi", desc: "Pregled privatnih parkinga za iznajmljivanje u Srbiji", badge: "Free" },
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
                  <p className="text-xs" style={{ color: "#9ca3af" }}>Kada neko prijavi Pauka, Zlatni Minut, Radar ili Štek u tvojoj Safe Zoni (300m krug) dobijaš push obaveštenje odmah. Zahteva: postavljenu Safe Zonu (Premium) i dozvolu u browseru.</p>
                  <p className="text-xs mt-2" style={{ color: "#6b7280" }}>Notifikacije možeš isključiti klikom na zvonce u hederu.</p>
                </div>
              </div>

              {/* Plan info */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16 }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>Planovi</p>
                <div className="space-y-2">
                  {[
                    { plan: "Free — 0 RSD", items: ["Zlatni Minut i Pauk markeri", "SMS Plaćanje javnih zona (1 klik)", "Privatni parkinzi za najam", "Live Chat"] },
                    { plan: "Premium — 390 RSD/mes", items: ["Sve iz Free +", "Safe Zone alarm (300m, svi markeri)", "Štek lokacije", "Radar markeri", "Push notifikacije"] },
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

      {/* ── Moj Paket Modal (for premium/godisnji subscribers) ── */}
      {mojPaketOpen && user && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setMojPaketOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-2xl overflow-y-auto"
            style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "80vh" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <span className="font-bold text-white text-sm">Moj paket</span>
                <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>Upravljaj svojom pretplatom</p>
              </div>
              <button
                onClick={() => setMojPaketOpen(false)}
                className="flex items-center justify-center rounded-full"
                style={{ width: 30, height: 30, background: "rgba(255,255,255,0.07)" }}>
                <X size={14} style={{ color: "#9ca3af" }} />
              </button>
            </div>
            <div className="px-4 py-4 flex flex-col gap-4">
              {/* Plan info card */}
              <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>Aktivna pretplata</span>
                  {mapStatus?.plan === "premium" && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(218,165,32,0.15)", color: "#DAA520", border: "1px solid rgba(218,165,32,0.3)" }}>PREMIUM</span>
                  )}
                  {mapStatus?.plan === "godisnji_premium" && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.3)" }}>GODIŠNJI</span>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: "#9ca3af" }}>Plan</span>
                    <span className="text-sm font-semibold text-white">
                      {mapStatus?.plan === "premium" ? "Premium mesečni · 390 RSD/mes" : "Godišnji Premium · 3.500 RSD/god"}
                    </span>
                  </div>
                  {mapStatus?.planExpiresAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: "#9ca3af" }}>Sledeće obnavljanje</span>
                      <span className="text-sm font-semibold text-white">
                        {new Date(mapStatus.planExpiresAt).toLocaleDateString("sr-RS", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>
                  )}
                  {mapStatus?.daysLeft != null && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: "#9ca3af" }}>Preostalo</span>
                      <span className="text-sm font-semibold" style={{ color: mapStatus.daysLeft <= 3 ? "#ef4444" : "#22c55e" }}>
                        {mapStatus.daysLeft} {mapStatus.daysLeft === 1 ? "dan" : "dana"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Manage subscription button */}
              <button
                data-testid="btn-manage-subscription"
                disabled={portalPending}
                onClick={async () => {
                  setPortalPending(true);
                  try {
                    const res = await fetch("/api/map-hack/customer-portal", { method: "POST", headers: { "Content-Type": "application/json" } });
                    const data = await res.json() as { url?: string; message?: string };
                    if (!res.ok) throw new Error(data.message || "Greška");
                    window.open(data.url!, "_blank");
                  } catch (err) {
                    toast({ title: "Greška", description: err instanceof Error ? err.message : "Pokušaj ponovo", variant: "destructive" });
                  } finally {
                    setPortalPending(false);
                  }
                }}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                style={{ background: "rgba(255,255,255,0.08)", color: "#e5e7eb", border: "1px solid rgba(255,255,255,0.12)", opacity: portalPending ? 0.7 : 1 }}>
                {portalPending ? "Učitava..." : "Upravljaj pretplatom →"}
              </button>

              <p className="text-center text-xs" style={{ color: "#4b5563" }}>
                Stripe portal — otkaži ili promeni plan · Sigurno i brzo
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Premium Upsell Modal ── */}
      {premiumUpsellOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => { setPremiumUpsellOpen(false); setUpsellFeature(null); }}>
          <div
            className="w-full max-w-md rounded-t-2xl overflow-y-auto"
            style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "90vh" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <span className="font-bold text-white text-sm">Premium funkcija</span>
                <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                  {upsellContext || "Safe Zone, Štek lokacije, Radar, Push notifikacije"}
                </p>
              </div>
              <button
                onClick={() => { setPremiumUpsellOpen(false); setUpsellFeature(null); }}
                className="flex items-center justify-center rounded-full"
                style={{ width: 30, height: 30, background: "rgba(255,255,255,0.07)" }}>
                <X size={14} style={{ color: "#9ca3af" }} />
              </button>
            </div>
            <div className="px-4 py-4 flex flex-col gap-3">

              {/* Feature-specific card — shown only when opened from a filter tab */}
              {upsellFeature === "stek" && (
                <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #0e3b20 0%, #0f4d28 100%)", border: "1px solid rgba(34,197,94,0.25)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, background: "rgba(34,197,94,0.15)" }}>
                      <Home size={18} style={{ color: "#22c55e" }} />
                    </div>
                    <div>
                      <span className="font-extrabold text-white text-sm tracking-wide">Štek Parkinzi</span>
                      <p className="text-xs" style={{ color: "#4ade80" }}>Samo za Premium članove</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#d1fae5" }}>
                    Štek mesta su <span className="font-bold text-white">skrivena parkirna mesta</span> koja lokalni vozači dele međusobno — uglavnom besplatna, diskretna, i uvek u blizini centra. Dok drugi kruže u potrazi za mestom, ti direktno parkiraš na proverenom steku.
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>Besplatna mesta</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>Deli zajednica</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>Uvek ažurno</span>
                  </div>
                </div>
              )}

              {upsellFeature === "safe_zone" && (
                <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #1a1a3e 0%, #1e1b4b 100%)", border: "1px solid rgba(99,102,241,0.3)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, background: "rgba(99,102,241,0.2)" }}>
                      <Shield size={18} style={{ color: "#818cf8" }} />
                    </div>
                    <div>
                      <span className="font-extrabold text-white text-sm tracking-wide">Safe Zone Alarm</span>
                      <p className="text-xs" style={{ color: "#a5b4fc" }}>Instant push notifikacija</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#e0e7ff" }}>
                    Postavi svoju Safe Zonu na mapi — čim <span className="font-bold text-white">pauk, radar ili zlatni minut</span> uđe u tvoju zonu, dobijaš instant push notifikaciju na telefon. Više ne moraš da stojiš uz prozor i gledaš u auto.
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>Pauk alarm</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>Radar alarm</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>Zlatni minut alarm</span>
                  </div>
                </div>
              )}

              {upsellFeature === "radar" && (
                <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)", border: "1px solid rgba(139,92,246,0.3)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, background: "rgba(139,92,246,0.2)" }}>
                      <RadioTower size={18} style={{ color: "#a78bfa" }} />
                    </div>
                    <div>
                      <span className="font-extrabold text-white text-sm tracking-wide">Radar Markeri</span>
                      <p className="text-xs" style={{ color: "#c4b5fd" }}>Samo za Premium članove</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#ede9fe" }}>
                    Označi <span className="font-bold text-white">policijski radar i saobraćajnu patrolu</span> na mapi u realnom vremenu. Ostali Premium vozači odmah dobijaju upozorenje pre nego što prođu tim mestom.
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd" }}>Policijski radar</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd" }}>Patrola</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd" }}>Instant alarm</span>
                  </div>
                </div>
              )}

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
                    <p className="text-yellow-900/70 text-xs mt-0.5">Safe Zone, Štek, Radar, Push notifikacije</p>
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

              <p className="text-center text-xs" style={{ color: "#4b5563" }}>Otkaži bilo kada · Bez skrivenih troškova</p>
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
      {/* Android nav bar safe-area fill: position:fixed garantuje fizičko dno ekrana,
          nezavisno od flex layout-a. pointerEvents:none ne blokira klikove.
          height=0 na uređajima bez gesture nav — nema vizualne promjene. */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'env(safe-area-inset-bottom, 0px)',
          background: '#0d1117',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
