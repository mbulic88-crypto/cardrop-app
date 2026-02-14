import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, ArrowLeft, Sparkles, Maximize2, Tag, Building2, ShoppingBag } from "lucide-react";
import type { SalesListing, User as UserType } from "@shared/schema";
import { Link } from "wouter";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";

const propertyTypeLabels: Record<string, string> = {
  garage: "Garaža",
  open_parking: "Otvoreni Parking",
  closed_parking: "Zatvoreni Parking",
  truck_parking: "Kamionski Parking",
  building_garage: "Zgradna Garaža",
  warehouse_parking: "Magacinski Parking",
  other: "Ostalo",
};

const conditionLabels: Record<string, string> = {
  new: "Novo",
  used: "Korišćeno",
  renovated: "Renovirano",
};

const advertiserTypeLabels: Record<string, string> = {
  owner: "Vlasnik",
  agency: "Agencija",
  company: "Kompanija",
};

const featureLabels: Record<string, string> = {
  electricity: "Struja",
  water: "Voda",
  heating: "Grejanje",
  camera: "Kamera",
  ramp: "Rampa",
  remote_control: "Daljinski",
};

export default function SaleDetail() {
  const [, params] = useRoute("/sale/:id");
  const listingId = params?.id;
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: listing, isLoading } = useQuery<SalesListing>({
    queryKey: ["/api/sales-listings", listingId],
    enabled: !!listingId,
  });

  const { data: seller } = useQuery<UserType>({
    queryKey: ["/api/users", listing?.sellerId],
    enabled: !!listing?.sellerId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <img src={parkInLogo} alt="CarDrop" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground">CarDrop</span>
            </Link>
          </div>
        </header>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Card className="p-6 animate-pulse">
            <div className="aspect-video bg-muted rounded-lg mb-4" />
            <div className="h-8 bg-muted rounded mb-3" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </Card>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <img src={parkInLogo} alt="CarDrop" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground">CarDrop</span>
            </Link>
          </div>
        </header>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Card className="p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Oglas nije pronađen</h2>
            <p className="text-muted-foreground mb-6">Ovaj oglas ne postoji ili je uklonjen.</p>
            <Link href="/home">
              <Button data-testid="button-back-to-list">Nazad na listu</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const images = listing.imageUrls || [];
  const currentImage = images[selectedImageIndex];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/home">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <img src={parkInLogo} alt="CarDrop" className="w-8 h-8 rounded-lg" />
            <span className="text-xl font-bold text-foreground">CarDrop</span>
          </Link>
          <div className="ml-auto">
            <Badge className="bg-orange-500/90 text-white border-0">
              <Tag className="w-3 h-3 mr-1" />
              Prodaja
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card className={`overflow-hidden relative ${
              listing.subscriptionType === 'gold'
                ? 'border-2 border-[#DAA520] ring-2 ring-[#DAA520]/20'
                : listing.subscriptionType === 'silver'
                  ? 'border-2 border-[#A8A9AD] ring-2 ring-[#A8A9AD]/20'
                  : ''
            }`}>
              {listing.subscriptionType === 'gold' && (
                <div className="absolute top-3 left-3 z-20">
                  <Badge className="bg-gradient-to-r from-[#DAA520] via-[#FFD700] to-[#B8860B] text-white border-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Top Oglas
                  </Badge>
                </div>
              )}
              {listing.subscriptionType === 'silver' && (
                <div className="absolute top-3 left-3 z-20">
                  <Badge className="bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A9AD] text-[#333] border-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Istaknuto
                  </Badge>
                </div>
              )}

              {images.length > 0 ? (
                <div>
                  <div className="aspect-video relative">
                    <img
                      src={currentImage}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                      data-testid="img-sale-main"
                    />
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-2 p-3 overflow-x-auto">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${
                            idx === selectedImageIndex ? 'border-accent' : 'border-transparent'
                          }`}
                          data-testid={`button-thumbnail-${idx}`}
                        >
                          <img src={img} alt={`${listing.title} ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center bg-muted">
                  <ShoppingBag className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </Card>

            {/* Title & Details */}
            <Card className="p-5">
              <h1 className="text-2xl font-bold text-foreground mb-3" data-testid="text-sale-title">
                {listing.title}
              </h1>

              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span data-testid="text-sale-address">{listing.address}</span>
                {listing.city && (
                  <Badge variant="outline">{listing.city}</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-3 mb-5">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {propertyTypeLabels[listing.propertyType] || listing.propertyType}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  {conditionLabels[listing.condition] || listing.condition}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Maximize2 className="w-3 h-3" />
                  {listing.area} m²
                </Badge>
                {listing.numberOfSpots && (
                  <Badge variant="outline">
                    {listing.numberOfSpots} {listing.numberOfSpots === 1 ? 'mesto' : 'mesta'}
                  </Badge>
                )}
              </div>

              {listing.description && (
                <div className="mb-5">
                  <h3 className="text-sm font-medium text-foreground mb-2">Opis</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-sale-description">
                    {listing.description}
                  </p>
                </div>
              )}

              {listing.features && listing.features.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Karakteristike</h3>
                  <div className="flex flex-wrap gap-2">
                    {listing.features.map((feature) => (
                      <Badge key={feature} variant="outline">
                        {featureLabels[feature] || feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Price Card */}
            <Card className="p-5">
              <div className="text-center mb-4">
                <span className={`text-3xl font-bold ${
                  listing.subscriptionType === 'gold' ? 'text-[#B8860B] dark:text-[#FFD700]'
                  : listing.subscriptionType === 'silver' ? 'text-[#71706E] dark:text-[#C0C0C0]'
                  : 'text-accent'
                }`} data-testid="text-sale-price">
                  {parseFloat(listing.price).toLocaleString()} EUR
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Površina</span>
                  <span className="text-foreground font-medium">{listing.area} m²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cena po m²</span>
                  <span className="text-foreground font-medium">
                    {(parseFloat(listing.price) / parseFloat(listing.area)).toFixed(0)} EUR/m²
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tip</span>
                  <span className="text-foreground font-medium">
                    {propertyTypeLabels[listing.propertyType] || listing.propertyType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stanje</span>
                  <span className="text-foreground font-medium">
                    {conditionLabels[listing.condition] || listing.condition}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Oglašivač</span>
                  <span className="text-foreground font-medium">
                    {advertiserTypeLabels[listing.advertiserType] || listing.advertiserType}
                  </span>
                </div>
              </div>
            </Card>

            {/* Contact Card */}
            <Card className="p-5">
              <h3 className="text-sm font-medium text-foreground mb-3">Kontakt</h3>
              {seller && (
                <p className="text-foreground font-medium mb-2" data-testid="text-seller-name">
                  {seller.firstName} {seller.lastName}
                </p>
              )}
              <a href={`tel:${listing.phone}`}>
                <Button className="w-full" data-testid="button-call-seller">
                  <Phone className="w-4 h-4 mr-2" />
                  {listing.phone}
                </Button>
              </a>
            </Card>

            {/* Back Button */}
            <Link href="/home">
              <Button variant="outline" className="w-full" data-testid="button-back-to-list">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Nazad na listu
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
