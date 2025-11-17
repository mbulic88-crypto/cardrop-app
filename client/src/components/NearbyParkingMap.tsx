import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ParkingSpot } from '@shared/schema';

// Fix default marker icon issue in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface NearbyParkingMapProps {
  searchedLocation: { lat: number; lon: number };
  nearbySpots: Array<ParkingSpot & { distance: number }>;
}

export function NearbyParkingMap({ searchedLocation, nearbySpots }: NearbyParkingMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView(
        [searchedLocation.lat, searchedLocation.lon],
        13
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapRef.current);
    }

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Red marker for searched location
    const redIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    L.marker([searchedLocation.lat, searchedLocation.lon], { icon: redIcon })
      .addTo(mapRef.current)
      .bindPopup('<b>Tražena Lokacija</b>')
      .openPopup();

    // Green markers for nearby parking spots
    const greenIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    nearbySpots.forEach((spot, index) => {
      if (spot.latitude && spot.longitude) {
        const lat = typeof spot.latitude === 'string' ? parseFloat(spot.latitude) : spot.latitude;
        const lon = typeof spot.longitude === 'string' ? parseFloat(spot.longitude) : spot.longitude;

        L.marker([lat, lon], { icon: greenIcon })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div>
              <b>${spot.title}</b><br/>
              ${spot.address}<br/>
              <strong>${spot.pricePerHour} ${spot.currency}/sat</strong><br/>
              <em>~${spot.distance.toFixed(1)} km od tražene lokacije</em>
            </div>
          `);
      }
    });

    // Fit map to show all markers
    const allLatLngs: L.LatLngExpression[] = [
      [searchedLocation.lat, searchedLocation.lon],
      ...nearbySpots
        .filter((spot) => spot.latitude && spot.longitude)
        .map((spot) => {
          const lat = typeof spot.latitude === 'string' ? parseFloat(spot.latitude) : spot.latitude;
          const lon = typeof spot.longitude === 'string' ? parseFloat(spot.longitude) : spot.longitude;
          return [lat, lon] as L.LatLngExpression;
        }),
    ];

    if (allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: false });
    }

    return () => {
      // Cleanup on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [searchedLocation, nearbySpots]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[400px] rounded-lg overflow-hidden border border-card-border"
      data-testid="map-nearby-parking"
    />
  );
}
