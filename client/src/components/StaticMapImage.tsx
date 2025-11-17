import { useState } from "react";
import { MapPin } from "lucide-react";

interface StaticMapImageProps {
  latitude: number | string;
  longitude: number | string;
  width?: number;
  height?: number;
  zoom?: number;
}

export function StaticMapImage({ 
  latitude, 
  longitude, 
  width = 600, 
  height = 400,
  zoom = 14 
}: StaticMapImageProps) {
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
  const [imageError, setImageError] = useState(false);
  
  // Convert string to number if needed
  const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  const lon = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
  
  // Simple marker format without color/size params (Geoapify uses default red marker)
  const mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=${width}&height=${height}&center=lonlat:${lon},${lat}&zoom=${zoom}&marker=lonlat:${lon},${lat}&apiKey=${apiKey}`;

  if (imageError || !apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <MapPin className="w-12 h-12 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={mapUrl}
      alt="Mapa lokacije"
      className="w-full h-full object-cover"
      data-testid="img-static-map"
      onError={() => setImageError(true)}
    />
  );
}
