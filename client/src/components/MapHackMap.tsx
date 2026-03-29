import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapMarker, MapSafeZone } from "@shared/schema";

export type MarkerType = "zlatni_minut" | "pauk" | "stek" | "safe_zone";

export interface ChatPreviewMsg {
  text: string;
  mapAvatarId: number | null;
}

export interface MapHackMapProps {
  markers: MapMarker[];
  activeFilters: string[];
  safeZone: MapSafeZone | null;
  isPremium: boolean;
  isAddMode: boolean;
  onMarkerClick: (marker: MapMarker) => void;
  onMapClick: (lat: number, lng: number) => void;
  onContextMenu: (lat: number, lng: number) => void;
  chatPreviewMsg?: ChatPreviewMsg | null;
  onChatClick?: () => void;
}

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN as string) || "";
if (!MAPBOX_TOKEN) console.warn("[MapHackMap] VITE_MAPBOX_TOKEN nije postavljen — mapa neće učitati tiles.");

const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f97316","#22c55e","#14b8a6","#3b82f6","#a16207"];

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function markerSvgPath(type: MarkerType | string, locked: boolean): string {
  if (locked) {
    return `<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>`;
  }
  if (type === "zlatni_minut") {
    return `<path d="M3 9l2-5h14l2 5v6H3V9z"/><circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/>`;
  }
  if (type === "pauk") {
    return `<rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>`;
  }
  if (type === "stek") {
    return `<path d="M3 9.5 L12 2 L21 9.5 V20 A1 1 0 0 1 20 21 H15 V15 H9 V21 H4 A1 1 0 0 1 3 20 Z"/>`;
  }
  if (type === "safe_zone") {
    return `<path d="M12 2 L20 6 V12 C20 16.5 16.5 20 12 22 C7.5 20 4 16.5 4 12 V6 Z"/>`;
  }
  return `<circle cx="12" cy="12" r="10"/>`;
}

export function markerColor(type: MarkerType | string): string {
  if (type === "zlatni_minut") return "#f97316";
  if (type === "pauk") return "#ef4444";
  if (type === "stek") return "#22c55e";
  if (type === "safe_zone") return "#3b82f6";
  return "#6b7280";
}

export function markerEmoji(type: MarkerType | string): string {
  if (type === "zlatni_minut") return "⏱";
  if (type === "pauk") return "🚛";
  if (type === "stek") return "🏠";
  if (type === "safe_zone") return "🛡";
  return "📍";
}

export function markerLabel(type: MarkerType | string): string {
  if (type === "zlatni_minut") return "Zlatni Minut";
  if (type === "pauk") return "Pauk Radar";
  if (type === "stek") return "Štek Lokacija";
  if (type === "safe_zone") return "Safe Zone Alarm";
  return type;
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function MapHackMap({
  markers,
  activeFilters,
  safeZone,
  isPremium,
  isAddMode,
  onMarkerClick,
  onMapClick,
  onContextMenu,
  chatPreviewMsg,
  onChatClick,
}: MapHackMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const safeZoneLayerRef = useRef<L.LayerGroup | null>(null);

  const onMapClickRef = useRef(onMapClick);
  const onContextMenuRef = useRef(onContextMenu);
  onMapClickRef.current = onMapClick;
  onContextMenuRef.current = onContextMenu;

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    const map = L.map(mapRef.current, {
      center: [45.2671, 19.8335],
      zoom: 14,
      minZoom: 13,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      maxBounds: L.latLngBounds([45.20, 19.72], [45.36, 19.98]),
    });

    L.tileLayer(
      `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
      { maxZoom: 19, tileSize: 256, attribution: "© Mapbox © OpenStreetMap" }
    ).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    const CompassControl = L.Control.extend({
      onAdd() {
        const div = L.DomUtil.create("div");
        div.style.cssText =
          "width:44px;height:44px;border-radius:50%;" +
          "background:rgba(15,20,35,0.88);border:2px solid rgba(255,255,255,0.18);" +
          "display:flex;align-items:center;justify-content:center;" +
          "cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.5);";
        div.title = "Resetuj pogled";
        div.innerHTML =
          `<svg width="22" height="22" viewBox="0 0 24 24" fill="none">` +
          `<circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>` +
          `<polygon points="12,3 14.5,12 12,10 9.5,12" fill="#ef4444"/>` +
          `<polygon points="12,21 9.5,12 12,14 14.5,12" fill="rgba(255,255,255,0.6)"/>` +
          `<circle cx="12" cy="12" r="2" fill="white"/>` +
          `</svg>`;
        L.DomEvent.on(div, "click", () => map.setView([45.2671, 19.8335], 14));
        return div;
      },
    });
    new CompassControl({ position: "bottomright" }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => onMapClickRef.current(e.latlng.lat, e.latlng.lng));
    map.on("contextmenu", (e: L.LeafletMouseEvent) => onContextMenuRef.current(e.latlng.lat, e.latlng.lng));

    markersLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);
    safeZoneLayerRef.current = L.layerGroup().addTo(map);
    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const container = leafletMapRef.current?.getContainer();
    if (container) container.style.cursor = isAddMode ? "crosshair" : "grab";
  }, [isAddMode]);

  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    const filtered =
      activeFilters.includes("sve")
        ? markers
        : markers.filter((m) => activeFilters.includes(m.type));

    filtered.forEach((marker) => {
      const color = markerColor(marker.type);
      const isLocked = marker.type === "stek" && !isPremium;
      const iconColor = isLocked ? "#6b7280" : "#ffffff";
      const bgColor = isLocked ? "rgba(30,35,50,0.85)" : hexToRgba(color, 0.28);
      const borderColor = isLocked ? "rgba(107,114,128,0.5)" : hexToRgba(color, 0.7);
      const svgPath = markerSvgPath(marker.type, isLocked);
      const icon = L.divIcon({
        html:
          `<div style="` +
          `width:34px;height:34px;border-radius:50%;` +
          `background:${bgColor};` +
          `border:1.5px solid ${borderColor};` +
          `display:flex;align-items:center;justify-content:center;` +
          `box-shadow:0 2px 10px ${isLocked ? "rgba(0,0,0,0.35)" : hexToRgba(color, 0.35)};` +
          `cursor:pointer;">` +
          `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
          svgPath +
          `</svg>` +
          `</div>`,
        className: "",
        iconAnchor: [17, 17],
      });
      const lm = L.marker([parseFloat(marker.lat), parseFloat(marker.lng)], { icon }).addTo(
        markersLayerRef.current!
      );
      lm.on("click", () => onMarkerClick(marker));
    });
  }, [markers, activeFilters, isPremium, onMarkerClick]);

  useEffect(() => {
    if (!heatmapLayerRef.current) return;
    heatmapLayerRef.current.clearLayers();
    const showHeatmap = activeFilters.includes("sve") || activeFilters.includes("pauk");
    if (!showHeatmap) return;
    markers
      .filter((m) => m.type === "pauk")
      .forEach((m) => {
        L.circle([parseFloat(m.lat), parseFloat(m.lng)], {
          radius: 180,
          color: "#ef4444",
          fillColor: "#ef4444",
          fillOpacity: 0.18,
          weight: 0,
          interactive: false,
        }).addTo(heatmapLayerRef.current!);
        L.circle([parseFloat(m.lat), parseFloat(m.lng)], {
          radius: 80,
          color: "#ef4444",
          fillColor: "#ff6b35",
          fillOpacity: 0.35,
          weight: 0,
          interactive: false,
        }).addTo(heatmapLayerRef.current!);
      });
  }, [markers, activeFilters]);

  useEffect(() => {
    if (!safeZoneLayerRef.current) return;
    safeZoneLayerRef.current.clearLayers();
    if (safeZone?.lat && safeZone?.lng) {
      L.circle([parseFloat(safeZone.lat), parseFloat(safeZone.lng)], {
        radius: safeZone.radiusMeters,
        color: "#22c55e",
        fillColor: "#22c55e",
        fillOpacity: 0.08,
        weight: 2,
        dashArray: "6 4",
        interactive: false,
      }).addTo(safeZoneLayerRef.current);
    }
  }, [safeZone]);

  const avatarIdx = (chatPreviewMsg?.mapAvatarId ?? 1) % AVATAR_COLORS.length;
  const previewText = chatPreviewMsg
    ? chatPreviewMsg.text.slice(0, 28) + (chatPreviewMsg.text.length > 28 ? "..." : "")
    : null;

  return (
    <div className="absolute inset-0">
      <div ref={mapRef} className="absolute inset-0" />
      {chatPreviewMsg && (
        <button
          data-testid="btn-chat-preview-pill"
          onClick={onChatClick}
          className="absolute bottom-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(15,20,35,0.88)", border: "1px solid rgba(255,255,255,0.14)", maxWidth: "70%" }}>
          <div
            className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
            style={{ background: AVATAR_COLORS[avatarIdx] }}>
            <img
              src={`/avatars/avatar-${chatPreviewMsg.mapAvatarId ?? 1}.png`}
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xs text-gray-300 truncate">{previewText}</span>
        </button>
      )}
    </div>
  );
}
