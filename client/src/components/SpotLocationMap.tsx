import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface SpotLocationMapProps {
  latitude: string;
  longitude: string;
  title: string;
  address: string;
}

export function SpotLocationMap({ latitude, longitude, title, address }: SpotLocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Create map centered on the parking spot
    const map = L.map(mapContainerRef.current).setView([lat, lng], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add marker for the parking spot
    const marker = L.marker([lat, lng]).addTo(map);
    
    // Add popup with spot details
    marker.bindPopup(`<div class="font-semibold">${title}</div><div class="text-sm text-muted-foreground">${address}</div>`);
    marker.openPopup();

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, title, address]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full rounded-lg"
      style={{ minHeight: '400px' }}
      data-testid="map-spot-location"
    />
  );
}
