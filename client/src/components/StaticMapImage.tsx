interface StaticMapImageProps {
  latitude: number;
  longitude: number;
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
  
  const mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=${width}&height=${height}&center=lonlat:${longitude},${latitude}&zoom=${zoom}&marker=lonlat:${longitude},${latitude};color:%2352B788;size:medium&apiKey=${apiKey}`;

  return (
    <img
      src={mapUrl}
      alt="Mapa lokacije"
      className="w-full h-full object-cover"
      data-testid="img-static-map"
    />
  );
}
