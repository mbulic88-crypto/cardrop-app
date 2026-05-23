import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, CreditCard, Loader2, MapPin, Car } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import type { ParkingSpot, User as UserType } from "@shared/schema";
import { Link } from "wouter";
import { format, startOfDay } from "date-fns";
import { sr } from "date-fns/locale";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";

export default function Booking() {
  const [, params] = useRoute("/spot/:id/booking");
  const [, setLocation] = useLocation();
  const spotId = params?.id;
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const [showLoginDialog, setShowLoginDialog] = useState(false);
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

  const { data: owner } = useQuery<UserType>({
    queryKey: ["/api/users", spot?.ownerId],
    enabled: !!spot?.ownerId,
  });

  const { data: availability = [] } = useQuery<{ startTime: string; endTime: string }[]>({
    queryKey: ["/api/spots", spotId, "availability"],
    queryFn: async () => {
      const res = await fetch(`/api/spots/${spotId}/availability`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!spotId,
  });

  useEffect(() => {
    if (user?.savedLicensePlate && !licensePlate) {
      setLicensePlate(user.savedLicensePlate);
    }
  }, [user?.savedLicensePlate]);

  const isDateBooked = (date: Date): boolean => {
    const slotStart = new Date(startOfDay(date));
    slotStart.setHours(dailyStartHour, 0, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + 24 * 60 * 60 * 1000);
    return availability.some(({ startTime, endTime }) => {
      const s = new Date(startTime);
      const e = new Date(endTime);
      return s < slotEnd && e > slotStart;
    });
  };

  const isDayFullyBooked = (date: Date): boolean => {
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return availability.some(({ startTime, endTime }) => {
      const s = new Date(startTime);
      const e = new Date(endTime);
      return s <= dayStart && e >= dayEnd;
    });
  };

  const getBookedHoursForDay = (date: Date | undefined): Set<number> => {
    if (!date) return new Set();
    const dayStart = startOfDay(date);
    const bookedHours = new Set<number>();
    availability.forEach(({ startTime, endTime }) => {
      const s = new Date(startTime);
      const e = new Date(endTime);
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
      if (!bookingStartDate) return 0;
      return price;
    } else {
      return numMonths * price;
    }
  }, [spot, bookingStartDate, startHour, endHour, numMonths, dailyStartHour]);

  function getBookingTimes(): { startTime: Date; endTime: Date } {
    const base = bookingStartDate || new Date();
    if (spot?.pricingType === "hourly") {
      const start = new Date(base);
      start.setHours(startHour, 0, 0, 0);
      const end = new Date(base);
      end.setHours(endHour, 0, 0, 0);
      return { startTime: start, endTime: end };
    } else if (spot?.pricingType === "daily") {
      const start = new Date(base);
      start.setHours(dailyStartHour, 0, 0, 0);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      return { startTime: start, endTime: end };
    } else {
      const start = new Date(base);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + numMonths);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 0);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!spot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Parking nije pronađen.</p>
          <Link href="/home"><Button>Početna</Button></Link>
        </Card>
      </div>
    );
  }

  if (!spot.stripeLinkActive) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-sm">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Online plaćanje nije aktivno za ovaj parking.</p>
          <Button variant="outline" onClick={() => setLocation(`/spot/${spotId}`)}>Nazad</Button>
        </Card>
      </div>
    );
  }

  const bookedHours = getBookedHoursForDay(bookingStartDate);
  const isHourConflict = (from: number, to: number) =>
    Array.from(bookedHours).some(h => h >= from && h < to);
  const pricingLabel = spot.pricingType === "hourly" ? "sat" : spot.pricingType === "monthly" ? "mesec" : "dan";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
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
            onClick={() => setLocation(`/spot/${spotId}`)}
            data-testid="button-close-booking"
            title="Nazad na parking"
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
                <button
                  type="button"
                  className="px-3 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => setLicensePlate("")}
                  tabIndex={-1}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Tablica se čuva radi evidencije rezervacije.</p>
        </div>

        {/* Monthly */}
        {spot.pricingType === "monthly" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Datum početka</label>
              <Calendar
                mode="single"
                selected={bookingStartDate}
                onSelect={setBookingStartDate}
                disabled={(date) => date < startOfDay(new Date()) || isDateBooked(date)}
                className="rounded-md border border-border w-full"
                data-testid="calendar-booking-monthly"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Broj meseci</label>
              <Select value={String(numMonths)} onValueChange={(v) => setNumMonths(Number(v))}>
                <SelectTrigger data-testid="select-num-months"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 6, 12].map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? "mesec" : n < 5 ? "meseca" : "meseci"}
                    </SelectItem>
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
              <Calendar
                mode="single"
                selected={bookingStartDate}
                onSelect={setBookingStartDate}
                disabled={(date) => date < startOfDay(new Date()) || isDateBooked(date)}
                className="rounded-md border border-border w-full"
                data-testid="calendar-booking-daily"
              />
              {availability.length > 0 && (
                <p className="text-xs text-muted-foreground">Zasenjeni datumi su već rezervisani.</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Sat početka</label>
              <Select value={String(dailyStartHour)} onValueChange={(v) => setDailyStartHour(Number(v))}>
                <SelectTrigger data-testid="select-daily-start-hour"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => i).map(h => (
                    <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}:00</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {bookingStartDate && (
                <p className="text-xs text-muted-foreground">
                  {format(bookingStartDate, "dd. MMM", { locale: sr })} {String(dailyStartHour).padStart(2, "0")}:00
                  {" → "}
                  {format(new Date(bookingStartDate.getTime() + 24 * 60 * 60 * 1000), "dd. MMM", { locale: sr })} {String(dailyStartHour).padStart(2, "0")}:00
                </p>
              )}
            </div>
          </div>
        )}

        {/* Hourly */}
        {spot.pricingType === "hourly" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Dan</label>
              <Calendar
                mode="single"
                selected={bookingStartDate}
                onSelect={setBookingStartDate}
                disabled={(date) => date < startOfDay(new Date()) || isDayFullyBooked(date)}
                className="rounded-md border border-border w-full"
                data-testid="calendar-booking-hourly"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Od sata</label>
                <Select
                  value={String(startHour)}
                  onValueChange={(v) => { const h = Number(v); setStartHour(h); if (endHour <= h) setEndHour(h + 1); }}
                >
                  <SelectTrigger data-testid="select-start-hour"><SelectValue /></SelectTrigger>
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
                  <SelectTrigger data-testid="select-end-hour"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 23 }, (_, i) => i + 1).map(h => (
                      <SelectItem key={h} value={String(h)} disabled={h <= startHour || isHourConflict(startHour, h)}>
                        {String(h).padStart(2, "0")}:00{isHourConflict(startHour, h) && h > startHour ? " ✕" : ""}
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

        <p className="text-xs text-muted-foreground text-center">
          Kada jednom uplatite, sledeći put sve ide na samo jedan klik.
        </p>

        <Button
          className="w-full bg-accent text-accent-foreground h-12 text-base"
          onClick={() => {
            if (!isAuthenticated) { setShowLoginDialog(true); return; }
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

        <Button
          variant="ghost"
          className="w-full"
          onClick={() => setLocation(`/spot/${spotId}`)}
          data-testid="button-back-to-spot"
        >
          Nazad na parking
        </Button>
      </div>

      <LoginRequiredDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
    </div>
  );
}
