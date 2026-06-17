import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Loader2 } from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const token = (import.meta.env as any).VITE_MAPBOX_TOKEN as string;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=sr&country=rs&types=address,place&limit=1`
    );
    const data = await res.json();
    return data.features?.[0]?.place_name || null;
  } catch {
    return null;
  }
}

interface DraggableLocationMapProps {
  latitude: number;
  longitude: number;
  onPositionChange: (lat: number, lng: number) => void;
  onAddressResolve?: (address: string) => void;
  height?: string;
  hint?: string;
  hasPinPlaced?: boolean;
}

export function DraggableLocationMap({
  latitude,
  longitude,
  onPositionChange,
  onAddressResolve,
  height = "220px",
  hint,
  hasPinPlaced = true,
}: DraggableLocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pinActive, setPinActive] = useState(hasPinPlaced);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Keep latest callbacks in refs so Leaflet handlers don't go stale
  const onPositionChangeRef = useRef(onPositionChange);
  const onAddressResolveRef = useRef(onAddressResolve);
  useEffect(() => { onPositionChangeRef.current = onPositionChange; }, [onPositionChange]);
  useEffect(() => { onAddressResolveRef.current = onAddressResolve; }, [onAddressResolve]);

  const placeMarker = (map: L.Map, lat: number, lng: number) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on("dragend", async () => {
        const pos = marker.getLatLng();
        onPositionChangeRef.current(pos.lat, pos.lng);
        if (onAddressResolveRef.current) {
          setIsGeocoding(true);
          const address = await reverseGeocode(pos.lat, pos.lng);
          setIsGeocoding(false);
          if (address) onAddressResolveRef.current(address);
        }
      });
      markerRef.current = marker;
    }
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([latitude, longitude], 13);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }
    ).addTo(map);

    if (hasPinPlaced) {
      placeMarker(map, latitude, longitude);
    }

    map.on("click", async (e) => {
      const { lat, lng } = e.latlng;
      placeMarker(map, lat, lng);
      setPinActive(true);
      onPositionChangeRef.current(lat, lng);
      if (onAddressResolveRef.current) {
        setIsGeocoding(true);
        const address = await reverseGeocode(lat, lng);
        setIsGeocoding(false);
        if (address) onAddressResolveRef.current(address);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when parent updates coordinates (e.g. from autocomplete selection)
  useEffect(() => {
    if (!mapRef.current) return;
    if (hasPinPlaced) {
      placeMarker(mapRef.current, latitude, longitude);
      setPinActive(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, hasPinPlaced]);

  return (
    <div className="relative">
      {/* Overlay when no pin placed yet */}
      {!pinActive && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center pointer-events-none">
          <div className="bg-background/90 backdrop-blur-sm rounded-md px-4 py-3 text-center shadow-md border border-border/50">
            <MapPin className="mx-auto h-5 w-5 text-primary mb-1.5" />
            <p className="text-sm font-medium text-foreground">Kliknite na mapu</p>
            <p className="text-xs text-muted-foreground mt-0.5">da postavite lokaciju parkinga</p>
          </div>
        </div>
      )}

      {/* Reverse geocoding indicator */}
      {isGeocoding && (
        <div className="absolute top-2 right-2 z-[400] bg-background/90 backdrop-blur-sm rounded-md px-2.5 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5 shadow-sm border border-border/50">
          <Loader2 className="h-3 w-3 animate-spin" />
          Tražim adresu…
        </div>
      )}

      <div
        ref={containerRef}
        style={{ height, cursor: "crosshair" }}
        className="w-full rounded-md overflow-hidden border border-border"
        data-testid="map-draggable-location"
      />

      {hint && (
        <p className="text-xs text-muted-foreground mt-1.5 text-center">{hint}</p>
      )}
    </div>
  );
}
