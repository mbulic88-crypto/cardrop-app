import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Search, SlidersHorizontal, X, Calendar, Clock, Zap, Camera, Shield, Home as HomeIcon, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ParkingSpot } from "@shared/schema";
import { Link } from "wouter";
import { MapView } from "@/components/MapView";
import { StaticMapImage } from "@/components/StaticMapImage";
import { NearbyParkingMap } from "@/components/NearbyParkingMap";
import { geocodeAddress, calculateDistance } from "@/lib/geocoding";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";

const defaultCities = [
  "Beograd",
  "Novi Sad",
  "Niš",
  "Kragujevac",
  "Subotica",
  "Zrenjanin",
  "Pančevo",
  "Čačak",
  "Kraljevo",
  "Smederevo",
  "Leskovac",
  "Užice",
  "Valjevo",
  "Šabac",
  "Sombor"
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [searchLocation, setSearchLocation] = useState("");
  const [selectedCity, setSelectedCity] = useState("Svi Gradovi");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [spotType, setSpotType] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [geocodedLocation, setGeocodedLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [nearbySpots, setNearbySpots] = useState<Array<ParkingSpot & { distance: number }>>([]);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginRedirectPath, setLoginRedirectPath] = useState("/home");
  
  // Feature filters
  const [filterEvCharging, setFilterEvCharging] = useState(false);
  const [filterCamera, setFilterCamera] = useState(false);
  const [filter24Hours, setFilter24Hours] = useState(false);

  const { data: spots = [], isLoading } = useQuery<ParkingSpot[]>({
    queryKey: ["/api/parking-spots"],
  });

  // Dynamic cities based on spots
  const availableCities = useMemo(() => {
    const citiesFromSpots: string[] = [];
    spots.forEach(spot => {
      if (spot.city && spot.city !== "Ostalo" && !citiesFromSpots.includes(spot.city)) {
        citiesFromSpots.push(spot.city);
      } else if (spot.address) {
        // Try to extract city from address
        defaultCities.forEach(city => {
          if (spot.address.toLowerCase().includes(city.toLowerCase()) && !citiesFromSpots.includes(city)) {
            citiesFromSpots.push(city);
          }
        });
      }
    });
    // Merge with default cities, deduplicate and sort
    const allCities = [...defaultCities];
    citiesFromSpots.forEach(city => {
      if (!allCities.includes(city)) {
        allCities.push(city);
      }
    });
    return ["Svi Gradovi", ...allCities.sort()];
  }, [spots]);

  const filteredSpots = spots.filter((spot) => {
    const matchesLocation = !searchLocation || 
      spot.address.toLowerCase().includes(searchLocation.toLowerCase()) ||
      spot.title.toLowerCase().includes(searchLocation.toLowerCase());
    
    const matchesCity = selectedCity === "Svi Gradovi" ||
      spot.address.toLowerCase().includes(selectedCity.toLowerCase()) ||
      (spot.city && spot.city.toLowerCase() === selectedCity.toLowerCase());
    
    const price = parseFloat(spot.pricePerHour);
    const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
    
    const matchesType = spotType === "all" || spot.spotType === spotType;
    
    // Feature filters
    const matchesEvCharging = !filterEvCharging || spot.hasEvCharging;
    const matchesCamera = !filterCamera || spot.hasSecurityCamera;
    const matches24Hours = !filter24Hours || spot.is24Hours;
    
    return matchesLocation && matchesCity && matchesPrice && matchesType && 
           matchesEvCharging && matchesCamera && matches24Hours && spot.isActive;
  });

  const handleProtectedAction = (path: string) => {
    if (isAuthenticated) {
      window.location.href = path;
    } else {
      setLoginRedirectPath(path);
      setShowLoginDialog(true);
    }
  };

  // Geocode search location when no results found
  useEffect(() => {
    async function findNearbySpots() {
      if (searchLocation && filteredSpots.length === 0 && spots.length > 0) {
        const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
        
        if (!apiKey) {
          console.error('Geoapify API key not found');
          return;
        }

        // Geocode the searched address
        const location = await geocodeAddress(searchLocation, apiKey);
        
        if (location) {
          setGeocodedLocation(location);

          // Calculate distances to all parking spots
          const spotsWithDistance = spots
            .filter((spot) => spot.latitude && spot.longitude && spot.isActive)
            .map((spot) => {
              const lat = typeof spot.latitude === 'string' ? parseFloat(spot.latitude) : spot.latitude;
              const lon = typeof spot.longitude === 'string' ? parseFloat(spot.longitude) : spot.longitude;
              
              const distance = calculateDistance(
                location.lat,
                location.lon,
                lat,
                lon
              );

              return { ...spot, distance };
            })
            .sort((a, b) => a.distance - b.distance)
            .filter((spot, index, self) => 
              index === self.findIndex((s) => s.id === spot.id)
            )
            .slice(0, 3); // Get 3 closest unique spots

          setNearbySpots(spotsWithDistance);
        }
      } else {
        setGeocodedLocation(null);
        setNearbySpots([]);
      }
    }

    findNearbySpots();
  }, [searchLocation, filteredSpots.length, spots]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-1 xs:px-2 sm:px-4 py-2.5 xs:py-3 sm:py-4">
          {/* Top Row: Logo, City Filter, Filters Button */}
          <div className="flex items-center justify-between gap-1 xs:gap-2 mb-3">
            <Link href="/home" className="flex items-center gap-1.5 xs:gap-2">
              <img src={parkInLogo} alt="ParkIN" className="w-7 xs:w-8 h-7 xs:h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground hidden sm:inline">ParkIN</span>
            </Link>

            <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-2">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-[75px] xs:w-[95px] sm:w-[140px] md:w-[180px] text-xs xs:text-sm px-1.5 xs:px-3" data-testid="select-city-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
                className="h-8 w-8 xs:h-9 xs:w-9"
              >
                <SlidersHorizontal className="w-4 h-4 xs:w-5 xs:h-5" />
              </Button>

              <Link href="/" className="hidden xs:inline-block">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 xs:h-9 xs:w-9 sm:w-auto sm:px-3"
                  data-testid="button-home"
                >
                  <HomeIcon className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Početna</span>
                </Button>
              </Link>

              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 xs:h-9 xs:w-9 sm:w-auto sm:px-3"
                    data-testid="button-account"
                  >
                    <HomeIcon className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Nalog</span>
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>

          {/* Search Bar Row */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
            <Input
              placeholder="Pretražite po lokaciji ili adresi..."
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="pl-10 pr-10 h-14 !text-lg"
              data-testid="input-search-location"
            />
            {searchLocation && (
              <button
                onClick={() => setSearchLocation("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-muted/20 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block text-foreground">
                    Tip Parking Mesta
                  </label>
                  <Select value={spotType} onValueChange={setSpotType}>
                    <SelectTrigger data-testid="select-spot-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Svi Tipovi</SelectItem>
                      <SelectItem value="covered">Pokriveno</SelectItem>
                      <SelectItem value="uncovered">Nepokriveno</SelectItem>
                      <SelectItem value="garage">Garaža</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-2 block text-foreground">
                    Cena po Satu: {priceRange[0]} - {priceRange[1]} RSD
                  </label>
                  <Slider
                    min={0}
                    max={500}
                    step={10}
                    value={priceRange}
                    onValueChange={setPriceRange}
                    className="mt-2"
                    data-testid="slider-price-range"
                  />
                </div>
              </div>

              {/* Feature Filters */}
              <div className="pt-4 border-t border-border">
                <label className="text-sm font-medium mb-3 block text-foreground">
                  Dodatne Opcije
                </label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="filter-ev"
                      checked={filterEvCharging}
                      onCheckedChange={setFilterEvCharging}
                      data-testid="switch-filter-ev"
                    />
                    <Label htmlFor="filter-ev" className="flex items-center gap-1 text-sm cursor-pointer">
                      <Zap className="w-4 h-4 text-accent" />
                      EV Punjač
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="filter-camera"
                      checked={filterCamera}
                      onCheckedChange={setFilterCamera}
                      data-testid="switch-filter-camera"
                    />
                    <Label htmlFor="filter-camera" className="flex items-center gap-1 text-sm cursor-pointer">
                      <Camera className="w-4 h-4 text-accent" />
                      Kamera
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="filter-24h"
                      checked={filter24Hours}
                      onCheckedChange={setFilter24Hours}
                      data-testid="switch-filter-24h"
                    />
                    <Label htmlFor="filter-24h" className="flex items-center gap-1 text-sm cursor-pointer">
                      <Clock className="w-4 h-4 text-accent" />
                      24/7
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Izaberite Parking
            </h1>
            <p className="text-muted-foreground">
              Pronađeno {filteredSpots.length} parking {filteredSpots.length === 1 ? "mesto" : "mesta"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              onClick={() => handleProtectedAction("/my-bookings")}
              data-testid="link-my-bookings"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Moje Rezervacije
            </Button>
            <Button 
              onClick={() => handleProtectedAction("/add-spot")}
              data-testid="link-add-spot"
            >
              <Zap className="w-4 h-4 mr-2" />
              Dodaj Mesto
            </Button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-4 flex gap-2 max-w-xs">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => setViewMode("list")}
            className="flex-1"
            data-testid="button-view-list"
          >
            Lista
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "outline"}
            onClick={() => setViewMode("map")}
            className="flex-1"
            data-testid="button-view-map"
          >
            Mapa
          </Button>
        </div>

        {/* Map or List View */}
        {viewMode === "map" ? (
          <MapView spots={filteredSpots} />
        ) : (
          <>
            {/* Parking Spots Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="aspect-video bg-muted rounded-lg mb-4" />
                    <div className="h-6 bg-muted rounded mb-2" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </Card>
                ))}
              </div>
            ) : filteredSpots.length === 0 ? (
              <>
                {geocodedLocation && nearbySpots.length > 0 ? (
                  <div className="space-y-6">
                    {/* Message */}
                    <Card className="p-6 text-center bg-muted/30">
                      <MapPin className="w-12 h-12 text-accent mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2 text-card-foreground">
                        Nema parking mesta na traženoj lokaciji
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Ali pronašli smo {nearbySpots.length} najbliža parking mesta u blizini
                      </p>
                    </Card>

                    {/* Map with nearby spots */}
                    <NearbyParkingMap
                      searchedLocation={geocodedLocation}
                      nearbySpots={nearbySpots}
                    />

                    {/* Nearby spots cards */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-foreground">
                        Najbliža Parking Mesta
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {nearbySpots.map((spot) => (
                          <Link key={spot.id} href={`/spot/${spot.id}`}>
                            <Card className="overflow-hidden hover-elevate cursor-pointer h-full" data-testid={`card-nearby-spot-${spot.id}`}>
                              {/* Static Map Preview */}
                              <div className="aspect-video bg-muted relative">
                                {spot.latitude && spot.longitude ? (
                                  <StaticMapImage
                                    latitude={spot.latitude}
                                    longitude={spot.longitude}
                                    width={600}
                                    height={400}
                                    zoom={14}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <MapPin className="w-12 h-12 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="absolute top-2 right-2 z-10">
                                  <Badge className="bg-accent/90 text-accent-foreground border-0">
                                    {spot.spotType === "covered" ? "Pokriveno" : spot.spotType === "garage" ? "Garaža" : "Nepokriveno"}
                                  </Badge>
                                </div>
                                {/* Distance badge */}
                                <div className="absolute bottom-2 left-2 z-10">
                                  <Badge className="bg-card/90 text-card-foreground border border-card-border">
                                    ~{spot.distance.toFixed(1)} km
                                  </Badge>
                                </div>
                              </div>

                              {/* Content */}
                              <div className="p-3">
                                <h3 className="font-semibold text-base mb-2 text-card-foreground">
                                  {spot.title}
                                </h3>
                                <div className="flex items-center text-muted-foreground mb-3">
                                  <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                  <span className="text-xs line-clamp-1">{spot.address}</span>
                                </div>

                                {/* Features */}
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {spot.hasEvCharging && (
                                    <Badge variant="outline" className="text-xs">
                                      <Zap className="w-3 h-3 mr-1" />
                                      EV
                                    </Badge>
                                  )}
                                  {spot.hasSecurityCamera && (
                                    <Badge variant="outline" className="text-xs">
                                      <Camera className="w-3 h-3 mr-1" />
                                      Kamera
                                    </Badge>
                                  )}
                                </div>

                                {/* Price */}
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-xl font-bold text-accent">
                                      {spot.pricePerHour}
                                    </span>
                                    <span className="text-muted-foreground text-xs ml-1">
                                      {spot.currency}/sat
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2 text-card-foreground">
                      Nema Rezultata
                    </h3>
                    <p className="text-muted-foreground">
                      Pokušajte da promenite filter ili pretragu
                    </p>
                  </Card>
                )}
              </>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSpots.map((spot) => (
                  <Link key={spot.id} href={`/spot/${spot.id}`}>
                    <Card className="overflow-hidden hover-elevate cursor-pointer h-full" data-testid={`card-spot-${spot.id}`}>
                      {/* Static Map Preview */}
                      <div className="aspect-video bg-muted relative">
                        {spot.latitude && spot.longitude ? (
                          <StaticMapImage
                            latitude={spot.latitude}
                            longitude={spot.longitude}
                            width={600}
                            height={400}
                            zoom={14}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 z-10">
                          <Badge className="bg-accent/90 text-accent-foreground border-0">
                            {spot.spotType === "covered" ? "Pokriveno" : spot.spotType === "garage" ? "Garaža" : "Nepokriveno"}
                          </Badge>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-3">
                        <h3 className="font-semibold text-base mb-2 text-card-foreground">
                          {spot.title}
                        </h3>
                        <div className="flex items-center text-muted-foreground mb-3">
                          <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="text-xs line-clamp-1">{spot.address}</span>
                        </div>

                        {/* Features */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {spot.hasEvCharging && (
                            <Badge variant="outline" className="text-xs">
                              <Zap className="w-3 h-3 mr-1" />
                              EV
                            </Badge>
                          )}
                          {spot.hasSecurityCamera && (
                            <Badge variant="outline" className="text-xs">
                              <Camera className="w-3 h-3 mr-1" />
                              Kamera
                            </Badge>
                          )}
                        </div>

                        {/* Price */}
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xl font-bold text-accent">
                              {spot.pricePerHour}
                            </span>
                            <span className="text-muted-foreground text-xs ml-1">
                              {spot.currency}/sat
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Login Required Dialog */}
      <LoginRequiredDialog
        open={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        message="Za ovu funkciju potrebna je prijava na nalog."
        redirectPath={loginRedirectPath}
      />
    </div>
  );
}
