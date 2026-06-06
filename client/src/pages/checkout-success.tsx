import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Home, Eye, Car } from "lucide-react";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";

type SessionType = 'booking' | 'spot_listing' | 'sale_listing' | 'map_hack' | 'unknown';

type SessionTypeResponse = {
  type: SessionType;
  spotId: string | null;
  listingId: string | null;
};

type BookingVerifyResponse = {
  success: boolean;
  alreadyConsumed?: boolean;
  booking: {
    id: string;
    startTime: string;
    endTime: string;
    totalPrice: string;
    currency: string;
    licensePlate?: string | null;
  };
  spot: {
    id: string;
    title: string;
    address: string;
    parkingNumber?: string | null;
  };
};

type SpotVerifyResponse = {
  success: boolean;
  spot: { id: string };
};

type SaleVerifyResponse = {
  success: boolean;
  listing: { id: string };
};

export default function CheckoutSuccess() {
  const sessionId = new URLSearchParams(window.location.search).get('session_id');
  const [sessionMeta, setSessionMeta] = useState<SessionTypeResponse | null>(null);
  const [sessionTypeError, setSessionTypeError] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingVerifyResponse | null>(null);

  const verifyMutation = useMutation({
    mutationFn: async (meta: SessionTypeResponse) => {
      if (meta.type === 'booking') {
        return await apiRequest("POST", "/api/stripe/verify-booking-payment", { sessionId });
      } else if (meta.type === 'sale_listing') {
        return await apiRequest("POST", "/api/stripe/verify-sale-payment", {
          sessionId,
          listingId: meta.listingId,
        });
      } else {
        return await apiRequest("POST", "/api/stripe/verify-payment", {
          sessionId,
          spotId: meta.spotId,
        });
      }
    },
    onSuccess: (data, meta) => {
      setVerified(true);
      if (meta.type === 'booking') {
        const typed = data as BookingVerifyResponse;
        setBookingResult(typed);
        setResultId(typed.spot?.id || null);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      } else if (meta.type === 'sale_listing') {
        const typed = data as SaleVerifyResponse;
        setResultId(typed.listing?.id || meta.listingId);
        queryClient.invalidateQueries({ queryKey: ["/api/sales-listings"] });
      } else {
        const typed = data as SpotVerifyResponse;
        setResultId(typed.spot?.id || meta.spotId);
        queryClient.invalidateQueries({ queryKey: ["/api/parking-spots/my-spots"] });
        queryClient.invalidateQueries({ queryKey: ["/api/parking-spots"] });
      }
    },
  });

  useEffect(() => {
    if (!sessionId) return;
    apiRequest("GET", `/api/stripe/session-type?session_id=${encodeURIComponent(sessionId)}`)
      .then((data: SessionTypeResponse) => {
        setSessionMeta(data);
        verifyMutation.mutate(data);
      })
      .catch(() => setSessionTypeError(true));
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Nevažeća stranica</h2>
          <Link href="/map-hack"><Button data-testid="button-go-home">Početna</Button></Link>
        </Card>
      </div>
    );
  }

  if (sessionTypeError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Greška pri verifikaciji</h2>
          <p className="text-muted-foreground mb-4">Nije moguće proveriti sesiju plaćanja. Kontaktirajte podršku.</p>
          <Link href="/map-hack"><Button data-testid="button-go-home">Početna</Button></Link>
        </Card>
      </div>
    );
  }

  if (!sessionMeta || verifyMutation.isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Verifikacija plaćanja...</h2>
          <p className="text-muted-foreground">Molimo sačekajte dok proveravamo vaše plaćanje.</p>
        </Card>
      </div>
    );
  }

  if (verifyMutation.isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Greška pri verifikaciji</h2>
          <p className="text-muted-foreground mb-4">Došlo je do greške pri verifikaciji plaćanja. Kontaktirajte podršku.</p>
          <Link href="/map-hack"><Button data-testid="button-go-home">Nazad na početnu</Button></Link>
        </Card>
      </div>
    );
  }

  if (sessionMeta.type === 'booking' && verified && bookingResult) {
    const { spot, booking } = bookingResult;
    const startTime = booking?.startTime ? new Date(booking.startTime) : null;
    const endTime = booking?.endTime ? new Date(booking.endTime) : null;
    const fmt = (d: Date) => d.toLocaleDateString('sr-Latn-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <img src={parkInLogo} alt="CarDrop" className="w-12 h-12 rounded-lg mx-auto mb-4" />
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Plaćanje uspešno!</h2>
          <p className="text-muted-foreground mb-4">Vaša rezervacija parkinga je potvrđena.</p>

          {spot && (
            <div className="bg-muted/50 rounded-md p-4 mb-4 text-left space-y-2">
              <div className="flex items-start gap-2">
                <Car className="w-4 h-4 mt-0.5 text-accent shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-sm">{spot.title}</p>
                  {spot.parkingNumber && (
                    <p className="text-xs text-muted-foreground font-mono">{spot.parkingNumber}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{spot.address}</p>
                </div>
              </div>
              {startTime && endTime && (
                <p className="text-sm text-muted-foreground pl-6">
                  {fmt(startTime)} – {fmt(endTime)}
                </p>
              )}
              {booking?.totalPrice && (
                <p className="text-sm font-semibold text-accent pl-6">
                  {Number(booking.totalPrice).toLocaleString('sr-RS')} {booking.currency}
                </p>
              )}
              {booking?.licensePlate && (
                <p className="text-xs text-muted-foreground pl-6">Tablica: {booking.licensePlate}</p>
              )}
            </div>
          )}

          <p className="text-sm text-foreground font-medium mb-2">
            Uspešno ste rezervisali parking! Vaše rezervacije možete pogledati u{" "}
            <Link href="/dashboard?tab=bookings" className="text-accent underline underline-offset-2">
              Vašem profilu u meniju
            </Link>.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Sledeći put tablice i kartica su već sačuvani — sve ide na jedan klik.
          </p>

          <div className="flex flex-col gap-3">
            {resultId && (
              <Link href={`/map-hack?parking=${resultId}`}>
                <Button className="w-full" data-testid="button-view-spot">
                  <Eye className="w-4 h-4 mr-2" />
                  Pogledaj parking
                </Button>
              </Link>
            )}
            <Link href="/map-hack">
              <Button variant="outline" className="w-full" data-testid="button-go-home">
                <Home className="w-4 h-4 mr-2" />
                Početna stranica
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const isSale = sessionMeta.type === 'sale_listing';
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <img src={parkInLogo} alt="CarDrop" className="w-12 h-12 rounded-lg mx-auto mb-4" />
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {isSale ? "Uspešno ste dodali oglas za prodaju!" : "Uspešno ste dodali parking!"}
        </h2>
        <p className="text-muted-foreground mb-6">
          {isSale
            ? "Vaš oglas za prodaju je sada aktivan."
            : "Vaš parking oglas je sada aktivan i vidljiv svima."}
        </p>
        <div className="flex flex-col gap-3">
          {resultId && (
            <Link href={isSale ? `/sale/${resultId}` : `/spot/${resultId}`}>
              <Button className="w-full" data-testid="button-view-listing">
                <Eye className="w-4 h-4 mr-2" />
                {isSale ? "Pogledaj oglas" : "Pogledaj parking"}
              </Button>
            </Link>
          )}
          <Link href="/map-hack">
            <Button variant="outline" className="w-full" data-testid="button-go-home">
              <Home className="w-4 h-4 mr-2" />
              Početna stranica
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
