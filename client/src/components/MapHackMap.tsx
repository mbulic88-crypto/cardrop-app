import { useEffect, useRef, useCallback, useState } from "react";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  GeolocateControl,
  Source,
  Layer,
} from "react-map-gl";
import type { MapRef, MapLayerMouseEvent, ViewStateChangeEvent } from "react-map-gl";
import type { MapboxEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { MapMarker, MapSafeZone, MapWatchArea } from "@shared/schema";

export type MarkerType = "zlatni_minut" | "pauk" | "stek" | "safe_zone" | "radar";

export interface ChatPreviewMsg {
  text: string;
  mapAvatarId: number | null;
}

export interface ParkingListing {
  id: string;
  title: string;
  address: string;
  latitude: string;
  longitude: string;
  pricePerHour: string;
  pricingType: string;
  description?: string | null;
  phone?: string | null;
  contactEmail?: string | null;
  spotType?: string | null;
  is24Hours?: boolean | null;
  hasEvCharging?: boolean | null;
  hasSecurityCamera?: boolean | null;
}

export interface MapHackMapProps {
  markers: MapMarker[];
  activeFilters: string[];
  safeZone: MapSafeZone | null;
  watchArea?: MapWatchArea | null;
  isPremium: boolean;
  isAddMode: boolean;
  onMarkerClick: (marker: MapMarker) => void;
  onMapClick: (lat: number, lng: number) => void;
  onContextMenu: (lat: number, lng: number) => void;
  onCenterChange?: (lat: number, lng: number) => void;
  chatPreviewMsg?: ChatPreviewMsg | null;
  onChatClick?: () => void;
  parkingListings?: ParkingListing[];
  flyToLocation?: { lat: number; lng: number } | null;
  onParkingClick?: (listing: ParkingListing) => void;
  sizeKey?: boolean | number;
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

function markerSvgHtml(type: MarkerType | string, locked: boolean): string {
  let path = "";
  if (locked) {
    path = `<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>`;
  } else if (type === "zlatni_minut") {
    path = `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`;
  } else if (type === "pauk") {
    path = `<circle cx="12" cy="10" r="3"/><circle cx="12" cy="16" r="4"/><line x1="12" y1="7" x2="8" y2="3"/><line x1="12" y1="7" x2="16" y2="3"/><line x1="9" y1="9" x2="4" y2="7"/><line x1="15" y1="9" x2="20" y2="7"/><line x1="8" y1="14" x2="3" y2="13"/><line x1="16" y1="14" x2="21" y2="13"/><line x1="8" y1="18" x2="3" y2="21"/><line x1="16" y1="18" x2="21" y2="21"/>`;
  } else if (type === "stek") {
    path = `<path d="M3 9.5 L12 2 L21 9.5 V20 A1 1 0 0 1 20 21 H15 V15 H9 V21 H4 A1 1 0 0 1 3 20 Z"/>`;
  } else if (type === "safe_zone") {
    path = `<path d="M12 2 L20 6 V12 C20 16.5 16.5 20 12 22 C7.5 20 4 16.5 4 12 V6 Z"/>`;
  } else if (type === "radar") {
    path = `<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="10" x2="12" y2="3"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>`;
  } else {
    path = `<circle cx="12" cy="12" r="10"/>`;
  }
  const stroke = locked ? "#6b7280" : "#ffffff";
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

export function markerColor(type: MarkerType | string): string {
  if (type === "zlatni_minut") return "#f97316";
  if (type === "pauk") return "#ef4444";
  if (type === "stek") return "#22c55e";
  if (type === "safe_zone") return "#3b82f6";
  if (type === "radar") return "#8b5cf6";
  if (type === "parking") return "#3b82f6";
  return "#6b7280";
}

export function markerEmoji(type: MarkerType | string): string {
  if (type === "zlatni_minut") return "⏱";
  if (type === "pauk") return "🕷️";
  if (type === "stek") return "🏠";
  if (type === "safe_zone") return "🛡";
  if (type === "radar") return "📡";
  return "📍";
}

export function markerLabel(type: MarkerType | string): string {
  if (type === "zlatni_minut") return "Zlatni Minut";
  if (type === "pauk") return "Pauk Radar";
  if (type === "stek") return "Štek Lokacija";
  if (type === "safe_zone") return "Safe Zone Alarm";
  if (type === "radar") return "Radar";
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

function createCircleGeoJSON(lat: number, lng: number, radiusMeters: number, points = 64) {
  const coords: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = (radiusMeters * Math.cos(angle)) / (111320 * Math.cos((lat * Math.PI) / 180));
    const dy = (radiusMeters * Math.sin(angle)) / 110540;
    coords.push([lng + dx, lat + dy]);
  }
  coords.push(coords[0]);
  return {
    type: "Feature" as const,
    geometry: { type: "Polygon" as const, coordinates: [coords] },
    properties: {},
  };
}

interface ParkingPopupState {
  spot: ParkingListing;
  lat: number;
  lng: number;
}

export function MapHackMap({
  markers,
  activeFilters,
  safeZone,
  watchArea,
  isPremium,
  isAddMode,
  onMarkerClick,
  onMapClick,
  onContextMenu,
  onCenterChange,
  chatPreviewMsg,
  onChatClick,
  parkingListings,
  flyToLocation,
  onParkingClick,
  sizeKey,
}: MapHackMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [parkingPopup, setParkingPopup] = useState<ParkingPopupState | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const onMapClickRef = useRef(onMapClick);
  const onContextMenuRef = useRef(onContextMenu);
  const onCenterChangeRef = useRef(onCenterChange);
  onMapClickRef.current = onMapClick;
  onContextMenuRef.current = onContextMenu;
  onCenterChangeRef.current = onCenterChange;

  useEffect(() => {
    if (!flyToLocation || !mapLoaded || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [flyToLocation.lng, flyToLocation.lat],
      zoom: 16,
      duration: 1000,
    });
  }, [flyToLocation, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const t = setTimeout(() => {
      mapRef.current?.resize();
    }, 50);
    return () => clearTimeout(t);
  }, [sizeKey, mapLoaded]);

  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    setParkingPopup(null);
    onMapClickRef.current(e.lngLat.lat, e.lngLat.lng);
  }, []);

  const handleContextMenu = useCallback((e: MapLayerMouseEvent) => {
    e.preventDefault();
    onContextMenuRef.current(e.lngLat.lat, e.lngLat.lng);
  }, []);

  const handleMoveEnd = useCallback((e: ViewStateChangeEvent) => {
    onCenterChangeRef.current?.(e.viewState.latitude, e.viewState.longitude);
  }, []);

  const handleMapLoad = useCallback((e: MapboxEvent) => {
    e.target.setConfigProperty("basemap", "lightPreset", "night");
    setMapLoaded(true);
  }, []);

  const filtered = activeFilters.includes("sve")
    ? markers
    : markers.filter((m) => activeFilters.includes(m.type));

  const showHeatmap = activeFilters.includes("sve") || activeFilters.includes("pauk");
  const paukMarkers = markers.filter((m) => m.type === "pauk");

  const safeZoneGeoJSON =
    safeZone?.lat && safeZone?.lng
      ? createCircleGeoJSON(parseFloat(safeZone.lat), parseFloat(safeZone.lng), safeZone.radiusMeters)
      : null;

  const watchAreaGeoJSON =
    watchArea?.lat && watchArea?.lng
      ? createCircleGeoJSON(parseFloat(watchArea.lat), parseFloat(watchArea.lng), watchArea.radiusMeters)
      : null;

  const avatarIdx = (chatPreviewMsg?.mapAvatarId ?? 1) % AVATAR_COLORS.length;
  const previewText = chatPreviewMsg
    ? chatPreviewMsg.text.slice(0, 28) + (chatPreviewMsg.text.length > 28 ? "..." : "")
    : null;

  return (
    <div className="absolute inset-0" style={{ cursor: isAddMode ? "crosshair" : undefined }}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 19.8335,
          latitude: 45.2671,
          zoom: 14,
        }}
        minZoom={11}
        maxZoom={18}
        maxBounds={[
          [19.50, 45.05],
          [20.20, 45.55],
        ]}
        mapStyle="mapbox://styles/mapbox/standard"
        mapboxAccessToken={MAPBOX_TOKEN}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMoveEnd={handleMoveEnd}
        onLoad={handleMapLoad}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <GeolocateControl
          position="bottom-right"
          trackUserLocation={true}
          showUserHeading={true}
          showAccuracyCircle={true}
        />

        {/* Compass / reset button */}
        <div
          style={{
            position: "absolute",
            bottom: 62,
            right: 12,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(15,20,35,0.88)",
            border: "2px solid rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
            zIndex: 10,
          }}
          title="Resetuj pogled"
          onClick={(e) => {
            e.stopPropagation();
            mapRef.current?.flyTo({ center: [19.8335, 45.2671], zoom: 14, duration: 800 });
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
            <polygon points="12,3 14.5,12 12,10 9.5,12" fill="#ef4444" />
            <polygon points="12,21 9.5,12 12,14 14.5,12" fill="rgba(255,255,255,0.6)" />
            <circle cx="12" cy="12" r="2" fill="white" />
          </svg>
        </div>

        {/* Pauk heatmap outer circles */}
        {showHeatmap && paukMarkers.map((m) => (
          <Source
            key={`h-outer-${m.id}`}
            id={`h-outer-${m.id}`}
            type="geojson"
            data={createCircleGeoJSON(parseFloat(m.lat), parseFloat(m.lng), 180)}
          >
            <Layer
              id={`h-outer-fill-${m.id}`}
              type="fill"
              paint={{ "fill-color": "#ef4444", "fill-opacity": 0.18 }}
            />
          </Source>
        ))}

        {/* Pauk heatmap inner circles */}
        {showHeatmap && paukMarkers.map((m) => (
          <Source
            key={`h-inner-${m.id}`}
            id={`h-inner-${m.id}`}
            type="geojson"
            data={createCircleGeoJSON(parseFloat(m.lat), parseFloat(m.lng), 80)}
          >
            <Layer
              id={`h-inner-fill-${m.id}`}
              type="fill"
              paint={{ "fill-color": "#ff6b35", "fill-opacity": 0.35 }}
            />
          </Source>
        ))}

        {/* Safe zone */}
        {safeZoneGeoJSON && (
          <Source id="safe-zone" type="geojson" data={safeZoneGeoJSON}>
            <Layer
              id="safe-zone-fill"
              type="fill"
              paint={{ "fill-color": "#f97316", "fill-opacity": 0.45 }}
            />
            <Layer
              id="safe-zone-glow"
              type="line"
              paint={{
                "line-color": "#f97316",
                "line-width": 14,
                "line-opacity": 0.45,
                "line-blur": 8,
              }}
            />
            <Layer
              id="safe-zone-line-solid"
              type="line"
              paint={{
                "line-color": "#ea580c",
                "line-width": 3,
                "line-opacity": 0.55,
              }}
            />
            <Layer
              id="safe-zone-line"
              type="line"
              paint={{
                "line-color": "#f97316",
                "line-width": 2,
                "line-opacity": 0.90,
                "line-dasharray": [5, 4],
              }}
            />
          </Source>
        )}

        {/* Watch area */}
        {watchAreaGeoJSON && (
          <Source id="watch-area" type="geojson" data={watchAreaGeoJSON}>
            <Layer
              id="watch-area-fill"
              type="fill"
              paint={{ "fill-color": "#fbbf24", "fill-opacity": 0.08 }}
            />
            <Layer
              id="watch-area-line"
              type="line"
              paint={{
                "line-color": "#fbbf24",
                "line-width": 2,
                "line-opacity": 0.85,
                "line-dasharray": [5, 5],
              }}
            />
          </Source>
        )}

        {/* Watch area center pulse dot */}
        {watchArea?.lat && watchArea?.lng && (
          <Marker
            latitude={parseFloat(watchArea.lat)}
            longitude={parseFloat(watchArea.lng)}
            anchor="center"
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "rgba(34,197,94,0.3)",
                border: "2px solid rgba(34,197,94,0.8)",
                boxShadow: "0 0 0 4px rgba(34,197,94,0.15)",
                animation: "watchPulse 1.8s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
          </Marker>
        )}

        {/* Map markers */}
        {filtered.map((marker) => {
          const color = markerColor(marker.type);
          const isLocked = marker.type === "stek" && !isPremium;
          const bgColor = isLocked ? "rgba(30,35,50,0.85)" : hexToRgba(color, 0.28);
          const borderColor = isLocked ? "rgba(107,114,128,0.5)" : hexToRgba(color, 0.7);
          return (
            <Marker
              key={marker.id}
              latitude={parseFloat(marker.lat)}
              longitude={parseFloat(marker.lng)}
              anchor="center"
            >
              <div
                onClick={(e) => { e.stopPropagation(); onMarkerClick(marker); }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: bgColor,
                  border: `1.5px solid ${borderColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 2px 10px ${isLocked ? "rgba(0,0,0,0.35)" : hexToRgba(color, 0.35)}`,
                  cursor: "pointer",
                }}
                dangerouslySetInnerHTML={{ __html: markerSvgHtml(marker.type, isLocked) }}
              />
            </Marker>
          );
        })}

        {/* Parking markers — shown when "sve" or "parking" filter is active */}
        {(activeFilters.includes("sve") || activeFilters.includes("parking")) && (parkingListings ?? []).map((spot) => {
          const lat = parseFloat(spot.latitude);
          const lng = parseFloat(spot.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;
          const price = parseFloat(spot.pricePerHour).toFixed(0);
          const unit = spot.pricingType === "hourly" ? "/h"
            : spot.pricingType === "daily" ? "/dan"
            : spot.pricingType === "monthly" ? "/mes"
            : "/dan";
          return (
            <Marker
              key={`parking-${spot.id}`}
              latitude={lat}
              longitude={lng}
              anchor="center"
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (onParkingClick) {
                    onParkingClick(spot);
                  } else {
                    setParkingPopup(prev =>
                      prev?.spot.id === spot.id ? null : { spot, lat, lng }
                    );
                  }
                }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "rgba(59,130,246,0.22)",
                  border: "2px solid rgba(59,130,246,0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(59,130,246,0.3)",
                  cursor: "pointer",
                  fontWeight: 700,
                  color: "#93c5fd",
                  fontSize: 13,
                  fontFamily: "system-ui,sans-serif",
                }}
              >
                P
              </div>
            </Marker>
          );
        })}

        {/* Parking fallback popup (shown when onParkingClick is not provided) */}
        {parkingPopup && !onParkingClick && (
          <Popup
            latitude={parkingPopup.lat}
            longitude={parkingPopup.lng}
            anchor="bottom"
            onClose={() => setParkingPopup(null)}
            closeButton={false}
            closeOnClick={false}
          >
            <div style={{ fontSize: 12, minWidth: 150, maxWidth: 200, padding: "2px 0" }}>
              <div style={{ fontWeight: 600, marginBottom: 2, color: "#111" }}>{parkingPopup.spot.title}</div>
              {parkingPopup.spot.address && (
                <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 4 }}>{parkingPopup.spot.address}</div>
              )}
              <div style={{ fontWeight: 700, color: "#2563eb" }}>
                {parseFloat(parkingPopup.spot.pricePerHour).toFixed(0)} RSD
                {parkingPopup.spot.pricingType === "hourly" ? "/h"
                  : parkingPopup.spot.pricingType === "daily" ? "/dan"
                  : parkingPopup.spot.pricingType === "monthly" ? "/mes"
                  : "/dan"}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Chat preview pill */}
      {chatPreviewMsg && (
        <button
          data-testid="btn-chat-preview-pill"
          onClick={onChatClick}
          className="absolute bottom-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(15,20,35,0.88)", border: "1px solid rgba(255,255,255,0.14)", maxWidth: "70%" }}
        >
          <div
            className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
            style={{ background: AVATAR_COLORS[avatarIdx] }}
          >
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
