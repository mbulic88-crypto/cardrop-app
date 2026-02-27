import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface DraggableLocationMapProps {
  latitude: number;
  longitude: number;
  onPositionChange: (lat: number, lng: number) => void;
  height?: string;
  hint?: string;
}

export function DraggableLocationMap({
  latitude,
  longitude,
  onPositionChange,
  height = "220px",
  hint,
}: DraggableLocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([latitude, longitude], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onPositionChange(pos.lat, pos.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const newLatLng = L.latLng(latitude, longitude);
    markerRef.current.setLatLng(newLatLng);
    mapRef.current.setView(newLatLng, mapRef.current.getZoom());
  }, [latitude, longitude]);

  return (
    <div>
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full rounded-md overflow-hidden border border-border"
        data-testid="map-draggable-location"
      />
      {hint && (
        <p className="text-xs text-muted-foreground mt-1 text-center">{hint}</p>
      )}
    </div>
  );
}
