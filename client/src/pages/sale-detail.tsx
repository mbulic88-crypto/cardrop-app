import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, ArrowLeft, Sparkles, Maximize2, Tag, Building2, ShoppingBag, Eye, EyeOff, User, Ruler, Hash, Wrench, Zap, Droplets, Thermometer, Camera, DoorOpen, Radio } from "lucide-react";
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

const featureConfig: Record<string, { label: string; icon: typeof Zap }> = {
  electricity: { label: "Struja", icon: Zap },
  water: { label: "Voda", icon: Droplets },
  heating: { label: "Grejanje", icon: Thermometer },
  camera: { label: "Kamera", icon: Camera },
  ramp: { label: "Rampa", icon: DoorOpen },
  remote_control: { label: "Daljinski", icon: Radio },
};

export default function SaleDetail() {
  const [, params] = useRoute("/sale/:id");
  const listingId = params?.id;
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showContact, setShowContact] = useState(false);

  const { data: listing, isLoading } = useQuery<SalesListing>({
    queryKey: ["/api/sales-listings", listingId],
    enabled: !!listingId,
  });

  const { data: seller } = useQuery<UserType>({
    queryKey: ["/api/users", listing?.sellerId],
    enabled: !!listing?.sellerId,
  });

  const renderHeader = () => (
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
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {renderHeader()}
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
        {renderHeader()}
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
  const pricePerSqm = parseFloat(listing.area) > 0
    ? (parseFloat(listing.price) / parseFloat(listing.area)).toFixed(0)
    : "0";

  const tierBorderClass = listing.subscriptionType === 'gold'
    ? 'border-2 border-[#DAA520] ring-2 ring-[#DAA520]/20'
    : listing.subscriptionType === 'silver'
      ? 'border-2 border-[#A8A9AD] ring-2 ring-[#A8A9AD]/20'
      : '';

  const priceColorClass = listing.subscriptionType === 'gold'
    ? 'text-[#B8860B] dark:text-[#FFD700]'
    : listing.subscriptionType === 'silver'
      ? 'text-[#71706E] dark:text-[#C0C0C0]'
      : 'text-accent';

  return (
    <div className="min-h-screen bg-background">
      {renderHeader()}

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* 1. IMAGE GALLERY */}
        <Card className={`overflow-hidden relative ${tierBorderClass}`}>
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
                      className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
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

        {/* 2. PRICE + KEY INFO BAR */}
        <Card className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-sale-title">
                {listing.title}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span data-testid="text-sale-address">{listing.address}</span>
                {listing.city && (
                  <Badge variant="outline" className="text-xs">{listing.city}</Badge>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <span className={`text-3xl font-bold ${priceColorClass}`} data-testid="text-sale-price">
                {parseFloat(listing.price).toLocaleString()} EUR
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">{pricePerSqm} EUR/m²</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/50">
              <Maximize2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Površina</p>
                <p className="text-sm font-medium text-foreground">{listing.area} m²</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/50">
              <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Tip</p>
                <p className="text-sm font-medium text-foreground">{propertyTypeLabels[listing.propertyType] || listing.propertyType}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/50">
              <Wrench className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Stanje</p>
                <p className="text-sm font-medium text-foreground">{conditionLabels[listing.condition] || listing.condition}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/50">
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Oglašivač</p>
                <p className="text-sm font-medium text-foreground">{advertiserTypeLabels[listing.advertiserType] || listing.advertiserType}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* 3. DETAILS: Description + Features */}
        {(listing.description || (listing.features && listing.features.length > 0) || listing.numberOfSpots) && (
          <Card className="p-5 space-y-5">
            {listing.numberOfSpots && (
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  Broj parking mesta: <span className="font-medium">{listing.numberOfSpots}</span>
                </span>
              </div>
            )}

            {listing.description && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Opis</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed" data-testid="text-sale-description">
                  {listing.description}
                </p>
              </div>
            )}

            {listing.features && listing.features.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Karakteristike</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {listing.features.map((feature) => {
                    const config = featureConfig[feature];
                    const IconComp = config?.icon || Zap;
                    return (
                      <div key={feature} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                        <IconComp className="w-4 h-4 text-accent flex-shrink-0" />
                        <span className="text-sm text-foreground">{config?.label || feature}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* 4. CONTACT - Hidden behind click */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Kontakt prodavca</h3>

          {!showContact ? (
            <Button
              className="w-full"
              onClick={() => setShowContact(true)}
              data-testid="button-show-contact"
            >
              <Eye className="w-4 h-4 mr-2" />
              Prikaži kontakt
            </Button>
          ) : (
            <div className="space-y-3">
              {seller && (
                <div className="flex items-center gap-2 text-foreground">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium" data-testid="text-seller-name">
                    {seller.firstName} {seller.lastName}
                  </span>
                </div>
              )}
              <a href={`tel:${listing.phone}`} className="block">
                <Button className="w-full" data-testid="button-call-seller">
                  <Phone className="w-4 h-4 mr-2" />
                  {listing.phone}
                </Button>
              </a>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setShowContact(false)}
                data-testid="button-hide-contact"
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Sakrij kontakt
              </Button>
            </div>
          )}
        </Card>

        {/* 5. BACK BUTTON */}
        <Link href="/home">
          <Button variant="outline" className="w-full" data-testid="button-back-to-list">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Nazad na listu
          </Button>
        </Link>
      </div>
    </div>
  );
}
