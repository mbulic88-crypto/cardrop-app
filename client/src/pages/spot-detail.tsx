import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { MapPin, ArrowLeft, Zap, Camera, Clock, Shield, User, Home as HomeIcon, Globe, Star, MessageSquare } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import type { ParkingSpot, User as UserType, Booking, Review } from "@shared/schema";
import { Link } from "wouter";
import { format } from "date-fns";
import { sr } from "date-fns/locale";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";

export default function SpotDetail() {
  const [, params] = useRoute("/spot/:id");
  const spotId = params?.id;
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [showLoginDialog, setShowLoginDialog] = useState(false);

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

  const [, setLocation] = useLocation();

  const bookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      return await apiRequest("POST", "/api/bookings", bookingData);
    },
    onSuccess: (data) => {
      toast({
        title: "Rezervacija Poslata",
        description: "Preusmeravanje na plaćanje...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      // Redirect to payment page
      setTimeout(() => {
        setLocation(`/payment/${data.id}`);
      }, 500);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Greška",
        description: "Došlo je do greške prilikom rezervacije. Pokušajte ponovo.",
        variant: "destructive",
      });
    },
  });

  const calculateTotalPrice = () => {
    if (!spot || !selectedDate || !startTime || !endTime) return 0;
    
    const start = new Date(selectedDate);
    const [startHour, startMin] = startTime.split(":").map(Number);
    start.setHours(startHour, startMin);
    
    const end = new Date(selectedDate);
    const [endHour, endMin] = endTime.split(":").map(Number);
    end.setHours(endHour, endMin);
    
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return hours * parseFloat(spot.pricePerHour);
  };

  const handleBooking = () => {
    if (!spot || !selectedDate || !startTime || !endTime) return;
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
    
    const start = new Date(selectedDate);
    const [startHour, startMin] = startTime.split(":").map(Number);
    start.setHours(startHour, startMin);
    
    const end = new Date(selectedDate);
    const [endHour, endMin] = endTime.split(":").map(Number);
    end.setHours(endHour, endMin);
    
    const totalPrice = calculateTotalPrice();
    
    bookingMutation.mutate({
      spotId: spot.id,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      totalPrice: totalPrice.toFixed(2),
      currency: spot.currency,
      status: "pending",
      paymentStatus: "pending",
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

  const totalPrice = calculateTotalPrice();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link href="/home" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground hidden sm:inline">ParkShare</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link href="/home">
                <Button variant="outline" data-testid="button-home">
                  <HomeIcon className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Početna</span>
                </Button>
              </Link>

              <Button variant="outline" data-testid="button-language">
                <Globe className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">ENG</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Image Gallery */}
        <div className="mb-8">
          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
            {spot.imageUrls && spot.imageUrls.length > 0 ? (
              <img
                src={spot.imageUrls[0]}
                alt={spot.title}
                className="w-full h-full object-cover"
                data-testid="img-spot-main"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="w-24 h-24 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

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

            {/* Owner Info */}
            {owner && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-card-foreground">Vlasnik</h2>
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

          {/* Right Column - Booking Widget */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card className="p-6">
              <div className="mb-6">
                <div className="text-3xl font-bold text-accent mb-1" data-testid="text-price">
                  {spot.pricePerHour} {spot.currency}
                  <span className="text-base text-muted-foreground font-normal">/sat</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block text-foreground">
                    Datum
                  </label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                    data-testid="calendar-booking-date"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block text-foreground">
                      Početak
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground"
                      data-testid="input-start-time"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block text-foreground">
                      Kraj
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground"
                      data-testid="input-end-time"
                    />
                  </div>
                </div>

                {totalPrice > 0 && (
                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Ukupno:</span>
                      <span className="text-xl font-bold text-accent" data-testid="text-total-price">
                        {totalPrice.toFixed(2)} {spot.currency}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleBooking}
                  disabled={!selectedDate || !startTime || !endTime || bookingMutation.isPending}
                  data-testid="button-book-now"
                >
                  {bookingMutation.isPending ? "Rezervisanje..." : "Rezerviši Sada"}
                </Button>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>Sigurno plaćanje preko Monri</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Login Required Dialog */}
      <LoginRequiredDialog
        open={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        message="Za rezervaciju parking mesta potrebna je prijava na nalog."
        redirectPath={`/spot/${spotId}`}
      />
    </div>
  );
}
