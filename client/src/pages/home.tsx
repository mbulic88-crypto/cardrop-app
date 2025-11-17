import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Search, SlidersHorizontal, X, Calendar, Clock, Zap, Camera, Shield, Home as HomeIcon, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ParkingSpot } from "@shared/schema";
import { Link } from "wouter";
import { MapView } from "@/components/MapView";
import { StaticMapImage } from "@/components/StaticMapImage";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";

const serbianCities = [
  "Svi Gradovi",
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

  const { data: spots = [], isLoading } = useQuery<ParkingSpot[]>({
    queryKey: ["/api/parking-spots"],
  });

  const filteredSpots = spots.filter((spot) => {
    const matchesLocation = !searchLocation || 
      spot.address.toLowerCase().includes(searchLocation.toLowerCase()) ||
      spot.title.toLowerCase().includes(searchLocation.toLowerCase());
    
    const matchesCity = selectedCity === "Svi Gradovi" ||
      spot.address.toLowerCase().includes(selectedCity.toLowerCase());
    
    const price = parseFloat(spot.pricePerHour);
    const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
    
    const matchesType = spotType === "all" || spot.spotType === spotType;
    
    return matchesLocation && matchesCity && matchesPrice && matchesType && spot.isActive;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Top Row: Logo, City Filter, Filters Button */}
          <div className="flex items-center justify-between gap-4 mb-3">
            <Link href="/home" className="flex items-center gap-2">
              <img src={parkInLogo} alt="ParkIN" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground hidden sm:inline">ParkIN</span>
            </Link>

            <div className="flex items-center gap-2">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-[140px] md:w-[180px]" data-testid="select-city-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serbianCities.map((city) => (
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
              >
                <SlidersHorizontal className="w-5 h-5" />
              </Button>

              <Link href="/">
                <Button
                  variant="outline"
                  data-testid="button-home"
                >
                  <HomeIcon className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Početna</span>
                </Button>
              </Link>
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
            <Link href="/my-bookings">
              <Button variant="outline" data-testid="link-my-bookings">
                <Calendar className="w-4 h-4 mr-2" />
                Moje Rezervacije
              </Button>
            </Link>
            <Link href="/transactions">
              <Button variant="outline" data-testid="link-transactions">
                <Shield className="w-4 h-4 mr-2" />
                Transakcije
              </Button>
            </Link>
            <Link href="/add-spot">
              <Button data-testid="link-add-spot">
                <Zap className="w-4 h-4 mr-2" />
                Dodaj Mesto
              </Button>
            </Link>
          </div>
        </div>

        {/* View Mode Toggle for Mobile */}
        <div className="md:hidden mb-4 flex gap-2">
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
              <Card className="p-12 text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-card-foreground">
                  Nema Rezultata
                </h3>
                <p className="text-muted-foreground">
                  Pokušajte da promenite filter ili pretragu
                </p>
              </Card>
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
    </div>
  );
}
