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

// Category emoji map
const categoryEmoji: Record<string, string> = {
  private: "P",
  company: "C", 
  truck_stop: "T",
  residential: "R",
  car_lot: "L",
};

function createMarkerIcon(category: string, isPremium: boolean, subscriptionType?: string) {
  const emoji = categoryEmoji[category] || "P";
  const tier = subscriptionType || 'standard';
  
  let fillColor = "#40916C";
  let borderColor = "#2D6A4F";
  let glowEffect = "";
  let animationName = "";
  
  if (tier === 'gold') {
    fillColor = "#DAA520";
    borderColor = "#B8860B";
    glowEffect = "drop-shadow(0 0 6px rgba(218, 165, 32, 0.8)) drop-shadow(0 0 12px rgba(255, 215, 0, 0.4))";
    animationName = "gold-pulse";
  } else if (tier === 'silver') {
    fillColor = "#A8A9AD";
    borderColor = "#808080";
    glowEffect = "drop-shadow(0 0 5px rgba(192, 192, 192, 0.6)) drop-shadow(0 0 10px rgba(168, 169, 173, 0.3))";
    animationName = "silver-pulse";
  }
  
  const gradientId = `grad-${tier}-${Math.random().toString(36).substr(2, 5)}`;
  
  let gradientDef = '';
  if (tier === 'gold') {
    gradientDef = `<defs><linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#DAA520"/><stop offset="50%" style="stop-color:#FFD700"/><stop offset="100%" style="stop-color:#B8860B"/></linearGradient></defs>`;
  } else if (tier === 'silver') {
    gradientDef = `<defs><linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#C0C0C0"/><stop offset="50%" style="stop-color:#E8E8E8"/><stop offset="100%" style="stop-color:#A8A9AD"/></linearGradient></defs>`;
  }
  
  const usesGradient = tier === 'gold' || tier === 'silver';
  const pinFill = usesGradient ? `url(#${gradientId})` : fillColor;
  const textColor = tier === 'silver' ? '#333' : 'white';
  
  return L.divIcon({
    html: `
      <div style="
        width: 30px;
        height: 42px;
        position: relative;
        ${animationName ? `animation: ${animationName} 2s ease-in-out infinite;` : ''}
        ${isPremium && glowEffect ? `filter: ${glowEffect};` : ''}
      ">
        <svg viewBox="0 0 30 42" width="30" height="42" xmlns="http://www.w3.org/2000/svg">
          ${gradientDef}
          <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z" 
                fill="${pinFill}" stroke="${borderColor}" stroke-width="2"/>
          <text x="15" y="17" text-anchor="middle" dominant-baseline="central" 
                fill="${textColor}" font-size="12" font-weight="bold">${emoji}</text>
        </svg>
      </div>
      ${animationName ? `<style>
        @keyframes ${animationName} {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      </style>` : ''}
    `,
    className: "custom-marker-icon",
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -42],
  });
}

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

      const icon = createMarkerIcon(spot.category || 'private', spot.isPremium || false, spot.subscriptionType || 'standard');
      const marker = L.marker([parseFloat(spot.latitude), parseFloat(spot.longitude)], { icon })
        .addTo(mapRef.current!);

      const container = document.createElement('div');
      container.className = 'p-2 min-w-[200px] cursor-pointer';
      
      if (spot.subscriptionType === 'gold') {
        const badge = document.createElement('div');
        badge.className = 'mb-2';
        badge.innerHTML = '<span style="background: linear-gradient(135deg, #DAA520 0%, #FFD700 50%, #B8860B 100%); color: white; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">Top parking</span>';
        container.appendChild(badge);
      } else if (spot.subscriptionType === 'silver') {
        const badge = document.createElement('div');
        badge.className = 'mb-2';
        badge.innerHTML = '<span style="background: linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 50%, #A8A9AD 100%); color: #333; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">Istaknuto</span>';
        container.appendChild(badge);
      }
      
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
      
      if (spot.parkingNumber) {
        const numBadge = document.createElement('span');
        numBadge.className = 'text-xs font-mono inline-block mb-1.5 px-1.5 py-0.5 rounded border border-current opacity-80';
        numBadge.style.cssText = 'color: #52B788; border-color: rgba(82,183,136,0.4); background: rgba(82,183,136,0.1);';
        numBadge.textContent = spot.parkingNumber;
        container.insertBefore(numBadge, address);
      }

      const priceUnit = spot.pricingType === 'hourly' ? 'sat' : spot.pricingType === 'monthly' ? 'mes' : 'dan';
      const price = document.createElement('div');
      price.className = 'text-lg font-bold text-accent';
      price.textContent = `${spot.pricePerHour} ${spot.currency}/${priceUnit}`;
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
