import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
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
  const [filterTier, setFilterTier] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

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
    const minPrice = priceMin ? parseFloat(priceMin) : 0;
    const maxPrice = priceMax ? parseFloat(priceMax) : Infinity;
    const matchesPrice = price >= minPrice && price <= maxPrice;
    
    const matchesType = spotType === "all" || spot.spotType === spotType;
    
    // Feature filters
    const matchesEvCharging = !filterEvCharging || spot.hasEvCharging;
    const matchesCamera = !filterCamera || spot.hasSecurityCamera;
    const matches24Hours = !filter24Hours || spot.is24Hours;

    const matchesTier = filterTier === "all" || 
      (filterTier === "gold" && spot.subscriptionType === "gold") ||
      (filterTier === "silver" && spot.subscriptionType === "silver") ||
      (filterTier === "standard" && (!spot.subscriptionType || spot.subscriptionType === "standard" || spot.subscriptionType === "trial"));

    const matchesCategory = filterCategory === "all" || spot.category === filterCategory;
    
    return matchesLocation && matchesCity && matchesPrice && matchesType && 
           matchesEvCharging && matchesCamera && matches24Hours && matchesTier && matchesCategory && spot.isActive;
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

  type CombinedListing = 
    | { type: 'rental'; data: ParkingSpot }
    | { type: 'sale'; data: SalesListing };

  const combinedListings = useMemo(() => {
    const tierOrder: Record<string, number> = { gold: 3, silver: 2, standard: 1 };

    let rentalItems: CombinedListing[] = [];
    let saleItems: CombinedListing[] = [];

    if (listingMode === "all" || listingMode === "rental") {
      rentalItems = filteredSpots.map(spot => ({ type: 'rental' as const, data: spot }));
    }
    if (listingMode === "all" || listingMode === "sale") {
      saleItems = filteredSales.map(listing => ({ type: 'sale' as const, data: listing }));
    }

    const all = [...rentalItems, ...saleItems];

    const hasActiveFilters = searchLocation || selectedCity !== "Svi Gradovi" || 
      filterEvCharging || filterCamera || filter24Hours || spotType !== "all" ||
      filterTier !== "all" || filterCategory !== "all" ||
      priceMin !== "" || priceMax !== "";

    all.sort((a, b) => {
      const aTier = tierOrder[a.data.subscriptionType || 'standard'] || 1;
      const bTier = tierOrder[b.data.subscriptionType || 'standard'] || 1;
      if (aTier !== bTier) return bTier - aTier;

      const aTime = a.data.createdAt ? new Date(a.data.createdAt).getTime() : 0;
      const bTime = b.data.createdAt ? new Date(b.data.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return all;
  }, [filteredSpots, filteredSales, listingMode, searchLocation, selectedCity, filterEvCharging, filterCamera, filter24Hours, spotType, priceMin, priceMax, filterTier, filterCategory]);

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

              {/* Tier Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">Paket</label>
                <Select value={filterTier} onValueChange={setFilterTier}>
                  <SelectTrigger data-testid="select-tier-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Svi Paketi</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">Kategorija</label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger data-testid="select-category-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Sve Kategorije</SelectItem>
                    <SelectItem value="private">Privatni Parking</SelectItem>
                    <SelectItem value="company">Kompanije</SelectItem>
                    <SelectItem value="truck">Kamionski Parkovi</SelectItem>
                    <SelectItem value="residential">Stambene Zajednice</SelectItem>
                    <SelectItem value="carlot">Auto-Placevi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">
                  Cena (RSD)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Od"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    data-testid="input-price-min"
                    min={0}
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="Do"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    data-testid="input-price-max"
                    min={0}
                  />
                </div>
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
            {(isLoading || isLoadingSales) ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="aspect-video bg-muted rounded-lg mb-4" />
                    <div className="h-6 bg-muted rounded mb-2" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </Card>
                ))}
              </div>
            ) : combinedListings.length === 0 ? (
              <>
                {geocodedLocation && nearbySpots.length > 0 ? (
                  <div className="space-y-6">
                    <Card className="p-6 text-center bg-muted/30">
                      <MapPin className="w-12 h-12 text-accent mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2 text-card-foreground">
                        Nema parking mesta na traženoj lokaciji
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Ali pronašli smo {nearbySpots.length} najbliža parking mesta u blizini
                      </p>
                    </Card>

                    <NearbyParkingMap
                      searchedLocation={geocodedLocation}
                      nearbySpots={nearbySpots}
                    />

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
                                  ? 'border-2 border-[#DAA520] shadow-[0_0_15px_rgba(218,165,32,0.3)]'
                                  : spot.subscriptionType === 'silver'
                                    ? 'border-2 border-[#A8A9AD] shadow-[0_0_15px_rgba(168,169,173,0.3)]'
                                    : ''
                              }`}
                              data-testid={`card-nearby-spot-${spot.id}`}
                            >
                              <div className="aspect-video bg-muted relative">
                                {spot.imageUrls && spot.imageUrls.length > 0 ? (
                                  <img src={spot.imageUrls[0]} alt={spot.title} className="w-full h-full object-cover" />
                                ) : spot.latitude && spot.longitude ? (
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
                                <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
                                  {spot.subscriptionType === 'gold' && (
                                    <Badge className="bg-gradient-to-r from-[#DAA520] via-[#FFD700] to-[#B8860B] text-white border-0 text-[10px] px-1.5 py-0.5">
                                      <Sparkles className="w-3 h-3 mr-0.5" />
                                      Top parking
                                    </Badge>
                                  )}
                                  {spot.subscriptionType === 'silver' && (
                                    <Badge className="bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A9AD] text-[#333] border-0 text-[10px] px-1.5 py-0.5">
                                      <Sparkles className="w-3 h-3 mr-0.5" />
                                      Istaknuto
                                    </Badge>
                                  )}
                                  <Badge className="bg-accent/90 text-accent-foreground border-0 text-[10px] px-1.5 py-0.5 w-fit">
                                    Iznajmljivanje
                                  </Badge>
                                </div>
                                <div className="absolute bottom-2 left-2 z-10">
                                  <Badge className="bg-card/90 text-card-foreground border border-card-border">
                                    ~{spot.distance.toFixed(1)} km
                                  </Badge>
                                </div>
                              </div>

                              <div className={`p-3 ${
                                spot.subscriptionType === 'gold'
                                  ? 'bg-gradient-to-r from-[#DAA520] via-[#FFD700] to-[#B8860B]'
                                  : spot.subscriptionType === 'silver'
                                    ? 'bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A9AD]'
                                    : ''
                              }`}>
                                <h3 className={`font-semibold text-base mb-2 ${
                                  spot.subscriptionType === 'gold' ? 'text-white' 
                                  : spot.subscriptionType === 'silver' ? 'text-[#1a1a1a]' 
                                  : 'text-card-foreground'
                                }`}>
                                  {spot.title}
                                </h3>
                                <div className={`flex items-center mb-3 ${
                                  spot.subscriptionType === 'gold' ? 'text-white/80' 
                                  : spot.subscriptionType === 'silver' ? 'text-[#333]' 
                                  : 'text-muted-foreground'
                                }`}>
                                  <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                  <span className="text-xs line-clamp-1">{spot.address}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {spot.hasEvCharging && (
                                    <Badge variant="outline" className={`text-xs ${
                                      spot.subscriptionType === 'gold' ? 'border-white/40 text-white' 
                                      : spot.subscriptionType === 'silver' ? 'border-[#555]/40 text-[#333]' 
                                      : ''
                                    }`}>
                                      <Zap className="w-3 h-3 mr-1" />
                                      EV
                                    </Badge>
                                  )}
                                  {spot.hasSecurityCamera && (
                                    <Badge variant="outline" className={`text-xs ${
                                      spot.subscriptionType === 'gold' ? 'border-white/40 text-white' 
                                      : spot.subscriptionType === 'silver' ? 'border-[#555]/40 text-[#333]' 
                                      : ''
                                    }`}>
                                      <Camera className="w-3 h-3 mr-1" />
                                      Kamera
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className={`text-xl font-bold ${
                                      spot.subscriptionType === 'gold' ? 'text-white' 
                                      : spot.subscriptionType === 'silver' ? 'text-[#1a1a1a]' 
                                      : 'text-accent'
                                    }`}>
                                      {spot.pricePerHour}
                                    </span>
                                    <span className={`text-xs ml-1 ${
                                      spot.subscriptionType === 'gold' ? 'text-white/70' 
                                      : spot.subscriptionType === 'silver' ? 'text-[#444]' 
                                      : 'text-muted-foreground'
                                    }`}>
                                      {spot.currency}/{spot.pricingType === 'hourly' ? 'sat' : spot.pricingType === 'daily' ? 'dan' : spot.pricingType === 'weekly' ? 'ned' : spot.pricingType === 'monthly' ? 'mes' : 'sat'}
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
                {combinedListings.map((item) => {
                  if (item.type === 'sale') {
                    const listing = item.data as SalesListing;
                    return (
                      <Link key={`sale-${listing.id}`} href={`/sale/${listing.id}`}>
                        <Card
                          className={`overflow-hidden hover-elevate cursor-pointer h-full relative ${
                            listing.subscriptionType === 'gold'
                              ? 'border-2 border-[#DAA520] shadow-[0_0_15px_rgba(218,165,32,0.3)]'
                              : listing.subscriptionType === 'silver'
                                ? 'border-2 border-[#A8A9AD] shadow-[0_0_15px_rgba(168,169,173,0.3)]'
                                : ''
                          }`}
                          data-testid={`card-sale-${listing.id}`}
                        >
                          <div className="aspect-video bg-muted relative">
                            {listing.imageUrls && listing.imageUrls.length > 0 ? (
                              <img src={listing.imageUrls[0]} alt={listing.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="w-12 h-12 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute top-2 left-2 right-2 z-20 flex justify-between items-start gap-1">
                              <div>
                                {listing.subscriptionType === 'gold' && (
                                  <Badge className="bg-gradient-to-r from-[#DAA520] via-[#FFD700] to-[#B8860B] text-white border-0 text-xs">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Top
                                  </Badge>
                                )}
                                {listing.subscriptionType === 'silver' && (
                                  <Badge className="bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A9AD] text-[#333] border-0 text-xs">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Istaknuto
                                  </Badge>
                                )}
                              </div>
                              <Badge className="bg-orange-500/90 text-white border-0">
                                Prodaja
                              </Badge>
                            </div>
                          </div>
                        <div className={`p-3 ${
                          listing.subscriptionType === 'gold'
                            ? 'bg-gradient-to-r from-[#DAA520] via-[#FFD700] to-[#B8860B]'
                            : listing.subscriptionType === 'silver'
                              ? 'bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A9AD]'
                              : ''
                        }`}>
                          <h3 className={`font-semibold text-base mb-2 line-clamp-1 ${
                            listing.subscriptionType === 'gold' ? 'text-white' 
                            : listing.subscriptionType === 'silver' ? 'text-[#1a1a1a]' 
                            : 'text-card-foreground'
                          }`}>
                            {listing.title}
                          </h3>
                          <div className={`flex items-center mb-3 ${
                            listing.subscriptionType === 'gold' ? 'text-white/80' 
                            : listing.subscriptionType === 'silver' ? 'text-[#333]' 
                            : 'text-muted-foreground'
                          }`}>
                            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="text-xs line-clamp-1">{listing.address}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className={`text-xl font-bold ${
                                listing.subscriptionType === 'gold' ? 'text-white' 
                                : listing.subscriptionType === 'silver' ? 'text-[#1a1a1a]' 
                                : 'text-accent'
                              }`}>
                                {parseFloat(listing.price).toLocaleString()}
                              </span>
                              <span className={`text-xs ml-1 ${
                                listing.subscriptionType === 'gold' ? 'text-white/70' 
                                : listing.subscriptionType === 'silver' ? 'text-[#444]' 
                                : 'text-muted-foreground'
                              }`}>EUR</span>
                            </div>
                            <Badge variant="outline" className={`text-xs ${
                              listing.subscriptionType === 'gold' ? 'border-white/40 text-white' 
                              : listing.subscriptionType === 'silver' ? 'border-[#555]/40 text-[#333]' 
                              : ''
                            }`}>
                              {listing.area}m²
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    </Link>
                    );
                  } else {
                    const spot = item.data as ParkingSpot;
                    return (
                      <Link key={`rental-${spot.id}`} href={`/spot/${spot.id}`}>
                        <Card 
                          className={`overflow-hidden hover-elevate cursor-pointer h-full relative ${
                            spot.subscriptionType === 'gold'
                              ? 'border-2 border-[#DAA520] shadow-[0_0_15px_rgba(218,165,32,0.3)]'
                              : spot.subscriptionType === 'silver'
                                ? 'border-2 border-[#A8A9AD] shadow-[0_0_15px_rgba(168,169,173,0.3)]'
                                : ''
                          }`} 
                          data-testid={`card-spot-${spot.id}`}
                        >
                          <div className="aspect-video bg-muted relative">
                            {spot.imageUrls && spot.imageUrls.length > 0 ? (
                              <img src={spot.imageUrls[0]} alt={spot.title} className="w-full h-full object-cover" />
                            ) : spot.latitude && spot.longitude ? (
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
                            <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
                              {spot.subscriptionType === 'gold' && (
                                <Badge className="bg-gradient-to-r from-[#DAA520] via-[#FFD700] to-[#B8860B] text-white border-0 text-[10px] px-1.5 py-0.5">
                                  <Sparkles className="w-3 h-3 mr-0.5" />
                                  Top parking
                                </Badge>
                              )}
                              {spot.subscriptionType === 'silver' && (
                                <Badge className="bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A9AD] text-[#333] border-0 text-[10px] px-1.5 py-0.5">
                                  <Sparkles className="w-3 h-3 mr-0.5" />
                                  Istaknuto
                                </Badge>
                              )}
                              <Badge className="bg-accent/90 text-accent-foreground border-0 text-[10px] px-1.5 py-0.5 w-fit">
                                Iznajmljivanje
                              </Badge>
                            </div>
                          </div>

                          <div className={`p-3 ${
                            spot.subscriptionType === 'gold'
                              ? 'bg-gradient-to-r from-[#DAA520] via-[#FFD700] to-[#B8860B]'
                              : spot.subscriptionType === 'silver'
                                ? 'bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A9AD]'
                                : ''
                          }`}>
                            <h3 className={`font-semibold text-base mb-2 ${
                              spot.subscriptionType === 'gold' ? 'text-white' 
                              : spot.subscriptionType === 'silver' ? 'text-[#1a1a1a]' 
                              : 'text-card-foreground'
                            }`}>
                              {spot.title}
                            </h3>
                            <div className={`flex items-center mb-3 ${
                              spot.subscriptionType === 'gold' ? 'text-white/80' 
                              : spot.subscriptionType === 'silver' ? 'text-[#333]' 
                              : 'text-muted-foreground'
                            }`}>
                              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="text-xs line-clamp-1">{spot.address}</span>
                            </div>

                            <div className="flex flex-wrap gap-1 mb-3">
                              {spot.hasEvCharging && (
                                <Badge variant="outline" className={`text-xs ${
                                  spot.subscriptionType === 'gold' ? 'border-white/40 text-white' 
                                  : spot.subscriptionType === 'silver' ? 'border-[#555]/40 text-[#333]' 
                                  : ''
                                }`}>
                                  <Zap className="w-3 h-3 mr-1" />
                                  EV
                                </Badge>
                              )}
                              {spot.hasSecurityCamera && (
                                <Badge variant="outline" className={`text-xs ${
                                  spot.subscriptionType === 'gold' ? 'border-white/40 text-white' 
                                  : spot.subscriptionType === 'silver' ? 'border-[#555]/40 text-[#333]' 
                                  : ''
                                }`}>
                                  <Camera className="w-3 h-3 mr-1" />
                                  Kamera
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <span className={`text-xl font-bold ${
                                  spot.subscriptionType === 'gold' ? 'text-white' 
                                  : spot.subscriptionType === 'silver' ? 'text-[#1a1a1a]' 
                                  : 'text-accent'
                                }`}>
                                  {spot.pricePerHour}
                                </span>
                                <span className={`text-xs ml-1 ${
                                  spot.subscriptionType === 'gold' ? 'text-white/70' 
                                  : spot.subscriptionType === 'silver' ? 'text-[#444]' 
                                  : 'text-muted-foreground'
                                }`}>
                                  {spot.currency}/{spot.pricingType === 'hourly' ? 'sat' : spot.pricingType === 'daily' ? 'dan' : spot.pricingType === 'weekly' ? 'ned' : spot.pricingType === 'monthly' ? 'mes' : 'sat'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    );
                  }
                })}
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
