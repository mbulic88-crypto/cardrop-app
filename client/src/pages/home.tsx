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
import { MapPin, Search, X, Calendar, Clock, Zap, Camera, Sparkles, Menu, LogIn, LayoutDashboard, Tag, PlusCircle, ShoppingBag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ParkingSpot, SalesListing } from "@shared/schema";
import { Link } from "wouter";
import { MapView } from "@/components/MapView";
import { StaticMapImage } from "@/components/StaticMapImage";
import { NearbyParkingMap } from "@/components/NearbyParkingMap";
import { geocodeAddress, calculateDistance } from "@/lib/geocoding";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [spotType, setSpotType] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [geocodedLocation, setGeocodedLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [nearbySpots, setNearbySpots] = useState<Array<ParkingSpot & { distance: number }>>([]);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginRedirectPath, setLoginRedirectPath] = useState("/home");
  const [showMenu, setShowMenu] = useState(false);
  const [listingMode, setListingMode] = useState<"all" | "rental" | "sale">("all");
  
  // Feature filters
  const [filterEvCharging, setFilterEvCharging] = useState(false);
  const [filterCamera, setFilterCamera] = useState(false);
  const [filter24Hours, setFilter24Hours] = useState(false);

  const { data: spots = [], isLoading } = useQuery<ParkingSpot[]>({
    queryKey: ["/api/parking-spots"],
  });

  const { data: salesListings = [], isLoading: isLoadingSales } = useQuery<SalesListing[]>({
    queryKey: ["/api/sales-listings"],
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
  }).sort((a, b) => {
    const tierOrder = { gold: 3, silver: 2, standard: 1 };
    const aTier = tierOrder[(a.subscriptionType as keyof typeof tierOrder)] || 1;
    const bTier = tierOrder[(b.subscriptionType as keyof typeof tierOrder)] || 1;
    return bTier - aTier;
  });

  const filteredSales = salesListings.filter((listing) => {
    const matchesLocation = !searchLocation ||
      listing.address.toLowerCase().includes(searchLocation.toLowerCase()) ||
      listing.title.toLowerCase().includes(searchLocation.toLowerCase());

    const matchesCity = selectedCity === "Svi Gradovi" ||
      listing.address.toLowerCase().includes(selectedCity.toLowerCase()) ||
      (listing.city && listing.city.toLowerCase() === selectedCity.toLowerCase());

    return matchesLocation && matchesCity && listing.isActive;
  }).sort((a, b) => {
    const tierOrder = { gold: 3, silver: 2, standard: 1 };
    const aTier = tierOrder[(a.subscriptionType as keyof typeof tierOrder)] || 1;
    const bTier = tierOrder[(b.subscriptionType as keyof typeof tierOrder)] || 1;
    return bTier - aTier;
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 flex-shrink-0" data-testid="link-landing">
              <img src={parkInLogo} alt="CarDrop" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground">CarDrop</span>
            </Link>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Input
                placeholder="Pretražite po lokaciji..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="pl-9 pr-9 h-10"
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

            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowMenu(!showMenu)}
              data-testid="button-hamburger-menu"
            >
              {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Slide-out Menu Panel */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowMenu(false)}
            data-testid="menu-backdrop"
          />
          <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-card border-l border-card-border shadow-xl z-50 overflow-y-auto" data-testid="menu-panel">
            <div className="p-4 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Meni</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowMenu(false)} data-testid="button-close-menu">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Listing Mode Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">Tip Oglasa</label>
                <div className="flex gap-2">
                  <Button
                    variant={listingMode === "rental" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setListingMode(listingMode === "rental" ? "all" : "rental")}
                    data-testid="button-filter-rental"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Iznajmljivanje
                  </Button>
                  <Button
                    variant={listingMode === "sale" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setListingMode(listingMode === "sale" ? "all" : "sale")}
                    data-testid="button-filter-sale"
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    Prodaja
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {listingMode === "all" ? "Prikazuju se svi oglasi" : listingMode === "rental" ? "Samo iznajmljivanje" : "Samo prodaja"}
                </p>
              </div>

              {/* City Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">Grad</label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger data-testid="select-city-filter">
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
              </div>

              {/* Spot Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">Tip Parking Mesta</label>
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

              {/* Price Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">
                  Cena: {priceRange[0]} - {priceRange[1]} RSD
                </label>
                <Slider
                  min={0}
                  max={500}
                  step={10}
                  value={priceRange}
                  onValueChange={setPriceRange}
                  data-testid="slider-price-range"
                />
              </div>

              {/* Feature Filters */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground block">Dodatne Opcije</label>
                <div className="space-y-3">
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

              <hr className="border-border" />

              {/* Navigation & Account */}
              <div className="space-y-2">
                {isAuthenticated ? (
                  <>
                    <Link href="/dashboard" onClick={() => setShowMenu(false)}>
                      <Button variant="outline" className="w-full justify-start" data-testid="button-account">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Moj Nalog
                      </Button>
                    </Link>
                    <Link href="/my-bookings" onClick={() => setShowMenu(false)}>
                      <Button variant="outline" className="w-full justify-start" data-testid="link-my-bookings">
                        <Calendar className="w-4 h-4 mr-2" />
                        Moje Rezervacije
                      </Button>
                    </Link>
                    <Link href="/add-spot" onClick={() => setShowMenu(false)}>
                      <Button variant="outline" className="w-full justify-start" data-testid="link-add-spot">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Dodaj Parking
                      </Button>
                    </Link>
                    <Link href="/add-sale" onClick={() => setShowMenu(false)}>
                      <Button variant="outline" className="w-full justify-start" data-testid="link-add-sale">
                        <Tag className="w-4 h-4 mr-2" />
                        Oglasi Prodaju
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => { setShowMenu(false); setShowLoginDialog(true); }}
                    data-testid="button-login"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Prijavite se
                  </Button>
                )}
              </div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Tema</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1" data-testid="text-page-title">
            {listingMode === "sale" ? "Prodaja Parkinga" : listingMode === "rental" ? "Iznajmljivanje Parkinga" : "Svi Parkinzi"}
          </h1>
          <p className="text-muted-foreground" data-testid="text-results-count">
            Pronađeno {listingMode === "sale" ? filteredSales.length : listingMode === "rental" ? filteredSpots.length : (filteredSpots.length + filteredSales.length)} {listingMode === "sale" ? "oglasa" : "parking mesta"}
          </p>
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
          <MapView spots={listingMode === "sale" ? [] : filteredSpots} />
        ) : (
          <>
            {/* Sales Listings */}
            {(listingMode === "all" || listingMode === "sale") && filteredSales.length > 0 && (
              <div className={listingMode === "all" ? "mb-8" : ""}>
                {listingMode === "all" && (
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-accent" />
                    Prodaja
                  </h2>
                )}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSales.map((listing) => (
                    <Link key={listing.id} href={`/sale/${listing.id}`}>
                      <Card
                        className={`overflow-hidden hover-elevate cursor-pointer h-full relative ${
                          listing.subscriptionType === 'gold'
                            ? 'border-2 border-[#DAA520] ring-2 ring-[#DAA520]/20'
                            : listing.subscriptionType === 'silver'
                              ? 'border-2 border-[#A8A9AD] ring-2 ring-[#A8A9AD]/20'
                              : ''
                        }`}
                        data-testid={`card-sale-${listing.id}`}
                      >
                        {listing.subscriptionType === 'gold' && (
                          <div className="absolute top-2 left-2 z-20">
                            <Badge className="bg-gradient-to-r from-[#DAA520] via-[#FFD700] to-[#B8860B] text-white border-0 text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Top
                            </Badge>
                          </div>
                        )}
                        {listing.subscriptionType === 'silver' && (
                          <div className="absolute top-2 left-2 z-20">
                            <Badge className="bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A9AD] text-[#333] border-0 text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Istaknuto
                            </Badge>
                          </div>
                        )}
                        <div className="aspect-video bg-muted relative">
                          {listing.imageUrls && listing.imageUrls.length > 0 ? (
                            <img src={listing.imageUrls[0]} alt={listing.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 z-10">
                            <Badge className="bg-orange-500/90 text-white border-0">
                              Prodaja
                            </Badge>
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold text-base mb-2 text-card-foreground line-clamp-1">
                            {listing.title}
                          </h3>
                          <div className="flex items-center text-muted-foreground mb-3">
                            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="text-xs line-clamp-1">{listing.address}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className={`text-xl font-bold ${listing.subscriptionType === 'gold' ? 'text-[#B8860B] dark:text-[#FFD700]' : listing.subscriptionType === 'silver' ? 'text-[#71706E] dark:text-[#C0C0C0]' : 'text-accent'}`}>
                                {parseFloat(listing.price).toLocaleString()}
                              </span>
                              <span className="text-muted-foreground text-xs ml-1">EUR</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {listing.area}m²
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Rental Parking Spots */}
            {(listingMode === "all" || listingMode === "rental") && (
              <>
                {listingMode === "all" && filteredSales.length > 0 && (
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-accent" />
                    Iznajmljivanje
                  </h2>
                )}
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
                            <Card 
                              className={`overflow-hidden hover-elevate cursor-pointer h-full relative ${
                                spot.subscriptionType === 'gold'
                                  ? 'border-2 border-[#DAA520] ring-2 ring-[#DAA520]/20'
                                  : spot.subscriptionType === 'silver'
                                    ? 'border-2 border-[#A8A9AD] ring-2 ring-[#A8A9AD]/20'
                                    : ''
                              }`}
                              data-testid={`card-nearby-spot-${spot.id}`}
                            >
                              {spot.subscriptionType === 'gold' && (
                                <div className="absolute top-2 left-2 z-20">
                                  <Badge className="bg-gradient-to-r from-[#DAA520] via-[#FFD700] to-[#B8860B] text-white border-0 text-xs">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Top lokacija
                                  </Badge>
                                </div>
                              )}
                              {spot.subscriptionType === 'silver' && (
                                <div className="absolute top-2 left-2 z-20">
                                  <Badge className="bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A9AD] text-[#333] border-0 text-xs">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Istaknuto
                                  </Badge>
                                </div>
                              )}
                              
                              <div className={`aspect-video bg-muted relative ${
                                spot.subscriptionType === 'gold' ? 'ring-2 ring-[#DAA520]/30 ring-inset' 
                                : spot.subscriptionType === 'silver' ? 'ring-2 ring-[#A8A9AD]/30 ring-inset' 
                                : ''
                              }`}>
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
                                    <span className={`text-xl font-bold ${spot.subscriptionType === 'gold' ? 'text-[#B8860B] dark:text-[#FFD700]' : spot.subscriptionType === 'silver' ? 'text-[#71706E] dark:text-[#C0C0C0]' : 'text-accent'}`}>
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
                    <Card 
                      className={`overflow-hidden hover-elevate cursor-pointer h-full relative ${
                        spot.subscriptionType === 'gold'
                          ? 'border-2 border-[#DAA520] ring-2 ring-[#DAA520]/20'
                          : spot.subscriptionType === 'silver'
                            ? 'border-2 border-[#A8A9AD] ring-2 ring-[#A8A9AD]/20'
                            : ''
                      }`} 
                      data-testid={`card-spot-${spot.id}`}
                    >
                      {spot.subscriptionType === 'gold' && (
                        <div className="absolute top-2 left-2 z-20">
                          <Badge className="bg-gradient-to-r from-[#DAA520] via-[#FFD700] to-[#B8860B] text-white border-0 text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Top lokacija
                          </Badge>
                        </div>
                      )}
                      {spot.subscriptionType === 'silver' && (
                        <div className="absolute top-2 left-2 z-20">
                          <Badge className="bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A9AD] text-[#333] border-0 text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Istaknuto
                          </Badge>
                        </div>
                      )}
                      
                      <div className={`aspect-video bg-muted relative ${
                        spot.subscriptionType === 'gold' ? 'ring-2 ring-[#DAA520]/30 ring-inset' 
                        : spot.subscriptionType === 'silver' ? 'ring-2 ring-[#A8A9AD]/30 ring-inset' 
                        : ''
                      }`}>
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
                            <span className={`text-xl font-bold ${spot.subscriptionType === 'gold' ? 'text-[#B8860B] dark:text-[#FFD700]' : spot.subscriptionType === 'silver' ? 'text-[#71706E] dark:text-[#C0C0C0]' : 'text-accent'}`}>
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
