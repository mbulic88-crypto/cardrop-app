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
  
  // Convert string to number if needed
  const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  const lon = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
  
  const mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=${width}&height=${height}&center=lonlat:${lon},${lat}&zoom=${zoom}&marker=lonlat:${lon},${lat};color:%2352B788;size:medium&apiKey=${apiKey}`;

  return (
    <img
      src={mapUrl}
      alt="Mapa lokacije"
      className="w-full h-full object-cover"
      data-testid="img-static-map"
    />
  );
}
