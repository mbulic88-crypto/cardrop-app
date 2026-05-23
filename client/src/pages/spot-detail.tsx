import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MapPin, Zap, Camera, Clock, Home as HomeIcon, Star, MessageSquare, Phone, CreditCard, Send, ChevronLeft, ChevronRight, Eye, EyeOff, Lock, MessageCircle, X, Car, Loader2 } from "lucide-react";
import { SiViber, SiWhatsapp } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import type { ParkingSpot, User as UserType, Review } from "@shared/schema";
import { Link } from "wouter";
import { format, startOfDay } from "date-fns";
import { sr } from "date-fns/locale";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { SpotLocationMap } from "@/components/SpotLocationMap";
import { trackViewContent, trackContact } from "@/lib/metaPixel";

function formatPhoneForMessaging(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+381' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

export default function SpotDetail() {
  const [, params] = useRoute("/spot/:id");
  const spotId = params?.id;
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showOwnerContact, setShowOwnerContact] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Booking panel state
  const [showBookingPanel, setShowBookingPanel] = useState(false);
  const [licensePlate, setLicensePlate] = useState("");
  const [bookingStartDate, setBookingStartDate] = useState<Date | undefined>(undefined);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(9);
  const [dailyStartHour, setDailyStartHour] = useState(0);
  const [numMonths, setNumMonths] = useState(1);


  const { data: spot, isLoading } = useQuery<ParkingSpot>({
    queryKey: ["/api/parking-spots", spotId],
    enabled: !!spotId,
  });

  useEffect(() => {
    if (spot) {
      trackViewContent({
        content_name: spot.title,
        content_category: spot.category || 'parking',
        content_type: 'parking_spot',
        value: spot.pricePerHour ? Number(spot.pricePerHour) : undefined,
        currency: 'RSD',
      });
    }
  }, [spot?.id]);

  const { data: owner } = useQuery<UserType>({
    queryKey: ["/api/users", spot?.ownerId],
    enabled: !!spot?.ownerId,
  });

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/reviews/spot", spotId],
    enabled: !!spotId,
  });

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const { data: availability = [] } = useQuery<{ startTime: string; endTime: string }[]>({
    queryKey: ["/api/spots", spotId, "availability"],
    queryFn: async () => {
      const res = await fetch(`/api/spots/${spotId}/availability`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!spotId && showBookingPanel,
  });

  const isDateBooked = (date: Date): boolean => {
    const slotStart = new Date(startOfDay(date));
    slotStart.setHours(dailyStartHour, 0, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + 24 * 60 * 60 * 1000);
    return availability.some(({ startTime, endTime }) => {
      const s = new Date(startTime); const e = new Date(endTime);
      return s < slotEnd && e > slotStart;
    });
  };

  const isDayFullyBooked = (date: Date): boolean => {
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return availability.some(({ startTime, endTime }) => {
      const s = new Date(startTime); const e = new Date(endTime);
      return s <= dayStart && e >= dayEnd;
    });
  };

  const getBookedHoursForDay = (date: Date | undefined): Set<number> => {
    if (!date) return new Set();
    const dayStart = startOfDay(date);
    const bookedHours = new Set<number>();
    availability.forEach(({ startTime, endTime }) => {
      const s = new Date(startTime); const e = new Date(endTime);
      const periodStart = Math.max(s.getTime(), dayStart.getTime());
      const periodEnd = Math.min(e.getTime(), dayStart.getTime() + 24 * 60 * 60 * 1000);
      if (periodStart < periodEnd) {
        const startH = Math.floor((periodStart - dayStart.getTime()) / (60 * 60 * 1000));
        const endH = Math.ceil((periodEnd - dayStart.getTime()) / (60 * 60 * 1000));
        for (let h = startH; h < endH; h++) bookedHours.add(h);
      }
    });
    return bookedHours;
  };

  const calculatedPrice = useMemo(() => {
    if (!spot) return 0;
    const price = Number(spot.pricePerHour);
    if (spot.pricingType === "hourly") {
      const hours = endHour - startHour;
      return hours > 0 && bookingStartDate ? Math.round(hours * price * 100) / 100 : 0;
    } else if (spot.pricingType === "daily") {
      return bookingStartDate ? price : 0;
    } else {
      return numMonths * price;
    }
  }, [spot, bookingStartDate, startHour, endHour, numMonths]);

  function getBookingTimes(): { startTime: Date; endTime: Date } {
    const base = bookingStartDate || new Date();
    if (spot?.pricingType === "hourly") {
      const start = new Date(base); start.setHours(startHour, 0, 0, 0);
      const end = new Date(base); end.setHours(endHour, 0, 0, 0);
      return { startTime: start, endTime: end };
    } else if (spot?.pricingType === "daily") {
      const start = new Date(base); start.setHours(dailyStartHour, 0, 0, 0);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      return { startTime: start, endTime: end };
    } else {
      const start = new Date(base); start.setDate(1); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setMonth(end.getMonth() + numMonths);
      end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 0);
      return { startTime: start, endTime: end };
    }
  }

  const bookingCheckoutMutation = useMutation({
    mutationFn: async () => {
      const { startTime, endTime } = getBookingTimes();
      return await apiRequest("POST", "/api/stripe/create-booking-checkout", {
        spotId: spot!.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        licensePlate,
      });
    },
    onSuccess: (data: { url?: string }) => {
      if (data?.url) window.location.href = data.url;
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) { setShowLoginDialog(true); return; }
      const msg = (error as any)?.message || "";
      if (msg.includes("već rezervisan") || (error as any)?.status === 409) {
        toast({ title: "Termin zauzet", description: "Izabrani termin je već rezervisan. Izaberite drugi datum.", variant: "destructive" });
        return;
      }
      toast({ title: "Greška", description: "Nije moguće pokrenuti plaćanje. Pokušajte ponovo.", variant: "destructive" });
    },
  });

  const messageMutation = useMutation({
    mutationFn: async (data: { receiverId: string; spotId: string; content: string }) => {
      return await apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      toast({
        title: "Poruka Poslata",
        description: "Vlasnik će dobiti obaveštenje o vašoj poruci.",
      });
      setMessageContent("");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        setShowLoginDialog(true);
        return;
      }
      toast({
        title: "Greška",
        description: "Nije moguće poslati poruku. Pokušajte ponovo.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!spot || !messageContent.trim()) return;
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
    messageMutation.mutate({
      receiverId: spot.ownerId,
      spotId: spot.id,
      content: messageContent.trim(),
    });
  };

  const [, setLocation] = useLocation();

  const imageCount = spot?.imageUrls?.length || 0;

  const scrollToImage = (index: number) => {
    if (!carouselRef.current) return;
    const newIndex = Math.max(0, Math.min(index, imageCount - 1));
    setCurrentImageIndex(newIndex);
    const scrollWidth = carouselRef.current.scrollWidth / imageCount;
    carouselRef.current.scrollTo({ left: scrollWidth * newIndex, behavior: 'smooth' });
  };

  const handleCarouselScroll = () => {
    if (!carouselRef.current || imageCount === 0) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const scrollWidth = carouselRef.current.scrollWidth / imageCount;
    const newIndex = Math.round(scrollLeft / scrollWidth);
    setCurrentImageIndex(Math.max(0, Math.min(newIndex, imageCount - 1)));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-96 bg-muted rounded-lg mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-24 bg-muted rounded" />
              </div>
              <div className="h-96 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!spot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Mesto Nije Pronađeno</h3>
          <Link href="/home">
            <Button className="mt-4">Nazad na Početnu</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-1 xs:px-2 sm:px-4 py-2.5 xs:py-3 sm:py-4">
          <div className="flex items-center justify-between gap-1 xs:gap-2">
            <Link href="/home" className="flex items-center gap-1.5 xs:gap-2">
              <img src={parkInLogo} alt="CarDrop" className="w-7 xs:w-8 h-7 xs:h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground hidden sm:inline">CarDrop</span>
            </Link>

            <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
              <Link href="/home">
                <Button variant="outline" size="icon" className="h-8 w-8 xs:h-9 xs:w-9 sm:w-auto sm:px-3" data-testid="button-home">
                  <HomeIcon className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Početna</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Image Carousel - at the top */}
        <div className="mb-8">
          {spot.imageUrls && spot.imageUrls.length > 0 ? (
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <div
                ref={carouselRef}
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' }}
                onScroll={handleCarouselScroll}
                data-testid="image-carousel"
              >
                {spot.imageUrls.map((imageUrl, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-full snap-center"
                  >
                    <div className="aspect-video">
                      <img
                        src={imageUrl}
                        alt={`${spot.title} - Slika ${index + 1}`}
                        className="w-full h-full object-cover"
                        data-testid={`img-spot-gallery-${index}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {imageCount > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-card/80 backdrop-blur-sm border-card-border"
                    onClick={() => scrollToImage(currentImageIndex - 1)}
                    style={{ visibility: currentImageIndex > 0 ? 'visible' : 'hidden' }}
                    data-testid="button-carousel-prev"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-card/80 backdrop-blur-sm border-card-border"
                    onClick={() => scrollToImage(currentImageIndex + 1)}
                    style={{ visibility: currentImageIndex < imageCount - 1 ? 'visible' : 'hidden' }}
                    data-testid="button-carousel-next"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {spot.imageUrls.map((_, index) => (
                      <button
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentImageIndex
                            ? 'bg-white w-4'
                            : 'bg-white/50'
                        }`}
                        onClick={() => scrollToImage(index)}
                        data-testid={`button-carousel-dot-${index}`}
                      />
                    ))}
                  </div>

                  <div className="absolute top-3 right-3">
                    <Badge className="bg-card/80 backdrop-blur-sm text-card-foreground border-card-border">
                      {currentImageIndex + 1} / {imageCount}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              <MapPin className="w-24 h-24 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Price - prominently right below images */}
        <div className="mb-6" data-testid="price-banner">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl font-bold text-accent" data-testid="text-price-main">
              {spot.pricePerHour} {spot.currency}
            </span>
            <span className="text-lg text-muted-foreground">
              / {spot.pricingType === 'hourly' ? 'sat' : spot.pricingType === 'monthly' ? 'mesec' : 'dan'}
            </span>
          </div>
          <div className="mt-3">
            <Button
              className="bg-accent text-accent-foreground gap-2 w-full sm:w-auto"
              onClick={() => {
                if (!isAuthenticated && spot.stripeLinkActive) { setShowLoginDialog(true); return; }
                if (!spot.stripeLinkActive) return;
                setShowBookingPanel(true);
              }}
              data-testid="button-rezervisi"
            >
              <CreditCard className="w-4 h-4" />
              Plati ili rezerviši parking
            </Button>

            {!spot.stripeLinkActive && (
              <p className="text-xs text-muted-foreground mt-2" data-testid="text-payment-inactive">
                Za ovaj parking nije aktivno online plaćanje. Kontaktirajte vlasnika.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h1 className="text-3xl font-bold mb-2 text-foreground" data-testid="text-spot-title">
                    {spot.title}
                  </h1>
                  {spot.parkingNumber && (
                    <Badge className="font-mono bg-accent/15 text-accent border-accent/30 mb-2" data-testid="badge-parking-number-title">{spot.parkingNumber}</Badge>
                  )}
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="w-5 h-5 mr-2" />
                    <span data-testid="text-spot-address">{spot.address}</span>
                  </div>
                </div>
                <Badge className="bg-accent text-accent-foreground">
                  {spot.spotType === "covered" ? "Pokriveno" : spot.spotType === "garage" ? "Garaža" : "Nepokriveno"}
                </Badge>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-3 mb-6">
                {spot.hasEvCharging && (
                  <Badge variant="outline">
                    <Zap className="w-4 h-4 mr-1" />
                    EV Punjač
                  </Badge>
                )}
                {spot.hasSecurityCamera && (
                  <Badge variant="outline">
                    <Camera className="w-4 h-4 mr-1" />
                    Sigurnosna Kamera
                  </Badge>
                )}
                {spot.is24Hours && (
                  <Badge variant="outline">
                    <Clock className="w-4 h-4 mr-1" />
                    Dostupno 24/7
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-3 text-card-foreground">Opis</h2>
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-spot-description">
                {spot.description}
              </p>
            </Card>

            {/* Kontakt Vlasnika - Collapsible */}
            {owner && (
              <Card className="p-6">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => {
                    if (!showOwnerContact) {
                      trackContact({ content_name: spot.title, content_category: 'parking_spot' });
                    }
                    setShowOwnerContact(!showOwnerContact);
                  }}
                  data-testid="button-toggle-owner-contact"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <Phone className="w-5 h-5" />
                    Kontakt Vlasnika
                  </span>
                  {showOwnerContact ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>

                {showOwnerContact && (
                  <div className="mt-4 space-y-4" data-testid="owner-contact-details">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={owner.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {owner.firstName?.[0]}{owner.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-card-foreground">
                          {owner.firstName} {owner.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{owner.email}</p>
                      </div>
                    </div>
                    
                    {spot.phone && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Phone className="w-5 h-5 text-accent" />
                          <a 
                            href={`tel:${spot.phone}`} 
                            className="text-accent hover:underline font-medium"
                            data-testid="link-phone"
                          >
                            {spot.phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={`viber://chat?number=${encodeURIComponent(formatPhoneForMessaging(spot.phone))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="link-viber"
                          >
                            <Button variant="outline" size="sm">
                              <SiViber className="w-4 h-4 mr-1.5" style={{ color: '#7360F2' }} />
                              Viber
                            </Button>
                          </a>
                          <a
                            href={`https://wa.me/${formatPhoneForMessaging(spot.phone).replace('+', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="link-whatsapp"
                          >
                            <Button variant="outline" size="sm">
                              <SiWhatsapp className="w-4 h-4 mr-1.5" style={{ color: '#25D366' }} />
                              WhatsApp
                            </Button>
                          </a>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-accent" />
                      <span className="text-muted-foreground" data-testid="text-payment-type">
                        Tip plaćanja: {spot.paymentType === 'cash' && 'Keš'}
                        {spot.paymentType === 'bank_transfer' && 'Preko računa'}
                        {spot.paymentType === 'card' && 'Kartično'}
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Send Message to Owner */}
            {owner && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Pošalji Poruku Vlasniku
                </h2>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Napišite poruku vlasniku parking mesta..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    className="min-h-[100px]"
                    data-testid="textarea-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageContent.trim() || messageMutation.isPending}
                    className="w-full"
                    data-testid="button-send-message"
                  >
                    {messageMutation.isPending ? "Slanje..." : "Pošalji Poruku"}
                  </Button>
                </div>
              </Card>
            )}

            {/* Reviews Section */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Star className="w-5 h-5 text-accent" />
                <h3 className="text-xl font-bold text-foreground">
                  Recenzije
                  {averageRating && (
                    <span className="text-accent ml-2">
                      {averageRating} ★
                    </span>
                  )}
                </h3>
                <span className="text-sm text-muted-foreground">
                  ({reviews.length})
                </span>
              </div>

              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Još nema recenzija za ovo parking mesto
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="pb-4 border-b border-border last:border-0"
                      data-testid={`review-${review.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? "fill-accent text-accent"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {review.createdAt && format(new Date(review.createdAt), "dd MMM yyyy", { locale: sr })}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-card-foreground" data-testid={`text-review-comment-${review.id}`}>
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Location Map - at the bottom */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Lokacija
              </h2>
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                {spot.latitude && spot.longitude ? (
                  <SpotLocationMap
                    latitude={spot.latitude}
                    longitude={spot.longitude}
                    title={spot.title}
                    address={spot.address}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-24 h-24 text-muted-foreground" />
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column - Price & Availability */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card className="p-6">
              <div className="mb-6">
                <div className="text-3xl font-bold text-accent mb-1" data-testid="text-price">
                  {spot.pricePerHour} {spot.currency}
                  <span className="text-base text-muted-foreground font-normal">/{spot.pricingType === 'hourly' ? 'sat' : spot.pricingType === 'monthly' ? 'mes' : 'dan'}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block text-foreground">
                  Dostupnost
                </label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                  data-testid="calendar-availability"
                />
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  Kalendar prikazuje dostupnost parking mesta
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Login Required Dialog */}
      <LoginRequiredDialog
        open={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        message="Za slanje poruke vlasniku potrebna je prijava na nalog."
        redirectPath={`/spot/${spotId}`}
      />

      {/* Fullscreen Booking Panel */}
      {showBookingPanel && spot && (() => {
        const bookedHours = getBookedHoursForDay(bookingStartDate);
        const isHourConflict = (from: number, to: number) =>
          Array.from(bookedHours).some(h => h >= from && h < to);
        const pricingLabel = spot.pricingType === "hourly" ? "sat" : spot.pricingType === "monthly" ? "mesec" : "dan";
        return (
          <div className="fixed inset-0 z-[200] bg-background overflow-y-auto">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
              <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
                <Link href="/home" className="flex items-center gap-2 shrink-0">
                  <img src={parkInLogo} alt="CarDrop" className="w-8 h-8 rounded-lg" />
                  <span className="text-lg font-bold text-foreground hidden sm:inline">CarDrop</span>
                </Link>
                <div className="flex-1 min-w-0 text-center">
                  <p className="text-sm font-semibold text-foreground truncate">{spot.title}</p>
                  {spot.parkingNumber && (
                    <p className="text-xs text-accent font-mono">{spot.parkingNumber}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBookingPanel(false)}
                  data-testid="button-close-booking"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </header>

            <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
              {/* Spot summary */}
              <div className="flex items-center justify-between gap-3 p-4 rounded-md border border-border bg-card">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{spot.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{spot.address}</p>
                  {owner && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Vlasnik: {owner.firstName} {owner.lastName}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-accent">{spot.pricePerHour} {spot.currency}</p>
                  <p className="text-xs text-muted-foreground">/ {pricingLabel}</p>
                </div>
              </div>

              {/* License plate */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Car className="h-4 w-4 text-accent" />
                  Registarska tablica
                </label>
                <div className="rounded-md border-2 border-border focus-within:border-accent transition-colors bg-card overflow-hidden">
                  <div className="flex items-center">
                    <div className="flex flex-col items-center justify-center border-r border-border px-3 py-3 bg-blue-700 dark:bg-blue-800 shrink-0">
                      <span className="text-[10px] font-bold text-white tracking-widest">SRB</span>
                    </div>
                    <Input
                      placeholder="NS 123-AB"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                      className="border-0 shadow-none text-center text-xl font-bold tracking-widest uppercase h-12 focus-visible:ring-0 bg-transparent"
                      maxLength={15}
                      data-testid="input-license-plate"
                    />
                    {licensePlate && (
                      <button type="button" className="px-3 text-muted-foreground hover:text-foreground shrink-0" onClick={() => setLicensePlate("")} tabIndex={-1}>
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Monthly */}
              {spot.pricingType === "monthly" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Datum početka</label>
                    <Calendar mode="single" selected={bookingStartDate} onSelect={setBookingStartDate}
                      disabled={(date) => date < startOfDay(new Date()) || isDateBooked(date)}
                      className="rounded-md border border-border w-full" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Broj meseci</label>
                    <Select value={String(numMonths)} onValueChange={(v) => setNumMonths(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 6, 12].map(n => (
                          <SelectItem key={n} value={String(n)}>{n} {n === 1 ? "mesec" : n < 5 ? "meseca" : "meseci"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Daily */}
              {spot.pricingType === "daily" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Datum</label>
                    <Calendar mode="single" selected={bookingStartDate} onSelect={setBookingStartDate}
                      disabled={(date) => date < startOfDay(new Date()) || isDateBooked(date)}
                      className="rounded-md border border-border w-full" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Sat početka</label>
                    <Select value={String(dailyStartHour)} onValueChange={(v) => setDailyStartHour(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => i).map(h => (
                          <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}:00</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Hourly */}
              {spot.pricingType === "hourly" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Dan</label>
                    <Calendar mode="single" selected={bookingStartDate} onSelect={setBookingStartDate}
                      disabled={(date) => date < startOfDay(new Date()) || isDayFullyBooked(date)}
                      className="rounded-md border border-border w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Od sata</label>
                      <Select value={String(startHour)} onValueChange={(v) => { const h = Number(v); setStartHour(h); if (endHour <= h) setEndHour(h + 1); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 23 }, (_, i) => i).map(h => (
                            <SelectItem key={h} value={String(h)} disabled={bookedHours.has(h)}>
                              {String(h).padStart(2, "0")}:00{bookedHours.has(h) ? " ✕" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Do sata</label>
                      <Select value={String(endHour)} onValueChange={(v) => setEndHour(Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 23 }, (_, i) => i + 1).map(h => (
                            <SelectItem key={h} value={String(h)} disabled={h <= startHour || isHourConflict(startHour, h)}>
                              {String(h).padStart(2, "0")}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Total */}
              {calculatedPrice > 0 && (
                <div className="flex justify-between items-center p-4 rounded-md bg-accent/10 border border-accent/20">
                  <span className="text-sm font-medium text-foreground">Ukupno:</span>
                  <span className="text-2xl font-bold text-accent" data-testid="text-total-price">
                    {calculatedPrice.toLocaleString("sr-RS")} {spot.currency}
                  </span>
                </div>
              )}

              <Button
                className="w-full bg-accent text-accent-foreground h-12 text-base"
                onClick={() => {
                  if (!isAuthenticated) { setShowLoginDialog(true); setShowBookingPanel(false); return; }
                  bookingCheckoutMutation.mutate();
                }}
                disabled={bookingCheckoutMutation.isPending || !licensePlate.trim() || calculatedPrice <= 0}
                data-testid="button-nastavi-na-placanje"
              >
                {bookingCheckoutMutation.isPending
                  ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Učitavanje...</>
                  : <><CreditCard className="w-5 h-5 mr-2" />Nastavi na plaćanje</>
                }
              </Button>

              <Button variant="ghost" className="w-full" onClick={() => setShowBookingPanel(false)} data-testid="button-back-to-spot">
                Nazad na parking
              </Button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
