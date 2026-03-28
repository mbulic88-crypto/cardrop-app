import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare, X, Send,
  Clock, Lock, ShieldCheck, RefreshCw, Target, Trash2
} from "lucide-react";
import type { MapMarker, MapChatMessage, MapSafeZone } from "@shared/schema";

// ─── Types ──────────────────────────────────────────────────────────────────

type MarkerType = "zlatni_minut" | "pauk" | "stek" | "safe_zone";
type FilterType = "sve" | MarkerType;

interface MapHackMapProps {
  mapNickname: string;
  avatarId: number;
  plan: string | null;
  isAdmin: boolean;
}

// ─── NS Landmarks (hardcoded grey icons) ─────────────────────────────────────

const NS_LANDMARKS = [
  { lat: 45.2517, lng: 19.8484, label: "Petrovaradinska tvrđava" },
  { lat: 45.2531, lng: 19.8440, label: "KCV Bolnica" },
  { lat: 45.2611, lng: 19.8203, label: "Spens" },
  { lat: 45.2600, lng: 19.8347, label: "Železnička stanica" },
  { lat: 45.2673, lng: 19.8334, label: "Centar NS" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function markerColor(type: MarkerType): string {
  switch (type) {
    case "zlatni_minut": return "#f97316";
    case "pauk": return "#ef4444";
    case "stek": return "#22c55e";
    case "safe_zone": return "#3b82f6";
  }
}

function markerEmoji(type: MarkerType): string {
  switch (type) {
    case "zlatni_minut": return "⏱";
    case "pauk": return "🚛";
    case "stek": return "🅿";
    case "safe_zone": return "🛡";
  }
}

function markerLabel(type: MarkerType): string {
  switch (type) {
    case "zlatni_minut": return "Zlatni Minut";
    case "pauk": return "Pauk Radar";
    case "stek": return "Štek";
    case "safe_zone": return "Safe Zone";
  }
}

function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "upravo";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h`;
}

function timeLeft(expiresAt: string | Date | null): string | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "isteklo";
  const mins = Math.ceil(diff / 60000);
  if (mins < 60) return `${mins}min`;
  return `${Math.ceil(mins / 60)}h`;
}

function hasPremiumPlan(plan: string | null, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return ["premium", "day_pass", "godisnji_premium", "firma"].includes(plan || "");
}

// ─── Avatar Component ────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f97316",
  "#22c55e", "#14b8a6", "#3b82f6", "#a16207",
];

function ChatAvatar({ avatarId, size = 24 }: { avatarId: number; size?: number }) {
  const color = AVATAR_COLORS[(avatarId - 1) % AVATAR_COLORS.length];
  return (
    <div
      style={{ width: size, height: size, backgroundColor: color, borderRadius: "50%", flexShrink: 0 }}
      className="flex items-center justify-center text-white font-bold"
    >
      <span style={{ fontSize: size * 0.45 }}>{avatarId}</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MapHackMap({ mapNickname, avatarId, plan, isAdmin }: MapHackMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const safeZoneLayerRef = useRef<any>(null);
  const { toast } = useToast();

  const [filter, setFilter] = useState<FilterType>("sve");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [addMode, setAddMode] = useState<MarkerType | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const isPremium = hasPremiumPlan(plan, isAdmin);

  // ─── Data queries ──────────────────────────────────────────────────────────

  const { data: markers = [], refetch: refetchMarkers } = useQuery<MapMarker[]>({
    queryKey: ["/api/map-hack/markers"],
    refetchInterval: 30000,
  });

  const { data: chatMessages = [], refetch: refetchChat } = useQuery<MapChatMessage[]>({
    queryKey: ["/api/map-hack/chat"],
    refetchInterval: 30000,
  });

  const { data: safeZone } = useQuery<MapSafeZone | null>({
    queryKey: ["/api/map-hack/safe-zone"],
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const addMarkerMutation = useMutation({
    mutationFn: (data: { type: MarkerType; lat: number; lng: number; label?: string }) =>
      apiRequest("POST", "/api/map-hack/markers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-hack/markers"] });
      setAddMode(null);
      toast({ title: "Marker dodat", description: "Marker je dodat na mapu." });
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
      toast({ title: "Safe Zone postavljena", description: "Zona alarma je ažurirana." });
    },
    onError: (err: any) => {
      toast({ title: "Greška", description: err.message, variant: "destructive" });
    },
  });

  const expireMarkerMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/map-hack/markers/${id}/expire`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-hack/markers"] });
      setSelectedMarker(null);
    },
  });

  // ─── Map initialisation ────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    const map = L.map(mapRef.current, {
      center: [45.2671, 19.8335],
      zoom: 14,
      minZoom: 13,
      maxZoom: 17,
      zoomControl: true,
      attributionControl: false,
      maxBounds: L.latLngBounds([45.20, 19.72], [45.36, 19.98]),
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd", maxZoom: 19 }
    ).addTo(map);

    // NS landmarks — subtle grey markers
    NS_LANDMARKS.forEach(({ lat, lng, label }) => {
      const icon = L.divIcon({
        html: `<div style="
          background: rgba(100,100,120,0.7);
          color: #9ca3af;
          font-size: 9px;
          padding: 2px 5px;
          border-radius: 4px;
          white-space: nowrap;
          border: 1px solid rgba(150,150,170,0.3);
          pointer-events: none;
        ">${label}</div>`,
        className: "",
        iconAnchor: [0, 0],
      });
      L.marker([lat, lng], { icon, interactive: false }).addTo(map);
    });

    // Click to add marker
    map.on("click", (e: any) => {
      setAddMode(prev => {
        if (!prev) return null;
        addMarkerMutation.mutate({ type: prev, lat: e.latlng.lat, lng: e.latlng.lng });
        return null;
      });

      // Set safe zone on right-click (we'll handle separately)
    });

    // Right-click to set safe zone
    map.on("contextmenu", (e: any) => {
      e.originalEvent.preventDefault();
      setSafeZoneMutation.mutate({ lat: e.latlng.lat, lng: e.latlng.lng, radiusMeters: 300 });
    });

    markersLayerRef.current = L.layerGroup().addTo(map);
    safeZoneLayerRef.current = L.layerGroup().addTo(map);
    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Update cursor for add mode ────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.style.cursor = addMode ? "crosshair" : "grab";
  }, [addMode]);

  // ─── Render markers on map ─────────────────────────────────────────────────

  useEffect(() => {
    if (!markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const filtered = filter === "sve" ? markers : markers.filter(m => m.type === filter);

    filtered.forEach((marker) => {
      const color = markerColor(marker.type as MarkerType);
      const isLocked = marker.type === "stek" && !isPremium;

      const icon = L.divIcon({
        html: `<div style="
          width: 36px; height: 36px;
          background: ${isLocked ? "#374151" : color};
          border: 2px solid ${isLocked ? "#6b7280" : color};
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          box-shadow: 0 0 8px ${isLocked ? "transparent" : color}80;
          cursor: pointer;
        ">${isLocked ? "🔒" : markerEmoji(marker.type as MarkerType)}</div>`,
        className: "",
        iconAnchor: [18, 18],
      });

      const lm = L.marker([parseFloat(marker.lat), parseFloat(marker.lng)], { icon })
        .addTo(markersLayerRef.current);

      lm.on("click", () => setSelectedMarker(marker));
    });
  }, [markers, filter, isPremium]);

  // ─── Render safe zone circle ───────────────────────────────────────────────

  useEffect(() => {
    if (!safeZoneLayerRef.current) return;

    safeZoneLayerRef.current.clearLayers();

    if (safeZone && safeZone.lat && safeZone.lng) {
      L.circle([parseFloat(safeZone.lat), parseFloat(safeZone.lng)], {
        radius: safeZone.radiusMeters,
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.1,
        weight: 2,
        dashArray: "6 4",
      }).addTo(safeZoneLayerRef.current);
    }
  }, [safeZone]);

  // ─── Chat scroll ───────────────────────────────────────────────────────────

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatOpen]);

  // ─── Filtered marker counts ────────────────────────────────────────────────

  const counts: Record<string, number> = {
    sve: markers.length,
    zlatni_minut: markers.filter(m => m.type === "zlatni_minut").length,
    pauk: markers.filter(m => m.type === "pauk").length,
    stek: markers.filter(m => m.type === "stek").length,
    safe_zone: markers.filter(m => m.type === "safe_zone").length,
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full" style={{ background: "#0d1117" }}>

      {/* Map container */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Add-mode banner */}
      {addMode && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-full text-sm font-medium"
          style={{ background: "#1e2330", border: "1px solid #f97316", color: "#f97316" }}>
          <Target size={16} />
          Tapni na mapu da dodaš <strong>{markerLabel(addMode)}</strong>
          <button onClick={() => setAddMode(null)} className="ml-1 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Filter tabs ──────────────────────────────────────────────────────── */}
      <div className="absolute top-3 left-3 right-3 z-20 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(["sve", "zlatni_minut", "pauk", "stek", "safe_zone"] as FilterType[]).map(f => (
          <button
            key={f}
            data-testid={`filter-tab-${f}`}
            onClick={() => setFilter(f)}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              background: filter === f ? (f === "sve" ? "#6366f1" : markerColor(f as MarkerType)) : "rgba(13,17,23,0.85)",
              color: filter === f ? "#fff" : "#9ca3af",
              border: `1px solid ${filter === f ? "transparent" : "rgba(255,255,255,0.1)"}`,
              backdropFilter: "blur(8px)",
            }}
          >
            {f === "sve" ? "Sve" : markerEmoji(f as MarkerType)}
            {f === "sve" ? ` (${counts.sve})` : ` ${markerLabel(f as MarkerType)} (${counts[f]})`}
            {f === "stek" && !isPremium && <Lock size={9} className="ml-0.5" />}
          </button>
        ))}
      </div>

      {/* ─── Info card for selected marker ────────────────────────────────────── */}
      {selectedMarker && (
        <div className="absolute bottom-32 left-3 right-3 z-30 rounded-xl p-3"
          style={{ background: "#1e2330", border: `1px solid ${markerColor(selectedMarker.type as MarkerType)}40` }}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{markerEmoji(selectedMarker.type as MarkerType)}</span>
              <div>
                <div className="font-semibold text-sm" style={{ color: markerColor(selectedMarker.type as MarkerType) }}>
                  {markerLabel(selectedMarker.type as MarkerType)}
                </div>
                {selectedMarker.label && (
                  <div className="text-xs text-gray-400">{selectedMarker.label}</div>
                )}
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                  <Clock size={10} />
                  {timeAgo(selectedMarker.createdAt)}
                  {selectedMarker.expiresAt && (
                    <span className="text-orange-400">· ističe za {timeLeft(selectedMarker.expiresAt)}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              {(isAdmin || selectedMarker.userId === undefined) && (
                <Button size="icon" variant="ghost" data-testid="btn-expire-marker"
                  onClick={() => expireMarkerMutation.mutate(selectedMarker.id)}
                  className="h-7 w-7 text-red-400">
                  <Trash2 size={13} />
                </Button>
              )}
              <Button size="icon" variant="ghost" data-testid="btn-close-marker-info"
                onClick={() => setSelectedMarker(null)}
                className="h-7 w-7 text-gray-400">
                <X size={13} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Chat panel ───────────────────────────────────────────────────────── */}
      {chatOpen && (
        <div className="absolute bottom-20 right-3 z-30 w-72 rounded-xl flex flex-col"
          style={{ background: "#1e2330", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "50vh" }}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-sm font-semibold text-white">Park Chat</span>
            <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ minHeight: 120 }}>
            {chatMessages.length === 0 && (
              <div className="text-xs text-gray-500 text-center py-4">Nema poruka. Budi prvi!</div>
            )}
            {chatMessages.map(msg => (
              <div key={msg.id} className="flex items-start gap-2">
                <ChatAvatar avatarId={msg.avatarId} size={22} />
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-gray-300">{msg.mapNickname}</span>
                    <span className="text-xs text-gray-600">{timeAgo(msg.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-200 break-words">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex items-center gap-1.5 p-2 border-t border-white/10">
            <Input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && chatInput.trim()) sendChatMutation.mutate(chatInput); }}
              placeholder="Napiši poruku..."
              data-testid="input-chat-message"
              className="h-8 text-xs"
              style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", color: "#e5e7eb" }}
              maxLength={280}
            />
            <Button size="icon" data-testid="btn-send-chat"
              onClick={() => { if (chatInput.trim()) sendChatMutation.mutate(chatInput); }}
              disabled={sendChatMutation.isPending || !chatInput.trim()}
              className="h-8 w-8 shrink-0"
              style={{ background: "#f97316" }}>
              <Send size={12} />
            </Button>
          </div>
        </div>
      )}

      {/* ─── Bottom action bar ─────────────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-3 right-3 z-20 flex items-center justify-between gap-2">

        {/* Add marker buttons */}
        <div className="flex gap-1.5">
          {(["zlatni_minut", "pauk", "stek", "safe_zone"] as MarkerType[]).map(type => {
            const locked = type === "stek" && !isPremium;
            return (
              <button
                key={type}
                data-testid={`btn-add-${type}`}
                onClick={() => {
                  if (locked) {
                    toast({ title: "Premium plan potreban", description: "Štek lokacije su dostupne Premium korisnicima." });
                    return;
                  }
                  setAddMode(prev => prev === type ? null : type);
                }}
                title={markerLabel(type)}
                className="flex items-center justify-center rounded-full transition-all"
                style={{
                  width: 42, height: 42,
                  background: addMode === type ? markerColor(type) : "rgba(13,17,23,0.85)",
                  border: `1px solid ${locked ? "#374151" : markerColor(type)}`,
                  color: locked ? "#6b7280" : markerColor(type),
                  backdropFilter: "blur(8px)",
                  fontSize: 18,
                  opacity: locked ? 0.6 : 1,
                }}
              >
                {locked ? <Lock size={14} /> : markerEmoji(type)}
              </button>
            );
          })}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5">
          {/* Refresh */}
          <button
            data-testid="btn-refresh-map"
            onClick={() => { refetchMarkers(); refetchChat(); }}
            className="flex items-center justify-center rounded-full"
            style={{
              width: 38, height: 38,
              background: "rgba(13,17,23,0.85)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#9ca3af",
              backdropFilter: "blur(8px)",
            }}
          >
            <RefreshCw size={15} />
          </button>

          {/* Safe zone indicator */}
          {safeZone && (
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs"
              style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)", color: "#93c5fd" }}>
              <ShieldCheck size={12} />
              Safe Zone
            </div>
          )}

          {/* Chat toggle */}
          <button
            data-testid="btn-toggle-chat"
            onClick={() => setChatOpen(p => !p)}
            className="relative flex items-center justify-center rounded-full"
            style={{
              width: 42, height: 42,
              background: chatOpen ? "#f97316" : "rgba(13,17,23,0.85)",
              border: `1px solid ${chatOpen ? "#f97316" : "rgba(255,255,255,0.15)"}`,
              color: chatOpen ? "#fff" : "#9ca3af",
              backdropFilter: "blur(8px)",
            }}
          >
            <MessageSquare size={17} />
            {chatMessages.length > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white text-xs font-bold"
                style={{ width: 16, height: 16, background: "#ef4444", fontSize: 9 }}>
                {chatMessages.length > 9 ? "9+" : chatMessages.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── Legend ──────────────────────────────────────────────────────────────── */}
      <div className="absolute top-14 left-3 z-20 hidden sm:flex flex-col gap-0.5 p-2 rounded-lg"
        style={{ background: "rgba(13,17,23,0.75)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
        {(["zlatni_minut", "pauk", "stek", "safe_zone"] as MarkerType[]).map(type => (
          <div key={type} className="flex items-center gap-1.5 text-xs" style={{ color: "#9ca3af" }}>
            <span style={{ color: markerColor(type) }}>{markerEmoji(type)}</span>
            <span>{markerLabel(type)}</span>
          </div>
        ))}
        <div className="mt-1 pt-1 border-t border-white/10 text-xs text-gray-600">
          Desni klik → Safe Zone
        </div>
      </div>

      {/* Right-click hint on mobile */}
      <div className="absolute bottom-20 left-3 z-20 sm:hidden text-xs text-gray-600"
        style={{ pointerEvents: "none" }}>
        Dugo drži → Safe Zone
      </div>
    </div>
  );
}
