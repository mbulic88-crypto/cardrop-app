import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MapPin, Zap, Camera, Clock, Home as HomeIcon, Star, MessageSquare, Phone, CreditCard, Send, ChevronLeft, ChevronRight, Eye, EyeOff, Lock, MessageCircle, X, Car, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
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

function getAvailableTypesSD(s: ParkingSpot): Array<{type: string; price: number; label: string}> {
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

function BookingPanel({ spot, owner, licensePlate, setLicensePlate, renterPhone, setRenterPhone, selectedSpace, setSelectedSpace, bookingStartDate, setBookingStartDate, bookingEndDate, setBookingEndDate, startHour, setStartHour, endHour, setEndHour, selectedPricingType, setSelectedPricingType, numWeeks, setNumWeeks, calculatedPrice, isPending, bookedHours, isDateBooked, isDayFullyBooked, onClose, onSubmit }: {
  spot: ParkingSpot; owner: UserType | undefined; licensePlate: string; setLicensePlate: (v: string) => void;
  renterPhone: string; setRenterPhone: (v: string) => void;
  selectedSpace: number; setSelectedSpace: (n: number) => void;
  bookingStartDate: Date | undefined; setBookingStartDate: (d: Date | undefined) => void;
  bookingEndDate: Date | undefined; setBookingEndDate: (d: Date | undefined) => void;
  startHour: number; setStartHour: (h: number) => void; endHour: number; setEndHour: (h: number) => void;
  selectedPricingType: string; setSelectedPricingType: (t: string) => void;
  numWeeks: number; setNumWeeks: (n: number) => void;
  calculatedPrice: number; isAuthenticated?: boolean; isPending: boolean;
  bookedHours: Set<number>; isDateBooked: (d: Date) => boolean; isDayFullyBooked: (d: Date) => boolean;
  onClose: () => void; onSubmit: () => void;
}) {
  const isHourConflict = (from: number, to: number) => Array.from(bookedHours).some(h => h >= from && h < to);
  const availableTypesSD = getAvailableTypesSD(spot);
  const chosenTypeSD = availableTypesSD.find(t => t.type === selectedPricingType) || availableTypesSD[0];

  const today = startOfDay(new Date());
  const pickerDate = bookingStartDate || today;
  const pickerYear = pickerDate.getFullYear();
  const pickerMonth = pickerDate.getMonth();
  const pickerDay = pickerDate.getDate();
  const currentYear = today.getFullYear();

  const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Jun","Jul","Avgust","Septembar","Oktobar","Novembar","Decembar"];

  function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
  function isDatePast(y: number, m: number, d: number) {
    const dt = new Date(y, m, d); dt.setHours(0,0,0,0); return dt < today;
  }
  function updateDate(y: number, m: number, d: number) {
    const daysInM = getDaysInMonth(y, m);
    const safeD = Math.min(d, daysInM);
    const newDate = new Date(y, m, safeD); newDate.setHours(0,0,0,0);
    setBookingStartDate(newDate);
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
          <SelectTrigger data-testid="select-picker-month"><SelectValue>{MONTHS_SR[pickerMonth]}</SelectValue></SelectTrigger>
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

  const endBase = bookingEndDate || new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const endPickerYear = endBase.getFullYear();
  const endPickerMonth = endBase.getMonth();
  const endPickerDay = endBase.getDate();

  function updateEndDate(y: number, m: number, d: number) {
    const daysInM = getDaysInMonth(y, m);
    const safeD = Math.min(d, daysInM);
    const newDate = new Date(y, m, safeD); newDate.setHours(0, 0, 0, 0);
    setBookingEndDate(newDate);
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
              const isBeforeStart = bookingStartDate ? date < bookingStartDate : false;
              return <SelectItem key={d} value={String(d)} disabled={isBeforeStart}>{d}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Mesec</label>
        <Select value={String(endPickerMonth)} onValueChange={(v) => updateEndDate(endPickerYear, Number(v), endPickerDay)}>
          <SelectTrigger data-testid="select-end-picker-month"><SelectValue>{MONTHS_SR[endPickerMonth]}</SelectValue></SelectTrigger>
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

  const monthYearStartPicker = (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Mesec</label>
        <Select value={String(pickerMonth)} onValueChange={(v) => updateDate(pickerYear, Number(v), 1)}>
          <SelectTrigger data-testid="select-start-month-monthly"><SelectValue>{MONTHS_SR[pickerMonth]}</SelectValue></SelectTrigger>
          <SelectContent>
            {MONTHS_SR.map((name, i) => <SelectItem key={i} value={String(i)}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Godina</label>
        <Select value={String(pickerYear)} onValueChange={(v) => updateDate(Number(v), pickerMonth, 1)}>
          <SelectTrigger data-testid="select-start-year-monthly"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear + 1, currentYear + 2].map(y => (
              <SelectItem key={y} value={String(y)}>{y}.</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const monthYearEndPicker = (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Mesec</label>
        <Select value={String(endPickerMonth)} onValueChange={(v) => updateEndDate(endPickerYear, Number(v), 1)}>
          <SelectTrigger data-testid="select-end-month-monthly"><SelectValue>{MONTHS_SR[endPickerMonth]}</SelectValue></SelectTrigger>
          <SelectContent>
            {MONTHS_SR.map((name, i) => {
              const isBeforeStart = endPickerYear === pickerYear && i < pickerMonth;
              return <SelectItem key={i} value={String(i)} disabled={isBeforeStart}>{name}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Godina</label>
        <Select value={String(endPickerYear)} onValueChange={(v) => updateEndDate(Number(v), endPickerMonth, 1)}>
          <SelectTrigger data-testid="select-end-year-monthly"><SelectValue /></SelectTrigger>
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
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, minHeight: "100%", zIndex: 50, overflowY: "auto", backgroundColor: "var(--background, white)" }}>
      <header className="sticky top-0 bg-card border-b border-border shadow-sm" style={{ zIndex: 10 }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/map-hack" className="flex items-center gap-2 shrink-0">
            <img src={parkInLogo} alt="CarDrop" className="w-8 h-8 rounded-lg" />
            <span className="text-lg font-bold text-foreground hidden sm:inline">CarDrop</span>
          </Link>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-sm font-semibold text-foreground truncate">{spot.title}</p>
            {spot.parkingNumber && <p className="text-xs text-accent font-mono">{spot.parkingNumber}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-booking">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3 p-4 rounded-md border border-border bg-card">
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{spot.title}</p>
            <p className="text-sm text-muted-foreground truncate">{spot.address}</p>
            {owner && <p className="text-xs text-muted-foreground mt-0.5">Vlasnik: {owner.firstName} {owner.lastName}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-accent">{chosenTypeSD.price.toLocaleString("sr-RS")} {spot.currency}</p>
            <p className="text-xs text-muted-foreground">/ {chosenTypeSD.label}</p>
          </div>
        </div>

        {/* 1. Registarska tablica */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Car className="h-4 w-4 text-accent" />Registarska tablica
          </label>
          <div className="rounded-md border-2 border-border focus-within:border-accent transition-colors bg-card overflow-hidden">
            <div className="flex items-center">
              <div className="flex flex-col items-center justify-center border-r border-border px-3 py-3 bg-blue-700 dark:bg-blue-800 shrink-0">
                <span className="text-[10px] font-bold text-white tracking-widest">SRB</span>
              </div>
              <Input placeholder="NS 123-AB" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                className="border-0 shadow-none text-center text-xl font-bold tracking-widest uppercase h-12 focus-visible:ring-0 bg-transparent"
                maxLength={15} data-testid="input-license-plate" />
              {licensePlate && (
                <button type="button" className="px-3 text-muted-foreground hover:text-foreground shrink-0" onClick={() => setLicensePlate("")} tabIndex={-1}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. Broj telefona */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground" htmlFor="renter-phone">Broj telefona</label>
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
        {spot.totalSpaces > 1 && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Parking mesto (broj)</label>
            <Select value={String(selectedSpace)} onValueChange={(v) => setSelectedSpace(Number(v))}>
              <SelectTrigger data-testid="select-space-number"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: spot.totalSpaces }, (_, i) => i + 1).map(n => (
                  <SelectItem key={n} value={String(n)}>Mesto {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 4. Tip cene + datum i vreme */}
        {availableTypesSD.length > 1 && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Vrsta rezervacije</label>
            <div className="flex gap-2 flex-wrap">
              {availableTypesSD.map(t => (
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
              <label className="text-sm font-semibold text-foreground">Od meseca</label>
              {monthYearStartPicker}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Do meseca</label>
              {monthYearEndPicker}
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

        {calculatedPrice > 0 && (
          <div className="flex justify-between items-center p-4 rounded-md bg-accent/10 border border-accent/20">
            <span className="text-sm font-medium text-foreground">Ukupno:</span>
            <span className="text-2xl font-bold text-accent" data-testid="text-total-price">
              {calculatedPrice.toLocaleString("sr-RS")} {spot.currency}
            </span>
          </div>
        )}

        <Button className="w-full bg-accent text-accent-foreground h-12 text-base" onClick={onSubmit}
          disabled={isPending || !licensePlate.trim() || !renterPhone.trim() || calculatedPrice <= 0} data-testid="button-nastavi-na-placanje">
          {isPending
            ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Učitavanje...</>
            : <><CreditCard className="w-5 h-5 mr-2" />Nastavi na plaćanje</>}
        </Button>

        <Button variant="ghost" className="w-full" onClick={onClose} data-testid="button-back-to-spot">
          Nazad na parking
        </Button>
      </div>
    </div>
  );
}

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

  useEffect(() => {
    if (showBookingPanel) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showBookingPanel]);
  const [selectedSpace, setSelectedSpace] = useState(1);
  const [licensePlate, setLicensePlate] = useState("");
  const [renterPhone, setRenterPhone] = useState("");
  const [bookingStartDate, setBookingStartDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [bookingEndDate, setBookingEndDate] = useState<Date | undefined>(() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0,0,0,0); return d; });
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(9);
  const [selectedPricingType, setSelectedPricingType] = useState<string>("daily");
  const [numWeeks, setNumWeeks] = useState(1);


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
    enabled: !!spotId && showBookingPanel,
  });

  const isDateBooked = (date: Date): boolean => {
    const slotStart = new Date(startOfDay(date));
    slotStart.setHours(0, 0, 0, 0);
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
    const types = getAvailableTypesSD(spot);
    const chosen = types.find(t => t.type === selectedPricingType) || types[0];
    const price = chosen.price;
    if (selectedPricingType === "hourly") {
      const hours = endHour - startHour;
      return hours > 0 && bookingStartDate ? Math.round(hours * price * 100) / 100 : 0;
    } else if (selectedPricingType === "daily") {
      if (!bookingStartDate || !bookingEndDate) return 0;
      const days = Math.max(1, Math.round((bookingEndDate.getTime() - bookingStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      return days * price;
    } else if (selectedPricingType === "weekly") {
      return numWeeks * price;
    } else {
      if (!bookingStartDate || !bookingEndDate) return price;
      const months = Math.max(1, (bookingEndDate.getFullYear() - bookingStartDate.getFullYear()) * 12 + (bookingEndDate.getMonth() - bookingStartDate.getMonth()) + 1);
      return months * price;
    }
  }, [spot, selectedPricingType, bookingStartDate, bookingEndDate, startHour, endHour, numWeeks]);

  useEffect(() => {
    if (spot) {
      const types = getAvailableTypesSD(spot);
      setSelectedPricingType(prev => types.some(t => t.type === prev) ? prev : types[0].type);
    }
  }, [spot?.id]);

  function getBookingTimes(): { startTime: Date; endTime: Date } {
    const base = bookingStartDate || new Date();
    if (selectedPricingType === "hourly") {
      const start = new Date(base); start.setHours(startHour, 0, 0, 0);
      const end = new Date(base); end.setHours(endHour, 0, 0, 0);
      return { startTime: start, endTime: end };
    } else if (selectedPricingType === "daily") {
      const start = new Date(base); start.setHours(0, 0, 0, 0);
      const end = new Date(bookingEndDate || base); end.setHours(23, 59, 59, 0);
      return { startTime: start, endTime: end };
    } else if (selectedPricingType === "weekly") {
      const start = new Date(base); start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + numWeeks * 7 * 24 * 60 * 60 * 1000 - 1000);
      end.setHours(23, 59, 59, 0);
      return { startTime: start, endTime: end };
    } else {
      const start = new Date(base); start.setDate(1); start.setHours(0, 0, 0, 0);
      const endBase = bookingEndDate || base;
      const end = new Date(endBase.getFullYear(), endBase.getMonth() + 1, 0);
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
          <Link href="/map-hack">
            <Button className="mt-4">Nazad na Početnu</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ position: "relative" }}>
      {showBookingPanel && spot && (
        <BookingPanel
          spot={spot}
          owner={owner}
          licensePlate={licensePlate}
          setLicensePlate={setLicensePlate}
          renterPhone={renterPhone}
          setRenterPhone={setRenterPhone}
          selectedSpace={selectedSpace}
          setSelectedSpace={setSelectedSpace}
          bookingStartDate={bookingStartDate}
          setBookingStartDate={setBookingStartDate}
          bookingEndDate={bookingEndDate}
          setBookingEndDate={setBookingEndDate}
          startHour={startHour}
          setStartHour={setStartHour}
          endHour={endHour}
          setEndHour={setEndHour}
          selectedPricingType={selectedPricingType}
          setSelectedPricingType={setSelectedPricingType}
          numWeeks={numWeeks}
          setNumWeeks={setNumWeeks}
          calculatedPrice={calculatedPrice}
          isAuthenticated={isAuthenticated}
          isPending={bookingCheckoutMutation.isPending}
          bookedHours={getBookedHoursForDay(bookingStartDate)}
          isDateBooked={isDateBooked}
          isDayFullyBooked={isDayFullyBooked}
          onClose={() => setShowBookingPanel(false)}
          onSubmit={() => {
            if (!isAuthenticated) { setShowLoginDialog(true); setShowBookingPanel(false); return; }
            bookingCheckoutMutation.mutate();
          }}
        />
      )}
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-1 xs:px-2 sm:px-4 py-2.5 xs:py-3 sm:py-4">
          <div className="flex items-center justify-between gap-1 xs:gap-2">
            <Link href="/map-hack" className="flex items-center gap-1.5 xs:gap-2">
              <img src={parkInLogo} alt="CarDrop" className="w-7 xs:w-8 h-7 xs:h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground hidden sm:inline">CarDrop</span>
            </Link>

            <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
              <Link href="/map-hack">
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
          <div className="flex items-baseline gap-3 flex-wrap">
            {getAvailableTypesSD(spot).map(t => (
              <span key={t.type} className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-accent" data-testid={`text-price-main-${t.type}`}>
                  {Number(t.price).toLocaleString("sr-RS")}
                </span>
                <span className="text-lg text-muted-foreground">{spot.currency} / {t.label}</span>
              </span>
            ))}
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
            <p className="text-xs text-muted-foreground mt-2" data-testid="text-total-spaces">
              {spot.parkingNumber && <span className="font-mono text-accent">{spot.parkingNumber}</span>}
              {spot.parkingNumber && " • "}
              {(spot.totalSpaces ?? 1) === 1
                ? "1 parking mesto"
                : `${spot.totalSpaces} parking mesta`}
            </p>
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
                {spot.totalSpaces > 1 && (
                  <Badge variant="outline" data-testid="badge-total-spaces">
                    <Car className="w-4 h-4 mr-1" />
                    {spot.totalSpaces} parking {spot.totalSpaces < 5 ? "mesta" : "mesta"}
                  </Badge>
                )}
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
                <div className="flex flex-col gap-1" data-testid="text-price">
                  {getAvailableTypesSD(spot).map(t => (
                    <div key={t.type} className="text-2xl font-bold text-accent">
                      {Number(t.price).toLocaleString("sr-RS")} <span className="text-base text-muted-foreground font-normal">{spot.currency}/{t.label}</span>
                    </div>
                  ))}
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
