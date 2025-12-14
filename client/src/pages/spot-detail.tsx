import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Zap, Camera, Clock, Home as HomeIcon, Star, MessageSquare, Phone, CreditCard, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import type { ParkingSpot, User as UserType, Review } from "@shared/schema";
import { Link } from "wouter";
import { format } from "date-fns";
import { sr } from "date-fns/locale";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { SpotLocationMap } from "@/components/SpotLocationMap";

export default function SpotDetail() {
  const [, params] = useRoute("/spot/:id");
  const spotId = params?.id;
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [messageContent, setMessageContent] = useState("");

  const { data: spot, isLoading } = useQuery<ParkingSpot>({
    queryKey: ["/api/parking-spots", spotId],
    enabled: !!spotId,
  });

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
              <img src={parkInLogo} alt="ParkIN" className="w-7 xs:w-8 h-7 xs:h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground hidden sm:inline">ParkIN</span>
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
        {/* Location Map */}
        <div className="mb-8">
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
        </div>

        {/* Image Gallery */}
        {spot.imageUrls && spot.imageUrls.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Galerija Slika</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {spot.imageUrls.map((imageUrl, index) => (
                <div key={index} className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={imageUrl}
                    alt={`${spot.title} - Slika ${index + 1}`}
                    className="w-full h-full object-cover"
                    data-testid={`img-spot-gallery-${index}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2 text-foreground" data-testid="text-spot-title">
                    {spot.title}
                  </h1>
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

            {/* Kontakt Vlasnika - Combined Section */}
            {owner && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-2 text-card-foreground">Kontakt Vlasnika</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Kontaktirajte vlasnika za rezervaciju ovog parking mesta
                </p>
                
                {/* Owner info with avatar */}
                <div className="flex items-center gap-4 mb-4">
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
                
                {/* Phone */}
                {spot.phone && (
                  <div className="flex items-center gap-3 mb-3">
                    <Phone className="w-5 h-5 text-accent" />
                    <a 
                      href={`tel:${spot.phone}`} 
                      className="text-accent hover:underline font-medium"
                      data-testid="link-phone"
                    >
                      {spot.phone}
                    </a>
                  </div>
                )}
                
                {/* Payment type */}
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-accent" />
                  <span className="text-muted-foreground" data-testid="text-payment-type">
                    Tip plaćanja: {spot.paymentType === 'cash' && 'Keš'}
                    {spot.paymentType === 'bank_transfer' && 'Preko računa'}
                    {spot.paymentType === 'card_monri' && 'Kartično'}
                  </span>
                </div>
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
          </div>

          {/* Right Column - Price & Availability */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card className="p-6">
              <div className="mb-6">
                <div className="text-3xl font-bold text-accent mb-1" data-testid="text-price">
                  {spot.pricePerHour} {spot.currency}
                  <span className="text-base text-muted-foreground font-normal">/sat</span>
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
    </div>
  );
}
