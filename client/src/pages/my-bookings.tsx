import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Clock, MapPin, AlertCircle, Home as HomeIcon, Globe, Star, MessageSquare } from "lucide-react";
import type { Booking, ParkingSpot, Review } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { sr } from "date-fns/locale";
import ReviewDialog from "@/components/ReviewDialog";
import { useAuth } from "@/hooks/useAuth";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";

export default function MyBookings() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setShowLoginDialog(true);
    }
  }, [isAuthenticated, authLoading]);

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: isAuthenticated,
  });

  const upcomingBookings = bookings.filter((b) => {
    const endTime = new Date(b.endTime);
    return endTime >= new Date() && b.status !== "cancelled";
  });

  const pastBookings = bookings.filter((b) => {
    const endTime = new Date(b.endTime);
    return endTime < new Date() || b.status === "cancelled";
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-accent">Potvrđeno</Badge>;
      case "pending":
        return <Badge variant="outline">Na Čekanju</Badge>;
      case "completed":
        return <Badge variant="secondary">Završeno</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Otkazano</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-accent">Plaćeno</Badge>;
      case "pending":
        return <Badge variant="outline">Čeka Plaćanje</Badge>;
      case "refunded":
        return <Badge variant="secondary">Refundirano</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const BookingCard = ({ booking, isPast }: { booking: Booking; isPast: boolean }) => {
    const [showReviewDialog, setShowReviewDialog] = useState(false);
    
    const { data: spot } = useQuery<ParkingSpot>({
      queryKey: ["/api/parking-spots", booking.spotId],
    });

    const { data: existingReview } = useQuery<Review | null>({
      queryKey: ["/api/reviews/booking", booking.id],
      enabled: isPast && booking.paymentStatus === "paid",
    });

    const { data: canReviewData } = useQuery<{ canReview: boolean }>({
      queryKey: ["/api/bookings", booking.id, "can-review"],
      enabled: isPast && booking.paymentStatus === "paid" && !existingReview,
    });

    const canReview = canReviewData?.canReview && !existingReview;
    const hasReview = !!existingReview;

    return (
      <Card className="p-6 hover-elevate" data-testid={`card-booking-${booking.id}`}>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Image */}
          <div className="w-full md:w-48 aspect-video md:aspect-square rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {spot?.imageUrls && spot.imageUrls.length > 0 ? (
              <img
                src={spot.imageUrls[0]}
                alt={spot.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-xl font-semibold mb-1 text-card-foreground">
                  {spot?.title || "Loading..."}
                </h3>
                <div className="flex items-center text-muted-foreground text-sm">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{spot?.address}</span>
                </div>
              </div>
              {getStatusBadge(booking.status)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center text-sm">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="text-card-foreground">
                  {format(new Date(booking.startTime), "dd MMM yyyy", { locale: sr })}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="text-card-foreground">
                  {format(new Date(booking.startTime), "HH:mm")} - {format(new Date(booking.endTime), "HH:mm")}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-card-border">
              <div>
                <div className="text-2xl font-bold text-accent mb-1">
                  {booking.totalPrice} {booking.currency}
                </div>
                {getPaymentStatusBadge(booking.paymentStatus)}
              </div>
              <div className="flex flex-wrap gap-2">
                {spot && (
                  <Link href={`/spot/${spot.id}`}>
                    <Button variant="outline" data-testid={`button-view-spot-${booking.id}`}>
                      Pogledaj Mesto
                    </Button>
                  </Link>
                )}
                {canReview && (
                  <Button
                    onClick={() => setShowReviewDialog(true)}
                    className="bg-accent hover:bg-accent/90"
                    data-testid={`button-review-${booking.id}`}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Ostavi Recenziju
                  </Button>
                )}
                {hasReview && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Recenzija Poslata
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Review Dialog */}
            {spot && (
              <ReviewDialog
                open={showReviewDialog}
                onClose={() => setShowReviewDialog(false)}
                bookingId={booking.id}
                spotTitle={spot.title}
              />
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <>
      <LoginRequiredDialog
        open={showLoginDialog}
        onClose={() => {
          setShowLoginDialog(false);
          setLocation("/");
        }}
        message="Za pregled rezervacija potrebna je prijava na nalog."
        redirectPath="/my-bookings"
      />
      
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">Moje Rezervacije</h1>
          <p className="text-muted-foreground">
            Pregled svih vaših rezervacija parking mesta
          </p>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              Nadolazeće ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">
              Prošle ({pastBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="flex gap-6">
                      <div className="w-48 h-48 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-3">
                        <div className="h-6 bg-muted rounded w-3/4" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                        <div className="h-4 bg-muted rounded w-1/3" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : upcomingBookings.length === 0 ? (
              <Card className="p-12 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-card-foreground">
                  Nema Nadolazećih Rezervacija
                </h3>
                <p className="text-muted-foreground mb-6">
                  Pronađite parking mesto i napravite rezervaciju
                </p>
                <Link href="/home">
                  <Button>Pretražite Parking Mesta</Button>
                </Link>
              </Card>
            ) : (
              upcomingBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} isPast={false} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="flex gap-6">
                      <div className="w-48 h-48 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-3">
                        <div className="h-6 bg-muted rounded w-3/4" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                        <div className="h-4 bg-muted rounded w-1/3" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : pastBookings.length === 0 ? (
              <Card className="p-12 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-card-foreground">
                  Nema Prošlih Rezervacija
                </h3>
                <p className="text-muted-foreground">
                  Vaše prošle rezervacije će se pojaviti ovde
                </p>
              </Card>
            ) : (
              pastBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} isPast={true} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
}
