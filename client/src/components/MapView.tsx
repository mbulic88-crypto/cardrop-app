import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ParkingSpot } from "@shared/schema";
import { useLocation } from "wouter";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapViewProps {
  spots: ParkingSpot[];
}

export function MapView({ spots }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center on Novi Sad, Serbia by default
    const map = L.map(mapContainerRef.current).setView([45.2671, 19.8335], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add markers for each spot
    spots.forEach((spot) => {
      if (!spot.latitude || !spot.longitude) return;

      const marker = L.marker([parseFloat(spot.latitude), parseFloat(spot.longitude)])
        .addTo(mapRef.current!);

      // Create popup content using pure DOM (no HTML strings to prevent XSS)
      const container = document.createElement('div');
      container.className = 'p-2 min-w-[200px] cursor-pointer';
      
      const title = document.createElement('h3');
      title.className = 'font-semibold text-base mb-1';
      title.textContent = spot.title;
      container.appendChild(title);
      
      const address = document.createElement('div');
      address.className = 'flex items-start text-sm text-muted-foreground mb-2';
      const addressText = document.createElement('span');
      addressText.textContent = spot.address;
      address.appendChild(addressText);
      container.appendChild(address);
      
      // Features
      if (spot.hasEvCharging || spot.hasSecurityCamera || spot.is24Hours) {
        const featuresDiv = document.createElement('div');
        featuresDiv.className = 'flex gap-1 mb-2 flex-wrap';
        
        if (spot.hasEvCharging) {
          const badge = document.createElement('span');
          badge.className = 'text-xs border rounded px-1 py-0.5';
          badge.textContent = 'EV Punjač';
          featuresDiv.appendChild(badge);
        }
        
        if (spot.hasSecurityCamera) {
          const badge = document.createElement('span');
          badge.className = 'text-xs border rounded px-1 py-0.5';
          badge.textContent = 'Kamera';
          featuresDiv.appendChild(badge);
        }
        
        if (spot.is24Hours) {
          const badge = document.createElement('span');
          badge.className = 'text-xs border rounded px-1 py-0.5';
          badge.textContent = '24/7';
          featuresDiv.appendChild(badge);
        }
        
        container.appendChild(featuresDiv);
      }
      
      const price = document.createElement('div');
      price.className = 'text-lg font-bold text-accent';
      price.textContent = `${spot.pricePerHour} ${spot.currency}/sat`;
      container.appendChild(price);
      
      // Add click handler directly to the DOM element
      container.addEventListener('click', () => {
        setLocation(`/spot/${spot.id}`);
      });

      // Bind the DOM element directly (not HTML string)
      marker.bindPopup(container);
      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (spots.length > 0) {
      const validSpots = spots.filter(s => s.latitude && s.longitude);
      if (validSpots.length > 0) {
        const bounds = L.latLngBounds(
          validSpots.map(s => [parseFloat(s.latitude!), parseFloat(s.longitude!)])
        );
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [spots, setLocation]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-[600px] rounded-lg border border-card-border overflow-hidden"
      data-testid="map-view"
    />
  );
}
