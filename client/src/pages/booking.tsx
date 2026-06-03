import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, CreditCard, Loader2, MapPin, Car, Phone } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import type { ParkingSpot, User as UserType } from "@shared/schema";
import { Link } from "wouter";
import { startOfDay } from "date-fns";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";

const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Jun","Jul","Avgust","Septembar","Oktobar","Novembar","Decembar"];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }

export default function Booking() {
  const [, params] = useRoute("/spot/:id/booking");
  const [, setLocation] = useLocation();
  const spotId = params?.id;
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const today = startOfDay(new Date());
  const currentYear = today.getFullYear();

  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [licensePlate, setLicensePlate] = useState(user?.savedLicensePlate ?? "");
  const [renterPhone, setRenterPhone] = useState("");
  const [selectedSpace, setSelectedSpace] = useState(1);
  const [bookingStartDate, setBookingStartDate] = useState<Date>(startOfDay(new Date()));
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(9);
  const [dailyStartHour, setDailyStartHour] = useState(0);
  const [numMonths, setNumMonths] = useState(1);
  const [numWeeks, setNumWeeks] = useState(1);
  const [selectedPricingType, setSelectedPricingType] = useState<string>("daily");
  const [bookingEndDate, setBookingEndDate] = useState<Date>(() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0,0,0,0); return d; });

  const { data: spot, isLoading } = useQuery<ParkingSpot>({
    queryKey: ["/api/parking-spots", spotId],
    enabled: !!spotId,
  });

  const { data: owner } = useQuery<UserType>({
    queryKey: ["/api/users", spot?.ownerId],
    enabled: !!spot?.ownerId,
  });

  const { data: availability = [] } = useQuery<{ startTime: string; endTime: string }[]>({
    queryKey: ["/api/spots", spotId, "availability", selectedSpace],
    queryFn: async () => {
      const totalSpaces = spot?.totalSpaces ?? 1;
      const url = totalSpaces > 1
        ? `/api/spots/${spotId}/availability?space=${selectedSpace}`
        : `/api/spots/${spotId}/availability`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!spotId,
  });

  function getAvailableTypes(s: ParkingSpot): Array<{type: string; price: number; label: string}> {
    const ph = Number(s.pricePerHour) || 0;
    const pd = Number(s.pricePerDay) || 0;
    const pw = Number(s.pricePerWeek) || 0;
    const pm = Number(s.pricePerMonth) || 0;
    const types: Array<{type: string; price: number; label: string}> = [];
    if (ph > 0) types.push({ type: 'hourly', price: ph, label: 'sat' });
    if (pd > 0) types.push({ type: 'daily', price: pd, label: 'dan' });
    if (pw > 0) types.push({ type: 'weekly', price: pw, label: 'nedelja' });
    if (pm > 0) types.push({ type: 'monthly', price: pm, label: 'mesec' });
    if (types.length === 0) types.push({ type: s.pricingType || 'daily', price: ph, label: s.pricingType === 'hourly' ? 'sat' : s.pricingType === 'monthly' ? 'mesec' : 'dan' });
    return types;
  }

  useEffect(() => {
    if (spot) {
      const types = getAvailableTypes(spot);
      setSelectedPricingType(prev => types.some(t => t.type === prev) ? prev : types[0].type);
    }
  }, [spot?.id]);

  function isDateBooked(date: Date): boolean {
    const slotStart = new Date(startOfDay(date));
    slotStart.setHours(dailyStartHour, 0, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + 24 * 60 * 60 * 1000);
    return availability.some(({ startTime, endTime }) => {
      const s = new Date(startTime); const e = new Date(endTime);
      return s < slotEnd && e > slotStart;
    });
  }

  function isDayFullyBooked(date: Date): boolean {
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return availability.some(({ startTime, endTime }) => {
      const s = new Date(startTime); const e = new Date(endTime);
      return s <= dayStart && e >= dayEnd;
    });
  }

  function getBookedHoursForDay(date: Date): Set<number> {
    const dayStart = startOfDay(date);
    const booked = new Set<number>();
    availability.forEach(({ startTime, endTime }) => {
      const s = new Date(startTime); const e = new Date(endTime);
      const pStart = Math.max(s.getTime(), dayStart.getTime());
      const pEnd = Math.min(e.getTime(), dayStart.getTime() + 24 * 60 * 60 * 1000);
      if (pStart < pEnd) {
        const sh = Math.floor((pStart - dayStart.getTime()) / 3600000);
        const eh = Math.ceil((pEnd - dayStart.getTime()) / 3600000);
        for (let h = sh; h < eh; h++) booked.add(h);
      }
    });
    return booked;
  }

  const calculatedPrice = useMemo(() => {
    if (!spot) return 0;
    const types = getAvailableTypes(spot);
    const chosen = types.find(t => t.type === selectedPricingType) || types[0];
    const price = chosen.price;
    if (selectedPricingType === "hourly") {
      const hours = endHour - startHour;
      return hours > 0 ? Math.round(hours * price * 100) / 100 : 0;
    } else if (selectedPricingType === "daily") {
      const days = Math.max(1, Math.round((bookingEndDate.getTime() - bookingStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      return days * price;
    } else if (selectedPricingType === "weekly") {
      return numWeeks * price;
    } else {
      return numMonths * price;
    }
  }, [spot, selectedPricingType, startHour, endHour, bookingStartDate, bookingEndDate, numWeeks, numMonths]);

  function getBookingTimes(): { startTime: Date; endTime: Date } {
    const base = bookingStartDate;
    if (selectedPricingType === "hourly") {
      const start = new Date(base); start.setHours(startHour, 0, 0, 0);
      const end = new Date(base); end.setHours(endHour, 0, 0, 0);
      return { startTime: start, endTime: end };
    } else if (selectedPricingType === "daily") {
      const start = new Date(base); start.setHours(0, 0, 0, 0);
      const end = new Date(bookingEndDate); end.setHours(23, 59, 59, 0);
      return { startTime: start, endTime: end };
    } else if (selectedPricingType === "weekly") {
      const start = new Date(base); start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + numWeeks * 7 * 24 * 60 * 60 * 1000 - 1000);
      end.setHours(23, 59, 59, 0);
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
        renterPhone,
        spaceNumber: selectedSpace,
        pricingType: selectedPricingType,
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
          <Link href="/map-hack"><Button>Početna</Button></Link>
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
  const availableTypes = getAvailableTypes(spot);
  const chosenType = availableTypes.find(t => t.type === selectedPricingType) || availableTypes[0];
  const totalSpaces = spot.totalSpaces ?? 1;

  // Date picker state helpers
  const pickerYear = bookingStartDate.getFullYear();
  const pickerMonth = bookingStartDate.getMonth();
  const pickerDay = bookingStartDate.getDate();

  function isDatePast(y: number, m: number, d: number) {
    const dt = new Date(y, m, d); dt.setHours(0, 0, 0, 0); return dt < today;
  }

  function updateDate(y: number, m: number, d: number) {
    const daysInM = getDaysInMonth(y, m);
    const safeD = Math.min(d, daysInM);
    const nd = new Date(y, m, safeD); nd.setHours(0, 0, 0, 0);
    setBookingStartDate(nd);
  }

  const datePicker = (
    <div className="grid grid-cols-3 gap-2">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Dan</label>
        <Select value={String(pickerDay)} onValueChange={(v) => updateDate(pickerYear, pickerMonth, Number(v))}>
          <SelectTrigger data-testid="select-picker-day"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: getDaysInMonth(pickerYear, pickerMonth) }, (_, i) => i + 1).map(d => {
              const isPast = isDatePast(pickerYear, pickerMonth, d);
              const date = new Date(pickerYear, pickerMonth, d);
              const isUnavail = !isPast && (selectedPricingType === "hourly" ? isDayFullyBooked(date) : isDateBooked(date));
              return (
                <SelectItem key={d} value={String(d)} disabled={isPast || isUnavail}>
                  {d}{isUnavail ? " ✕" : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Mesec</label>
        <Select value={String(pickerMonth)} onValueChange={(v) => updateDate(pickerYear, Number(v), pickerDay)}>
          <SelectTrigger data-testid="select-picker-month">
            <SelectValue>{MONTHS_SR[pickerMonth]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MONTHS_SR.map((name, i) => <SelectItem key={i} value={String(i)}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Godina</label>
        <Select value={String(pickerYear)} onValueChange={(v) => updateDate(Number(v), pickerMonth, pickerDay)}>
          <SelectTrigger data-testid="select-picker-year"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear + 1, currentYear + 2].map(y => (
              <SelectItem key={y} value={String(y)}>{y}.</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const endPickerYear = bookingEndDate.getFullYear();
  const endPickerMonth = bookingEndDate.getMonth();
  const endPickerDay = bookingEndDate.getDate();

  function updateEndDate(y: number, m: number, d: number) {
    const daysInM = getDaysInMonth(y, m);
    const safeD = Math.min(d, daysInM);
    const nd = new Date(y, m, safeD); nd.setHours(0, 0, 0, 0);
    setBookingEndDate(nd);
  }

  const endDatePicker = (
    <div className="grid grid-cols-3 gap-2">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Dan</label>
        <Select value={String(endPickerDay)} onValueChange={(v) => updateEndDate(endPickerYear, endPickerMonth, Number(v))}>
          <SelectTrigger data-testid="select-end-picker-day"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: getDaysInMonth(endPickerYear, endPickerMonth) }, (_, i) => i + 1).map(d => {
              const date = new Date(endPickerYear, endPickerMonth, d);
              const isBeforeStart = date < bookingStartDate;
              return <SelectItem key={d} value={String(d)} disabled={isBeforeStart}>{d}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Mesec</label>
        <Select value={String(endPickerMonth)} onValueChange={(v) => updateEndDate(endPickerYear, Number(v), endPickerDay)}>
          <SelectTrigger data-testid="select-end-picker-month">
            <SelectValue>{MONTHS_SR[endPickerMonth]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MONTHS_SR.map((name, i) => <SelectItem key={i} value={String(i)}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Godina</label>
        <Select value={String(endPickerYear)} onValueChange={(v) => updateEndDate(Number(v), endPickerMonth, endPickerDay)}>
          <SelectTrigger data-testid="select-end-picker-year"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear + 1, currentYear + 2].map(y => (
              <SelectItem key={y} value={String(y)}>{y}.</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/map-hack" className="flex items-center gap-2 shrink-0">
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
        {/* Sažetak parkinga */}
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
            <p className="text-xl font-bold text-accent">{chosenType.price.toLocaleString("sr-RS")} {spot.currency}</p>
            <p className="text-xs text-muted-foreground">/ {chosenType.label}</p>
          </div>
        </div>

        {/* 1. Registarska tablica */}
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
        </div>

        {/* 2. Broj telefona */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2" htmlFor="renter-phone">
            <Phone className="h-4 w-4 text-accent" />
            Broj telefona
          </label>
          <Input
            id="renter-phone"
            type="tel"
            placeholder="+381 60 123 4567"
            value={renterPhone}
            onChange={(e) => setRenterPhone(e.target.value)}
            className="h-12"
            data-testid="input-renter-phone"
          />
        </div>

        {/* 3. Izbor parking mesta (samo ako ima više od 1) */}
        {totalSpaces > 1 && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Parking mesto (broj)</label>
            <Select value={String(selectedSpace)} onValueChange={(v) => setSelectedSpace(Number(v))}>
              <SelectTrigger data-testid="select-space-number"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: totalSpaces }, (_, i) => i + 1).map(n => (
                  <SelectItem key={n} value={String(n)}>Mesto {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 4. Tip cene + datum i vreme */}
        {availableTypes.length > 1 && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Vrsta rezervacije</label>
            <div className="flex gap-2 flex-wrap">
              {availableTypes.map(t => (
                <Button
                  key={t.type}
                  variant={selectedPricingType === t.type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPricingType(t.type)}
                  data-testid={`button-pricing-type-${t.type}`}
                >
                  {t.price.toLocaleString("sr-RS")} {spot.currency} / {t.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {selectedPricingType === "monthly" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Datum početka</label>
              {datePicker}
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

        {selectedPricingType === "weekly" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Datum početka</label>
              {datePicker}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Broj nedelja</label>
              <Select value={String(numWeeks)} onValueChange={(v) => setNumWeeks(Number(v))}>
                <SelectTrigger data-testid="select-num-weeks"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? "nedelja" : n < 5 ? "nedelje" : "nedelja"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {selectedPricingType === "daily" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Od datuma</label>
              {datePicker}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Do datuma</label>
              {endDatePicker}
            </div>
          </div>
        )}

        {selectedPricingType === "hourly" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Dan</label>
              {datePicker}
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

        {/* Ukupna cena */}
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
            if (!isAuthenticated) { setShowLoginDialog(true); return; }
            bookingCheckoutMutation.mutate();
          }}
          disabled={bookingCheckoutMutation.isPending || !licensePlate.trim() || !renterPhone.trim() || calculatedPrice <= 0}
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
