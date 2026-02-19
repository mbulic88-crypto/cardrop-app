import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CheckCircle, XCircle, Loader2, ArrowLeft, Shield } from "lucide-react";
import type { Booking, ParkingSpot } from "@shared/schema";
import { Link } from "wouter";
import { format } from "date-fns";
import { sr } from "date-fns/locale";

export default function Payment() {
  const [, params] = useRoute("/payment/:bookingId");
  const bookingId = params?.bookingId;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [paymentStatus, setPaymentStatus] = useState<'processing' | 'success' | 'failed'>('processing');

  const { data: booking } = useQuery<Booking>({
    queryKey: ["/api/bookings", bookingId],
    enabled: !!bookingId,
  });

  const { data: spot } = useQuery<ParkingSpot>({
    queryKey: ["/api/parking-spots", booking?.spotId],
    enabled: !!booking?.spotId,
  });

  const paymentMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await apiRequest("POST", "/api/payments/monri/create", {
        bookingId,
        amount: booking?.totalPrice,
        currency: booking?.currency,
      });
    },
    onSuccess: async (response) => {
      // In production, this would redirect to actual Monri payment page
      // For now, simulate payment processing
      setTimeout(() => {
        confirmPayment.mutate(bookingId!);
      }, 2000);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      setPaymentStatus('failed');
      toast({
        title: "Greška Plaćanja",
        description: "Došlo je do greške prilikom obrade plaćanja.",
        variant: "destructive",
      });
    },
  });

  const confirmPayment = useMutation({
    mutationFn: async (bookingId: string) => {
      // Simulate payment confirmation
      return await apiRequest("POST", "/api/payments/monri/callback", {
        order_number: `PARK-${bookingId}-${Date.now()}`,
        status: "approved",
        transaction_id: `TRANS-${Date.now()}`,
      });
    },
    onSuccess: () => {
      setPaymentStatus('success');
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Plaćanje Uspešno",
        description: "Vaša rezervacija je potvrđena!",
      });
    },
    onError: () => {
      setPaymentStatus('failed');
    },
  });

  useEffect(() => {
    if (bookingId && booking) {
      paymentMutation.mutate(bookingId);
    }
  }, [bookingId, booking]);

  if (!booking || !spot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8">
          <Loader2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-spin" />
          <p className="text-center text-muted-foreground">Učitavanje...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-1 xs:px-2 sm:px-4 py-2.5 xs:py-3 sm:py-4">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="h-8 w-8 xs:h-9 xs:w-9 sm:w-auto sm:px-3" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nazad</span>
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card className="p-8">
          {paymentStatus === 'processing' && (
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-accent mx-auto mb-6 animate-spin" />
              <h2 className="text-2xl font-bold mb-3 text-card-foreground">
                Obrada Plaćanja
              </h2>
              <p className="text-muted-foreground mb-6">
                Molimo sačekajte dok obrađujemo vašu uplatu...
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Sigurno plaćanje preko Monri sistema</span>
              </div>
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-accent" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-card-foreground">
                Plaćanje Uspešno!
              </h2>
              <p className="text-muted-foreground mb-8">
                Vaša rezervacija je potvrđena. Proverite email za detalje.
              </p>

              <div className="bg-muted/20 rounded-lg p-6 mb-6 text-left">
                <h3 className="font-semibold mb-4 text-card-foreground">Detalji Rezervacije</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mesto:</span>
                    <span className="font-medium text-card-foreground">{spot.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Datum:</span>
                    <span className="font-medium text-card-foreground">
                      {format(new Date(booking.startTime), "dd MMM yyyy", { locale: sr })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vreme:</span>
                    <span className="font-medium text-card-foreground">
                      {format(new Date(booking.startTime), "HH:mm")} - {format(new Date(booking.endTime), "HH:mm")}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-border">
                    <span className="text-muted-foreground">Ukupno:</span>
                    <span className="text-xl font-bold text-accent">
                      {booking.totalPrice} {booking.currency}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Link href="/my-bookings" className="flex-1">
                  <Button className="w-full" data-testid="button-view-bookings">
                    Moje Rezervacije
                  </Button>
                </Link>
                <Link href="/home" className="flex-1">
                  <Button variant="outline" className="w-full" data-testid="button-home">
                    Početna
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-card-foreground">
                Plaćanje Neuspešno
              </h2>
              <p className="text-muted-foreground mb-8">
                Došlo je do greške prilikom obrade plaćanja. Pokušajte ponovo.
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setPaymentStatus('processing');
                    paymentMutation.mutate(bookingId!);
                  }}
                  className="flex-1"
                  data-testid="button-retry"
                >
                  Pokušaj Ponovo
                </Button>
                <Link href="/home" className="flex-1">
                  <Button variant="outline" className="w-full" data-testid="button-cancel">
                    Otkaži
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
