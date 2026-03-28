import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapMarker, MapSafeZone } from "@shared/schema";

export type MarkerType = "zlatni_minut" | "pauk" | "stek" | "safe_zone";

export interface MapHackMapProps {
  markers: MapMarker[];
  activeFilters: string[];
  safeZone: MapSafeZone | null;
  isPremium: boolean;
  isAddMode: boolean;
  onMarkerClick: (marker: MapMarker) => void;
  onMapClick: (lat: number, lng: number) => void;
  onContextMenu: (lat: number, lng: number) => void;
}

const NS_LANDMARKS = [
  { lat: 45.2517, lng: 19.8484, label: "Petrovaradinska tvrđava" },
  { lat: 45.2531, lng: 19.8440, label: "KCV Bolnica" },
  { lat: 45.2611, lng: 19.8203, label: "Spens" },
  { lat: 45.2600, lng: 19.8347, label: "Železnička st." },
];

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
  if (type === "stek") return "🅿";
  if (type === "safe_zone") return "🛡";
  return "📍";
}

export function markerLabel(type: MarkerType | string): string {
  if (type === "zlatni_minut") return "Zlatni Minut";
  if (type === "pauk") return "Pauk Radar";
  if (type === "stek") return "Štek";
  if (type === "safe_zone") return "Safe Zone";
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
      maxZoom: 17,
      zoomControl: false,
      attributionControl: false,
      maxBounds: L.latLngBounds([45.20, 19.72], [45.36, 19.98]),
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    const ResetControl = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create("button", "leaflet-bar leaflet-control");
        btn.title = "Resetuj pogled";
        btn.style.cssText =
          "background:rgba(13,17,23,0.9);color:#9ca3af;border:1px solid rgba(255,255,255,0.12);" +
          "width:30px;height:30px;cursor:pointer;font-size:14px;display:flex;" +
          "align-items:center;justify-content:center;border-radius:4px;margin-top:4px;";
        btn.textContent = "⊕";
        L.DomEvent.on(btn, "click", () => map.setView([45.2671, 19.8335], 14));
        return btn;
      },
    });
    new ResetControl({ position: "topright" }).addTo(map);

    NS_LANDMARKS.forEach(({ lat, lng, label }) => {
      const icon = L.divIcon({
        html: `<div style="background:rgba(60,65,80,0.65);color:#9ca3af;font-size:9px;` +
          `padding:1px 5px;border-radius:3px;white-space:nowrap;` +
          `border:1px solid rgba(150,150,170,0.2);pointer-events:none;">${label}</div>`,
        className: "",
        iconAnchor: [0, 0],
      });
      L.marker([lat, lng], { icon, interactive: false }).addTo(map);
    });

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
      const icon = L.divIcon({
        html:
          `<div style="width:36px;height:36px;background:${isLocked ? "rgba(55,65,81,0.9)" : color + "cc"};` +
          `border:2px solid ${isLocked ? "#4b5563" : color};border-radius:50%;` +
          `display:flex;align-items:center;justify-content:center;font-size:16px;` +
          `box-shadow:0 0 10px ${isLocked ? "transparent" : color + "60"};cursor:pointer;">` +
          `${isLocked ? "🔒" : markerEmoji(marker.type)}</div>`,
        className: "",
        iconAnchor: [18, 18],
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
          radius: 150,
          color: "#ef4444",
          fillColor: "#ef4444",
          fillOpacity: 0.12,
          weight: 1,
          opacity: 0.4,
          dashArray: "4 4",
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
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.08,
        weight: 2,
        dashArray: "6 4",
        interactive: false,
      }).addTo(safeZoneLayerRef.current);
    }
  }, [safeZone]);

  return <div ref={mapRef} className="absolute inset-0" style={{ background: "#0d1117" }} />;
}
