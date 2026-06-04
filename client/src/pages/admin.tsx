import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { DraggableLocationMap } from "@/components/DraggableLocationMap";
import { ArrowLeft, Trash2, Users, Car, Shield, Loader2, Power, ShoppingBag, MapPin, Activity, Gift, Plus, Edit, FileText, Link as LinkIcon, Upload, X, CreditCard, Hash, CalendarDays, ChevronDown, ChevronUp, DoorOpen } from "lucide-react";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Map, { Marker as MapMarkerPin, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { User, ParkingSpot, SalesListing, MapMarker, Booking } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SERBIAN_CITIES = [
  "Beograd", "Novi Sad", "Niš", "Kragujevac", "Subotica", "Zrenjanin",
  "Pančevo", "Čačak", "Kraljevo", "Smederevo", "Leskovac", "Užice",
  "Valjevo", "Šabac", "Sombor", "Kruševac", "Ostalo"
];

type SpotFormData = {
  title: string;
  description: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  pricePerHour: string;
  pricePerDay: string;
  pricePerWeek: string;
  pricePerMonth: string;
  currency: string;
  spotType: string;
  pricingType: string;
  paymentType: string;
  hasEvCharging: boolean;
  hasSecurityCamera: boolean;
  is24Hours: boolean;
  phone: string;
  contactEmail: string;
  category: string;
  isActive: boolean;
  isPremium: boolean;
  subscriptionType: string;
  stripeLink: string;
  stripeLinkActive: boolean;
  totalSpaces: number;
  hasRamp: boolean;
  rampPhone: string;
  rampWebhookUrl: string;
};

const defaultSpotForm: SpotFormData = {
  title: "",
  description: "",
  address: "",
  city: "",
  latitude: "44.8178",
  longitude: "20.4569",
  pricePerHour: "",
  pricePerDay: "",
  pricePerWeek: "",
  pricePerMonth: "",
  currency: "RSD",
  spotType: "uncovered",
  pricingType: "daily",
  paymentType: "cash",
  hasEvCharging: false,
  hasSecurityCamera: false,
  is24Hours: true,
  phone: "",
  contactEmail: "",
  category: "private",
  isActive: true,
  isPremium: false,
  subscriptionType: "standard",
  stripeLink: "",
  stripeLinkActive: false,
  totalSpaces: 1,
  hasRamp: false,
  rampPhone: "",
  rampWebhookUrl: "",
};

function SpotFormFields({ form, setForm, isEdit }: { form: SpotFormData; setForm: (f: SpotFormData) => void; isEdit?: boolean }) {
  const set = (k: keyof SpotFormData, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-foreground">Naslov *</label>
          <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Parking u centru" data-testid="input-spot-title" />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-foreground">Adresa *</label>
          <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Bulevar oslobođenja 12, Novi Sad" data-testid="input-spot-address" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Grad</label>
          <Select value={form.city} onValueChange={v => set("city", v)}>
            <SelectTrigger data-testid="select-spot-city"><SelectValue placeholder="Izaberi grad" /></SelectTrigger>
            <SelectContent>
              {SERBIAN_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Kategorija</label>
          <Select value={form.category} onValueChange={v => set("category", v)}>
            <SelectTrigger data-testid="select-spot-category"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Privatni</SelectItem>
              <SelectItem value="company">Firma</SelectItem>
              <SelectItem value="truck_stop">Kamion</SelectItem>
              <SelectItem value="residential">Stambena</SelectItem>
              <SelectItem value="car_lot">Auto plac</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Latitude</label>
          <Input value={form.latitude} onChange={e => set("latitude", e.target.value)} placeholder="44.8178" data-testid="input-spot-lat" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Longitude</label>
          <Input value={form.longitude} onChange={e => set("longitude", e.target.value)} placeholder="20.4569" data-testid="input-spot-lng" />
        </div>
        {form.latitude && form.longitude && parseFloat(form.latitude) && parseFloat(form.longitude) && (
          <div className="col-span-2">
            <DraggableLocationMap
              latitude={parseFloat(form.latitude)}
              longitude={parseFloat(form.longitude)}
              onPositionChange={(lat, lng) => setForm({ ...form, latitude: lat.toFixed(7), longitude: lng.toFixed(7) })}
              height="180px"
              hint="Prevucite pin na tačnu lokaciju"
            />
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Valuta</label>
          <Select value={form.currency} onValueChange={v => set("currency", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="RSD">RSD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="BAM">BAM</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Cena / sat (opciono)</label>
          <Input value={form.pricePerHour} onChange={e => set("pricePerHour", e.target.value)} placeholder="npr. 200" data-testid="input-spot-price-hour" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Cena / dan (opciono)</label>
          <Input value={form.pricePerDay} onChange={e => set("pricePerDay", e.target.value)} placeholder="npr. 1000" data-testid="input-spot-price-day" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Cena / nedelja (opciono)</label>
          <Input value={form.pricePerWeek} onChange={e => set("pricePerWeek", e.target.value)} placeholder="npr. 5000" data-testid="input-spot-price-week" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Cena / mesec (opciono)</label>
          <Input value={form.pricePerMonth} onChange={e => set("pricePerMonth", e.target.value)} placeholder="npr. 15000" data-testid="input-spot-price-month" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Tip mesta</label>
          <Select value={form.spotType} onValueChange={v => set("spotType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="uncovered">Otvoreno</SelectItem>
              <SelectItem value="covered">Pokriveno</SelectItem>
              <SelectItem value="garage">Garaža</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Tip plaćanja</label>
          <Select value={form.paymentType} onValueChange={v => set("paymentType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Keš</SelectItem>
              <SelectItem value="bank_transfer">Bankovni prenos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Pretplata</label>
          <Select value={form.subscriptionType} onValueChange={v => set("subscriptionType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="silver">Silver</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Kontakt telefon</label>
          <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+381 64 123 4567" data-testid="input-spot-phone" />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-foreground">Kontakt email</label>
          <Input value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} placeholder="kontakt@email.com" data-testid="input-spot-email" />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-foreground">Opis</label>
          <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Opis parking mesta..." className="min-h-[80px]" data-testid="textarea-spot-description" />
        </div>
        <div className="col-span-2 flex flex-wrap gap-4 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={form.hasEvCharging} onCheckedChange={v => set("hasEvCharging", v)} data-testid="switch-ev-charging" />
            <span className="text-sm">EV punjač</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={form.hasSecurityCamera} onCheckedChange={v => set("hasSecurityCamera", v)} data-testid="switch-security-camera" />
            <span className="text-sm">Kamera</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={form.is24Hours} onCheckedChange={v => set("is24Hours", v)} data-testid="switch-24h" />
            <span className="text-sm">24/7</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={form.isPremium} onCheckedChange={v => set("isPremium", v)} data-testid="switch-premium" />
            <span className="text-sm">Premium</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={form.isActive} onCheckedChange={v => set("isActive", v)} data-testid="switch-active" />
            <span className="text-sm">Aktivan</span>
          </label>
        </div>
        {/* Stripe link section */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Broj mesta (total)</label>
          <Input
            type="number"
            min={1}
            max={100}
            value={form.totalSpaces}
            onChange={e => set("totalSpaces", Math.max(1, parseInt(e.target.value, 10) || 1))}
            placeholder="1"
            data-testid="input-total-spaces"
          />
        </div>
        <div className="col-span-2 space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Stripe link za plaćanje</span>
          </div>
          <Input value={form.stripeLink} onChange={e => set("stripeLink", e.target.value)} placeholder="https://buy.stripe.com/..." data-testid="input-stripe-link" />
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={form.stripeLinkActive} onCheckedChange={v => set("stripeLinkActive", v)} data-testid="switch-stripe-link-active" />
            <span className="text-sm">Prikaži "Plati online" dugme na strani parking mesta</span>
          </label>
        </div>
        <div className="col-span-2 space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Rampa / barijera (admin only)</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={form.hasRamp} onCheckedChange={v => set("hasRamp", v)} data-testid="switch-has-ramp" />
            <span className="text-sm">Ovo mesto ima automatsku rampu</span>
          </label>
          {form.hasRamp && (
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Broj rampe (NIKAD se ne prikazuje korisnicima)</label>
                <Input value={form.rampPhone} onChange={e => set("rampPhone", e.target.value)} placeholder="+381 64 ..." data-testid="input-ramp-phone" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">MacroDroid Webhook URL (za ovaj parking specifično)</label>
                <Input value={form.rampWebhookUrl} onChange={e => set("rampWebhookUrl", e.target.value)} placeholder="https://trigger.macrodroid.com/..." data-testid="input-ramp-webhook-url" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function fetchLogoDataUrl(logoUrl: string): Promise<string | null> {
  try {
    const resp = await fetch(logoUrl);
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function generatePDF(spot: ParkingSpot, logoUrl: string, spaceNumber?: number) {
  const { jsPDF } = await import("jspdf");
  const QRCode = (await import("qrcode")).default;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;

  // ── BACKGROUND ──
  doc.setFillColor(26, 77, 55);
  doc.rect(0, 0, W, H, "F");

  // ── LOGO ──
  const logoData = await fetchLogoDataUrl(logoUrl);
  const logoW = 200;
  const logoH = 175;
  const logoX = 5;
  const logoY = 5;
  if (logoData) {
    try { doc.addImage(logoData, "PNG", logoX, logoY, logoW, logoH); } catch {}
  }

  // ── "CarDrop" ──
  const textBase = logoY + logoH + 14;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(50);
  doc.setFont("helvetica", "bold");
  doc.text("CarDrop", W / 2, textBase, { align: "center" });

  // ── PARKING NUMBER / SPOT NAME ──
  const numY = textBase + 28;
  if (spot.parkingNumber) {
    doc.setFontSize(80);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(167, 243, 208);
    doc.text(spot.parkingNumber, W / 2, numY, { align: "center" });
  } else {
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(167, 243, 208);
    const title = doc.splitTextToSize(spot.title, W - 40);
    doc.text(title[0], W / 2, numY, { align: "center" });
  }

  // ── SPACE NUMBER (multi-space) ──
  let afterNumY = numY + 34;
  if (spaceNumber !== undefined) {
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`MESTO ${spaceNumber}`, W / 2, afterNumY, { align: "center" });
    afterNumY += 14;
  }

  // ── EMAIL ──
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(134, 214, 180);
  doc.text("info@cardrop.app", W / 2, afterNumY, { align: "center" });

  // ── QR CODE — bottom center, links to this spot's page ──
  try {
    const spotUrl = `${window.location.origin}/spot/${spot.id}`;
    const qrDataUrl = await QRCode.toDataURL(spotUrl, {
      width: 200, margin: 1,
      color: { dark: "#1a4d37", light: "#ffffff" }
    });
    const qrSize = 40;
    const qrX = (W - qrSize) / 2;
    const qrY = H - qrSize - 20;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 3, 3, "F");
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(134, 214, 180);
    doc.text("Skenirajte za detalje parkinga", W / 2, qrY + qrSize + 9, { align: "center" });
  } catch {}

  // ── copyright ──
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(34, 90, 65);
  doc.text("© 2025 CarDrop", W / 2, H - 4, { align: "center" });

  const baseName = spot.parkingNumber
    ? `${spot.parkingNumber}-cardrop`
    : `parking-${spot.id.slice(0, 8)}-cardrop`;
  const fileName = spaceNumber !== undefined
    ? `${baseName}-mesto${spaceNumber}.pdf`
    : `${baseName}.pdf`;
  doc.save(fileName);
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editCoordSpot, setEditCoordSpot] = useState<ParkingSpot | null>(null);
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");

  // Add / Edit spot dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState<SpotFormData>(defaultSpotForm);
  const [addStep, setAddStep] = useState<1 | 2>(1);
  const [createdSpotId, setCreatedSpotId] = useState<string | null>(null);
  const [addUploadedImages, setAddUploadedImages] = useState<string[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editSpot, setEditSpot] = useState<ParkingSpot | null>(null);
  const [editForm, setEditForm] = useState<SpotFormData>(defaultSpotForm);
  const [editUploadedImages, setEditUploadedImages] = useState<string[]>([]);
  const [showPendingDetails, setShowPendingDetails] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  // Grant plan state
  const [grantEmail, setGrantEmail] = useState("");
  const [grantPlan, setGrantPlan] = useState("premium");
  const [grantHistory, setGrantHistory] = useState<{ email: string; plan: string; grantedAt: Date }[]>([]);

  const { data: currentUser, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!currentUser?.isAdmin,
  });

  const { data: parkingSpots, isLoading: spotsLoading } = useQuery<ParkingSpot[]>({
    queryKey: ["/api/admin/parking-spots"],
    enabled: !!currentUser?.isAdmin,
  });

  const { data: salesListings, isLoading: listingsLoading } = useQuery<SalesListing[]>({
    queryKey: ["/api/admin/sales-listings"],
    enabled: !!currentUser?.isAdmin,
  });

  const { data: mapMarkersList, isLoading: markersLoading } = useQuery<MapMarker[]>({
    queryKey: ["/api/admin/map-hack/markers"],
    enabled: !!currentUser?.isAdmin,
  });

  const [bookingsSpotId, setBookingsSpotId] = useState<string | null>(null);
  const [adminBookDateFrom, setAdminBookDateFrom] = useState('');
  const [adminBookDateTo, setAdminBookDateTo] = useState('');

  const { data: spotBookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/admin/parking-spots", bookingsSpotId, "bookings"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/parking-spots/${bookingsSpotId}/bookings`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!bookingsSpotId,
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Korisnik je obrisan" });
    },
    onError: () => {
      toast({ title: "Greška pri brisanju korisnika", variant: "destructive" });
    },
  });

  const deleteSpotMutation = useMutation({
    mutationFn: async (spotId: string) => {
      await apiRequest("DELETE", `/api/admin/parking-spots/${spotId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/parking-spots"] });
      toast({ title: "Parking mesto je obrisano" });
    },
    onError: () => {
      toast({ title: "Greška pri brisanju parking mesta", variant: "destructive" });
    },
  });

  const toggleSpotMutation = useMutation({
    mutationFn: async (spotId: string) => {
      const res = await apiRequest("PATCH", `/api/admin/parking-spots/${spotId}/toggle-active`);
      return res.json();
    },
    onSuccess: (data: ParkingSpot) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/parking-spots"] });
      toast({ title: data.isActive ? "Parking aktiviran" : "Parking deaktiviran" });
    },
    onError: () => {
      toast({ title: "Greška pri promeni statusa", variant: "destructive" });
    },
  });

  const deleteListingMutation = useMutation({
    mutationFn: async (listingId: string) => {
      await apiRequest("DELETE", `/api/admin/sales-listings/${listingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sales-listings"] });
      toast({ title: "Oglas za prodaju je obrisan" });
    },
    onError: () => {
      toast({ title: "Greška pri brisanju oglasa", variant: "destructive" });
    },
  });

  const toggleListingMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const res = await apiRequest("PATCH", `/api/admin/sales-listings/${listingId}/toggle-active`);
      return res.json();
    },
    onSuccess: (data: SalesListing) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sales-listings"] });
      toast({ title: data.isActive ? "Oglas aktiviran" : "Oglas deaktiviran" });
    },
    onError: () => {
      toast({ title: "Greška pri promeni statusa", variant: "destructive" });
    },
  });

  const deleteMapMarkerMutation = useMutation({
    mutationFn: async (markerId: string) => {
      await apiRequest("DELETE", `/api/admin/map-hack/markers/${markerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/map-hack/markers"] });
      toast({ title: "Marker je obrisan" });
    },
    onError: () => {
      toast({ title: "Greška pri brisanju markera", variant: "destructive" });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async ({ spotId, imageUrl }: { spotId: string; imageUrl: string }) => {
      return await apiRequest("DELETE", `/api/parking-spots/${spotId}/images`, { imageUrl });
    },
    onSuccess: (data: { imageUrls: string[] }) => {
      setEditUploadedImages(data.imageUrls || []);
      toast({ title: "Slika obrisana" });
    },
    onError: () => {
      toast({ title: "Greška pri brisanju slike", variant: "destructive" });
    },
  });

  const applyPendingMutation = useMutation({
    mutationFn: async (spotId: string) => {
      return await apiRequest("POST", `/api/admin/parking-spots/${spotId}/apply-pending`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/parking-spots"] });
      toast({ title: "Izmene su primenjene odmah" });
      setShowEditDialog(false);
      setEditSpot(null);
    },
    onError: () => {
      toast({ title: "Greška pri primeni izmena", variant: "destructive" });
    },
  });

  const updateCoordsMutation = useMutation({
    mutationFn: async ({ id, latitude, longitude }: { id: string; latitude: string; longitude: string }) => {
      return await apiRequest("PATCH", `/api/admin/parking-spots/${id}/update`, { latitude, longitude });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/parking-spots"] });
      toast({ title: "Koordinate su ažurirane" });
      setEditCoordSpot(null);
    },
    onError: () => {
      toast({ title: "Greška pri ažuriranju koordinata", variant: "destructive" });
    },
  });

  const createSpotMutation = useMutation({
    mutationFn: async (data: SpotFormData) => {
      const ph = parseFloat(data.pricePerHour) || null;
      const pd = parseFloat(data.pricePerDay) || null;
      const pw = parseFloat(data.pricePerWeek) || null;
      const pm = parseFloat(data.pricePerMonth) || null;
      const derivedPricingType = pm ? 'monthly' : pd ? 'daily' : ph ? 'hourly' : 'daily';
      const res = await apiRequest("POST", "/api/admin/parking-spots", {
        ...data,
        latitude: parseFloat(data.latitude) || 0,
        longitude: parseFloat(data.longitude) || 0,
        pricePerHour: ph,
        pricePerDay: pd,
        pricePerWeek: pw,
        pricePerMonth: pm,
        pricingType: derivedPricingType,
      });
      return res.json();
    },
    onSuccess: (data: ParkingSpot) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/parking-spots"] });
      toast({ title: "Parking mesto dodato — dodajte slike" });
      setCreatedSpotId(data.id);
      setAddUploadedImages(data.imageUrls || []);
      setAddStep(2);
    },
    onError: () => {
      toast({ title: "Greška pri dodavanju parking mesta", variant: "destructive" });
    },
  });

  const fullEditMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SpotFormData }) => {
      const ph = parseFloat(data.pricePerHour) || null;
      const pd = parseFloat(data.pricePerDay) || null;
      const pw = parseFloat(data.pricePerWeek) || null;
      const pm = parseFloat(data.pricePerMonth) || null;
      const derivedPricingType = pm ? 'monthly' : pd ? 'daily' : ph ? 'hourly' : 'daily';
      const res = await apiRequest("PATCH", `/api/admin/parking-spots/${id}/full-edit`, {
        ...data,
        latitude: parseFloat(data.latitude) || 0,
        longitude: parseFloat(data.longitude) || 0,
        pricePerHour: ph,
        pricePerDay: pd,
        pricePerWeek: pw,
        pricePerMonth: pm,
        pricingType: derivedPricingType,
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/parking-spots"] });
      toast({ title: "Parking mesto ažurirano" });
      setShowEditDialog(false);
      setEditSpot(null);
    },
    onError: () => {
      toast({ title: "Greška pri ažuriranju parking mesta", variant: "destructive" });
    },
  });

  const planLabels: Record<string, string> = {
    premium: "Premium (mesečni)",
    godisnji_premium: "Godišnji Premium",
    day_pass: "Day Pass (24h)",
    firma: "Za Firme",
  };

  const grantPlanMutation = useMutation({
    mutationFn: async ({ email, plan }: { email: string; plan: string }) => {
      return await apiRequest("POST", "/api/admin/grant-map-hack-plan", { email, plan });
    },
    onSuccess: (data: { email: string; plan: string }) => {
      setGrantHistory((prev) => [{ email: data.email, plan: data.plan, grantedAt: new Date() }, ...prev].slice(0, 20));
      setGrantEmail("");
      toast({ title: `Plan dodijeljen: ${data.email} → ${planLabels[data.plan] ?? data.plan}` });
    },
    onError: (error: Error) => {
      // apiRequest throws Error("status: body") — extract message after colon if present
      const raw = error.message ?? "";
      const msg = raw.includes(": ") ? raw.split(": ").slice(1).join(": ") : raw || "Greška pri dodjeljivanju plana";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const activateStripeMutation = useMutation({
    mutationFn: async (id: string) =>
      await apiRequest("POST", `/api/admin/parking-spots/${id}/activate-stripe`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/parking-spots"] });
      toast({ title: "Stripe aktivan — produkt kreiran u dashboardu" });
    },
    onError: (e: Error) => toast({ title: e.message || "Greška pri aktivaciji Stripe-a", variant: "destructive" }),
  });

  const assignNumberMutation = useMutation({
    mutationFn: async (id: string) =>
      await apiRequest("POST", `/api/admin/parking-spots/${id}/assign-number`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/parking-spots"] });
      toast({ title: "Parking broj dodijeljen" });
    },
    onError: (e: Error) => toast({ title: e.message || "Greška pri dodjeli broja", variant: "destructive" }),
  });

  const getCategoryLabel = (category: string | null | undefined) => {
    const labels: Record<string, string> = {
      private: "Privatni",
      company: "Firma",
      truck_stop: "Kamion",
      residential: "Stambena",
      car_lot: "Auto plac",
    };
    return labels[category || "private"] || category || "N/A";
  };

  const getTierBadge = (tier: string | null | undefined) => {
    if (tier === "gold") return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Gold</Badge>;
    if (tier === "silver") return <Badge className="bg-slate-400/20 text-slate-300 border-slate-400/30">Silver</Badge>;
    return <Badge variant="secondary">Standard</Badge>;
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser?.isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Shield className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Pristup odbijen</h1>
        <p className="text-muted-foreground mb-4">Nemate dozvolu za pristup admin panelu.</p>
        <Button onClick={() => setLocation("/")} data-testid="button-back-home">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Nazad na pocetnu
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-border p-4">
        <div className="container mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-6xl">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="users" className="flex items-center gap-2" data-testid="tab-users">
              <Users className="h-4 w-4" />
              Korisnici ({users?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="spots" className="flex items-center gap-2" data-testid="tab-spots">
              <Car className="h-4 w-4" />
              Parkinzi ({parkingSpots?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2" data-testid="tab-sales">
              <ShoppingBag className="h-4 w-4" />
              Prodaja ({salesListings?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="maphack" className="flex items-center gap-2" data-testid="tab-maphack">
              <MapPin className="h-4 w-4" />
              Map Hack RS ({mapMarkersList?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Svi korisnici</CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : users && users.length > 0 ? (
                  <div className="space-y-3">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between gap-3 p-4 bg-surface rounded-md border border-border"
                        data-testid={`row-user-${user.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {user.firstName} {user.lastName}
                            {user.isAdmin && (
                              <Badge variant="default" className="ml-2">Admin</Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Trial: {user.hasUsedFreeTrial ? "Iskoriscen" : "Dostupan"}
                          </p>
                        </div>
                        {user.id !== currentUser.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon"
                                disabled={deleteUserMutation.isPending}
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Obrisati korisnika?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Ova akcija je nepovratna. Korisnik {user.email} ce biti trajno obrisan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Otkazi</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUserMutation.mutate(user.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Obrisi
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nema korisnika</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spots">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle>Sva parking mesta</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => { setAddForm(defaultSpotForm); setShowAddDialog(true); }}
                    data-testid="button-add-spot"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Dodaj parking
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {spotsLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : parkingSpots && parkingSpots.length > 0 ? (
                  <div className="space-y-3">
                    {parkingSpots.map((spot) => (
                      <div
                        key={spot.id}
                        className={`rounded-md border ${
                          spot.isActive
                            ? "bg-surface border-border"
                            : "bg-destructive/5 border-destructive/20"
                        }`}
                        data-testid={`row-spot-${spot.id}`}
                      >
                      <div className="flex items-center justify-between gap-3 p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {spot.parkingNumber && (
                              <Badge className="bg-accent/20 text-accent border-accent/30 font-mono text-xs">{spot.parkingNumber}</Badge>
                            )}
                            {(spot.totalSpaces ?? 1) > 1 && (
                              <Badge variant="outline" className="text-xs">{spot.totalSpaces} mesta</Badge>
                            )}
                            <p className="font-medium text-foreground truncate">{spot.title}</p>
                            {getTierBadge(spot.subscriptionType)}
                            <Badge variant="outline">{getCategoryLabel(spot.category)}</Badge>
                            {spot.isActive ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Aktivan</Badge>
                            ) : (
                              <Badge variant="destructive">Neaktivan</Badge>
                            )}
                            {spot.stripeLinkActive && (
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Stripe link</Badge>
                            )}
                            {spot.pendingChanges && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Na čekanju</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">{spot.address}</p>
                          <p className="text-xs text-muted-foreground">
                            Vlasnik: {spot.ownerId} | Cena: {spot.pricePerHour} RSD/{spot.pricingType === 'hourly' ? 'h' : spot.pricingType === 'monthly' ? 'mes' : 'dan'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant={bookingsSpotId === spot.id ? "default" : "outline"}
                            size="icon"
                            onClick={() => setBookingsSpotId(bookingsSpotId === spot.id ? null : spot.id)}
                            data-testid={`button-bookings-spot-${spot.id}`}
                            title="Prikaži rezervacije"
                          >
                            {bookingsSpotId === spot.id ? <ChevronUp className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={async () => {
                              setPdfLoading(spot.id);
                              try {
                                const spaces = spot.totalSpaces ?? 1;
                                if (spaces > 1) {
                                  for (let i = 1; i <= spaces; i++) {
                                    await generatePDF(spot, parkInLogo, i);
                                  }
                                } else {
                                  await generatePDF(spot, parkInLogo);
                                }
                              } catch (e) { toast({ title: "Greška pri generisanju PDF-a", variant: "destructive" }); }
                              setPdfLoading(null);
                            }}
                            disabled={pdfLoading === spot.id}
                            data-testid={`button-pdf-spot-${spot.id}`}
                            title="Preuzmi PDF/QR"
                          >
                            {pdfLoading === spot.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setEditSpot(spot);
                              setEditForm({
                                title: spot.title,
                                description: spot.description,
                                address: spot.address,
                                city: spot.city || "",
                                latitude: spot.latitude || "0",
                                longitude: spot.longitude || "0",
                                pricePerHour: spot.pricePerHour ? String(spot.pricePerHour) : "",
                                pricePerDay: spot.pricePerDay ? String(spot.pricePerDay) : "",
                                pricePerWeek: spot.pricePerWeek ? String(spot.pricePerWeek) : "",
                                pricePerMonth: spot.pricePerMonth ? String(spot.pricePerMonth) : "",
                                currency: spot.currency || "RSD",
                                spotType: spot.spotType || "uncovered",
                                pricingType: spot.pricingType || "daily",
                                paymentType: spot.paymentType || "cash",
                                hasEvCharging: spot.hasEvCharging,
                                hasSecurityCamera: spot.hasSecurityCamera,
                                is24Hours: spot.is24Hours,
                                phone: spot.phone || "",
                                contactEmail: spot.contactEmail || "",
                                category: spot.category || "private",
                                isActive: spot.isActive,
                                isPremium: spot.isPremium,
                                subscriptionType: spot.subscriptionType || "standard",
                                stripeLink: spot.stripeLink || "",
                                stripeLinkActive: spot.stripeLinkActive || false,
                                totalSpaces: spot.totalSpaces ?? 1,
                                hasRamp: spot.hasRamp ?? false,
                                rampPhone: "",
                              });
                              setEditUploadedImages(spot.imageUrls || []);
                              setShowPendingDetails(false);
                              setShowEditDialog(true);
                              // Fetch ramp config separately (rampPhone/rampWebhookUrl are never included in public/admin list)
                              if (spot.hasRamp) {
                                fetch(`/api/admin/parking-spots/${spot.id}/ramp-config`, { credentials: "include" })
                                  .then(r => r.ok ? r.json() : null)
                                  .then(cfg => { if (cfg) setEditForm(prev => ({ ...prev, rampPhone: cfg.rampPhone || "", rampWebhookUrl: cfg.rampWebhookUrl || "" })); })
                                  .catch(() => {});
                              }
                            }}
                            data-testid={`button-edit-spot-${spot.id}`}
                            title="Uredi parking"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setEditCoordSpot(spot);
                              setEditLat(spot.latitude || "");
                              setEditLng(spot.longitude || "");
                            }}
                            data-testid={`button-edit-coords-${spot.id}`}
                            title="Uredi koordinate (pin na mapi)"
                          >
                            <MapPin className="h-4 w-4" />
                          </Button>
                          {spot.hasRamp && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={async () => {
                                try {
                                  const r = await fetch(`/api/parking-spots/${spot.id}/open-ramp`, {
                                    method: "POST", credentials: "include",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({}),
                                  });
                                  const data = await r.json();
                                  if (!r.ok) toast({ title: "Greška", description: data.message, variant: "destructive" });
                                  else toast({ title: "Test signal poslat", description: "ntfy.sh → Tasker signal je poslat na broj rampe." });
                                } catch { toast({ title: "Greška", description: "Nije moguće poslati test signal.", variant: "destructive" }); }
                              }}
                              data-testid={`button-test-ramp-${spot.id}`}
                              title="Test: pošalji signal za otvaranje rampe (admin bypass)"
                            >
                              <DoorOpen className="h-4 w-4" />
                            </Button>
                          )}
                          {!spot.parkingNumber && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => assignNumberMutation.mutate(spot.id)}
                              disabled={assignNumberMutation.isPending}
                              data-testid={`button-assign-number-${spot.id}`}
                              title="Dodeli parking broj (NS1, BG2...)"
                            >
                              {assignNumberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hash className="h-4 w-4" />}
                            </Button>
                          )}
                          <Button
                            variant={spot.stripeLinkActive ? "default" : "outline"}
                            size="icon"
                            onClick={() => activateStripeMutation.mutate(spot.id)}
                            disabled={activateStripeMutation.isPending}
                            data-testid={`button-activate-stripe-${spot.id}`}
                            title={spot.stripeLinkActive ? "Stripe aktivan — produkt postoji u dashboardu" : "Aktiviraj Stripe plaćanje i kreiraj produkt"}
                          >
                            {activateStripeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant={spot.isActive ? "outline" : "default"}
                            size="icon"
                            onClick={() => toggleSpotMutation.mutate(spot.id)}
                            disabled={toggleSpotMutation.isPending}
                            data-testid={`button-toggle-spot-${spot.id}`}
                            title={spot.isActive ? "Deaktiviraj" : "Aktiviraj"}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon"
                                disabled={deleteSpotMutation.isPending}
                                data-testid={`button-delete-spot-${spot.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Obrisati parking mesto?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Ova akcija je nepovratna. Parking mesto "{spot.title}" ce biti trajno obrisano.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Otkazi</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteSpotMutation.mutate(spot.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Obrisi
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      {bookingsSpotId === spot.id && (() => {
                        // Client-side date filtering
                        const filtered = spotBookings.filter(b => {
                          const t = new Date(b.startTime).getTime();
                          if (adminBookDateFrom && t < new Date(adminBookDateFrom).getTime()) return false;
                          if (adminBookDateTo && t > new Date(adminBookDateTo + 'T23:59:59').getTime()) return false;
                          return true;
                        });
                        const instantB = filtered.filter(b => (b as any).paymentMethod === 'instant');
                        const cashB = filtered.filter(b => (b as any).paymentMethod !== 'instant');

                        const APP_FEE_ADM = 0.15;
                        const calcAdminPayout = (price: number, method: string) => {
                          const app = price * APP_FEE_ADM;
                          if (method === 'instant') {
                            const stripe = price * 0.039 + 35;
                            return { neto: price - app - stripe, stripe, app };
                          }
                          return { neto: price - app, stripe: 0, app };
                        };

                        const instantTotal = instantB.reduce((s, b) => s + Number(b.totalPrice), 0);
                        const cashTotal = cashB.reduce((s, b) => s + Number(b.totalPrice), 0);
                        const instantPayout = instantB.reduce((s, b) => s + calcAdminPayout(Number(b.totalPrice), 'instant').neto, 0);
                        const cashPayout = cashB.reduce((s, b) => s + calcAdminPayout(Number(b.totalPrice), 'cash').neto, 0);

                        return (
                          <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                            {/* Date filter */}
                            <div className="flex flex-wrap gap-2 items-end">
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground">Od</p>
                                <input type="date" value={adminBookDateFrom}
                                  onChange={e => setAdminBookDateFrom(e.target.value)}
                                  className="text-xs border border-border rounded-md px-2 py-1 bg-background text-foreground" />
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground">Do</p>
                                <input type="date" value={adminBookDateTo}
                                  onChange={e => setAdminBookDateTo(e.target.value)}
                                  className="text-xs border border-border rounded-md px-2 py-1 bg-background text-foreground" />
                              </div>
                              {(adminBookDateFrom || adminBookDateTo) && (
                                <button onClick={() => { setAdminBookDateFrom(''); setAdminBookDateTo(''); }}
                                  className="text-xs text-muted-foreground underline">Obriši</button>
                              )}
                            </div>

                            {bookingsLoading ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />Učitavam...
                              </div>
                            ) : filtered.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Nema plaćenih rezervacija u ovom periodu.</p>
                            ) : (
                              <>
                                {/* INSTANT */}
                                {instantB.length > 0 && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                                        Instant plaćanja ({instantB.length})
                                      </p>
                                      <div className="flex gap-3 text-xs text-muted-foreground">
                                        <span>Ukupno: <span className="font-semibold text-foreground">{instantTotal.toLocaleString('sr-RS')} RSD</span></span>
                                        <span>Za isplatu: <span className="font-semibold text-green-400">{Math.round(instantPayout).toLocaleString('sr-RS')} RSD</span></span>
                                      </div>
                                    </div>
                                    {instantB.map(b => {
                                      const price = Number(b.totalPrice);
                                      const { neto, stripe: sf } = calcAdminPayout(price, 'instant');
                                      return (
                                        <div key={b.id} className="flex items-start justify-between gap-3 p-2 rounded-md bg-blue-500/5 border border-blue-500/15 text-sm flex-wrap">
                                          <div className="flex flex-col gap-0.5 min-w-0">
                                            <span className="font-medium text-foreground">{b.licensePlate || "—"}</span>
                                            {b.renterPhone && <span className="text-xs text-muted-foreground">{b.renterPhone}</span>}
                                            {(b as any).spaceNumber > 1 && <span className="text-xs text-accent font-medium">Mesto {(b as any).spaceNumber}</span>}
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(b.startTime).toLocaleDateString("sr-RS")} → {new Date(b.endTime).toLocaleDateString("sr-RS")}
                                            </span>
                                          </div>
                                          <div className="flex flex-col items-end gap-0.5 text-xs">
                                            <span className="text-foreground font-semibold">{price.toLocaleString('sr-RS')} RSD ukupno</span>
                                            <span className="text-green-400">Neto: {Math.round(neto).toLocaleString('sr-RS')} RSD</span>
                                            <span className="text-muted-foreground">Stripe: {Math.round(sf).toLocaleString('sr-RS')} RSD</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* KEŠ */}
                                {cashB.length > 0 && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                                        Keš plaćanja ({cashB.length})
                                      </p>
                                      <div className="flex gap-3 text-xs text-muted-foreground">
                                        <span>Ukupno: <span className="font-semibold text-foreground">{cashTotal.toLocaleString('sr-RS')} RSD</span></span>
                                        <span>Za isplatu: <span className="font-semibold text-green-400">{Math.round(cashPayout).toLocaleString('sr-RS')} RSD</span></span>
                                      </div>
                                    </div>
                                    {cashB.map(b => {
                                      const price = Number(b.totalPrice);
                                      const { neto } = calcAdminPayout(price, 'cash');
                                      return (
                                        <div key={b.id} className="flex items-start justify-between gap-3 p-2 rounded-md bg-amber-500/5 border border-amber-500/15 text-sm flex-wrap">
                                          <div className="flex flex-col gap-0.5 min-w-0">
                                            <span className="font-medium text-foreground">{b.licensePlate || "—"}</span>
                                            {b.renterPhone && <span className="text-xs text-muted-foreground">{b.renterPhone}</span>}
                                            {(b as any).spaceNumber > 1 && <span className="text-xs text-accent font-medium">Mesto {(b as any).spaceNumber}</span>}
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(b.startTime).toLocaleDateString("sr-RS")} → {new Date(b.endTime).toLocaleDateString("sr-RS")}
                                            </span>
                                          </div>
                                          <div className="flex flex-col items-end gap-0.5 text-xs">
                                            <span className="text-foreground font-semibold">{price.toLocaleString('sr-RS')} RSD</span>
                                            <span className="text-green-400">Neto: {Math.round(neto).toLocaleString('sr-RS')} RSD</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* UKUPNO ZA ISPLATU */}
                                <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <span className="text-sm font-semibold text-foreground">Ukupno za isplatu vlasniku</span>
                                    <span className="text-lg font-bold text-green-400">
                                      {Math.round(instantPayout + cashPayout).toLocaleString('sr-RS')} RSD
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Od ukupno {(instantTotal + cashTotal).toLocaleString('sr-RS')} RSD · {filtered.length} rezervacija
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nema parking mesta</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Svi oglasi za prodaju</CardTitle>
              </CardHeader>
              <CardContent>
                {listingsLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : salesListings && salesListings.length > 0 ? (
                  <div className="space-y-3">
                    {salesListings.map((listing) => (
                      <div
                        key={listing.id}
                        className={`flex items-center justify-between gap-3 p-4 rounded-md border ${
                          listing.isActive
                            ? "bg-surface border-border"
                            : "bg-destructive/5 border-destructive/20"
                        }`}
                        data-testid={`row-listing-${listing.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground truncate">{listing.title}</p>
                            {getTierBadge(listing.subscriptionType)}
                            {listing.isActive ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Aktivan</Badge>
                            ) : (
                              <Badge variant="destructive">Neaktivan</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">{listing.address}</p>
                          <p className="text-xs text-muted-foreground">
                            Prodavac: {listing.sellerId} | Cena: {listing.price} EUR | {listing.area} m2
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Tip: {listing.propertyType} | Telefon: {listing.phone}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={listing.isActive ? "outline" : "default"}
                            size="icon"
                            onClick={() => toggleListingMutation.mutate(listing.id)}
                            disabled={toggleListingMutation.isPending}
                            data-testid={`button-toggle-listing-${listing.id}`}
                            title={listing.isActive ? "Deaktiviraj" : "Aktiviraj"}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon"
                                disabled={deleteListingMutation.isPending}
                                data-testid={`button-delete-listing-${listing.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Obrisati oglas za prodaju?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Ova akcija je nepovratna. Oglas "{listing.title}" ce biti trajno obrisan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Otkazi</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteListingMutation.mutate(listing.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Obrisi
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nema oglasa za prodaju</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maphack">
            <div className="space-y-4">
              {/* Dodijeli Plan */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    Dodijeli Map Hack Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-48">
                      <label className="text-xs text-muted-foreground mb-1 block">Email korisnika</label>
                      <Input
                        placeholder="korisnik@email.com"
                        value={grantEmail}
                        onChange={(e) => setGrantEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && grantEmail.trim()) {
                            grantPlanMutation.mutate({ email: grantEmail.trim(), plan: grantPlan });
                          }
                        }}
                        data-testid="input-grant-email"
                      />
                    </div>
                    <div className="w-52">
                      <label className="text-xs text-muted-foreground mb-1 block">Plan</label>
                      <Select value={grantPlan} onValueChange={setGrantPlan}>
                        <SelectTrigger data-testid="select-grant-plan">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="premium">Premium (mesečni)</SelectItem>
                          <SelectItem value="godisnji_premium">Godišnji Premium</SelectItem>
                          <SelectItem value="day_pass">Day Pass (24h)</SelectItem>
                          <SelectItem value="firma">Za Firme</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => grantPlanMutation.mutate({ email: grantEmail.trim(), plan: grantPlan })}
                      disabled={!grantEmail.trim() || grantPlanMutation.isPending}
                      data-testid="button-grant-plan"
                    >
                      {grantPlanMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Gift className="h-4 w-4 mr-2" />
                      )}
                      Dodijeli
                    </Button>
                  </div>

                  {/* Grant history */}
                  {grantHistory.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground font-medium mb-2">Nedavno dodijeljeni planovi</p>
                      {grantHistory.map((g, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 py-1.5 px-3 rounded-md bg-muted/40 text-sm" data-testid={`row-grant-${i}`}>
                          <span className="text-foreground font-medium truncate">{g.email}</span>
                          <Badge variant="outline" className="shrink-0">{planLabels[g.plan] ?? g.plan}</Badge>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {g.grantedAt.toLocaleString("sr-RS", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {(["zlatni_minut", "pauk", "stek", "radar", "safe_zone"] as const).map((t) => {
                  const count = mapMarkersList?.filter(m => m.type === t).length || 0;
                  const labels: Record<string, string> = {
                    zlatni_minut: "Zlatni Minut",
                    pauk: "Pauk",
                    stek: "Štek",
                    radar: "Radar",
                    safe_zone: "Safe Zone",
                  };
                  return (
                    <Card key={t}>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{labels[t]}</p>
                        <p className="text-2xl font-bold text-foreground" data-testid={`stat-marker-${t}`}>{count}</p>
                      </CardContent>
                    </Card>
                  );
                })}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Activity className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Aktivni korisnici</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-active-users">
                      {mapMarkersList
                        ? new Set(
                            mapMarkersList
                              .filter(m => !m.expiresAt || new Date(m.expiresAt) > new Date())
                              .map(m => m.userId)
                          ).size
                        : 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Interactive map */}
              <Card>
                <CardHeader>
                  <CardTitle>Mapa markera</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden rounded-b-md">
                  <div style={{ height: 360 }}>
                    <Map
                      mapboxAccessToken={(import.meta.env.VITE_MAPBOX_TOKEN as string) || ""}
                      initialViewState={{ longitude: 19.845, latitude: 45.267, zoom: 12 }}
                      style={{ width: "100%", height: "100%" }}
                      mapStyle="mapbox://styles/mapbox/dark-v11"
                      data-testid="admin-map-maphack"
                    >
                      <NavigationControl position="top-right" />
                      {(mapMarkersList || []).map((marker) => {
                        const colorMap: Record<string, string> = {
                          zlatni_minut: "#f59e0b",
                          pauk: "#ef4444",
                          stek: "#22c55e",
                          radar: "#3b82f6",
                          safe_zone: "#a855f7",
                        };
                        const color = colorMap[marker.type] || "#6b7280";
                        const isExpired = marker.expiresAt ? new Date(marker.expiresAt) < new Date() : false;
                        return (
                          <MapMarkerPin
                            key={marker.id}
                            longitude={parseFloat(marker.lng)}
                            latitude={parseFloat(marker.lat)}
                          >
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                background: color,
                                opacity: isExpired ? 0.35 : 0.9,
                                border: "2px solid rgba(255,255,255,0.5)",
                                boxShadow: isExpired ? "none" : `0 0 6px ${color}`,
                              }}
                              title={`${marker.type} — ${marker.userId}`}
                            />
                          </MapMarkerPin>
                        );
                      })}
                    </Map>
                  </div>
                  <div className="flex flex-wrap gap-3 p-3 border-t border-border">
                    {[
                      { type: "zlatni_minut", label: "Zlatni Minut", color: "#f59e0b" },
                      { type: "pauk", label: "Pauk", color: "#ef4444" },
                      { type: "stek", label: "Štek", color: "#22c55e" },
                      { type: "radar", label: "Radar", color: "#3b82f6" },
                      { type: "safe_zone", label: "Safe Zone", color: "#a855f7" },
                    ].map(({ type, label, color }) => (
                      <div key={type} className="flex items-center gap-1.5">
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </div>
                    ))}
                    <span className="text-xs text-muted-foreground ml-auto">Izbledeli = istekli markeri</span>
                  </div>
                </CardContent>
              </Card>

              {/* Marker list */}
              <Card>
                <CardHeader>
                  <CardTitle>Svi markeri ({mapMarkersList?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  {markersLoading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : mapMarkersList && mapMarkersList.length > 0 ? (
                    <div className="space-y-2">
                      {mapMarkersList.map((marker) => {
                        const typeLabels: Record<string, string> = {
                          zlatni_minut: "Zlatni Minut",
                          pauk: "Pauk",
                          stek: "Štek",
                          radar: "Radar",
                          safe_zone: "Safe Zone",
                        };
                        const isExpired = marker.expiresAt ? new Date(marker.expiresAt) < new Date() : false;
                        return (
                          <div
                            key={marker.id}
                            className={`flex items-center justify-between gap-3 p-3 rounded-md border ${
                              isExpired ? "bg-muted/30 border-border/50" : "bg-surface border-border"
                            }`}
                            data-testid={`row-marker-${marker.id}`}
                          >
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={isExpired ? "secondary" : "outline"} className="text-xs">
                                  {typeLabels[marker.type] || marker.type}
                                </Badge>
                                {isExpired && (
                                  <Badge variant="secondary" className="text-xs">Istekao</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground font-mono">
                                {parseFloat(marker.lat).toFixed(5)}, {parseFloat(marker.lng).toFixed(5)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                User: <span className="font-mono">{marker.userId}</span>
                              </p>
                              {marker.ipAddress && (
                                <p className="text-xs text-muted-foreground">
                                  IP: <span className="font-mono">{marker.ipAddress}</span>
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {new Date(marker.createdAt).toLocaleString("sr-RS")}
                                {marker.expiresAt && (
                                  <> — ističe: {new Date(marker.expiresAt).toLocaleString("sr-RS")}</>
                                )}
                              </p>
                              {marker.label && (
                                <p className="text-xs text-foreground">"{marker.label}"</p>
                              )}
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  disabled={deleteMapMarkerMutation.isPending}
                                  data-testid={`button-delete-marker-${marker.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Obrisati marker?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Ovaj {typeLabels[marker.type] || marker.type} marker ce biti trajno obrisan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Otkazi</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMapMarkerMutation.mutate(marker.id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Obrisi
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Nema markera</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Spot Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setAddForm(defaultSpotForm);
          setAddStep(1);
          setCreatedSpotId(null);
          setAddUploadedImages([]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-add-spot">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-accent" />
              {addStep === 1 ? "Dodaj parking mesto" : "Dodajte slike parkinga"}
            </DialogTitle>
          </DialogHeader>

          {addStep === 1 && (
            <>
              <SpotFormFields form={addForm} setForm={setAddForm} />
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)} data-testid="button-add-spot-cancel">Otkaži</Button>
                <Button className="flex-1" onClick={() => createSpotMutation.mutate(addForm)} disabled={createSpotMutation.isPending || !addForm.title || !addForm.address} data-testid="button-add-spot-save">
                  {createSpotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dalje →"}
                </Button>
              </div>
            </>
          )}

          {addStep === 2 && createdSpotId && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Parking je kreiran. Možete dodati do 5 slika (opciono).</p>
              {addUploadedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {addUploadedImages.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                      <img src={img.startsWith("http") ? img : `/api/images/${img}`} alt={`Slika ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              {addUploadedImages.length < 5 && (
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={10485760}
                  onGetUploadParameters={async () => {
                    const response = await apiRequest("POST", "/api/objects/upload", {});
                    return { method: "PUT" as const, url: response.uploadURL };
                  }}
                  onComplete={async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
                    const uploadURL = result.successful?.[0]?.uploadURL;
                    if (uploadURL && createdSpotId) {
                      const resp = await apiRequest("PUT", `/api/parking-spots/${createdSpotId}/images`, { imageURL: uploadURL });
                      setAddUploadedImages(resp.imageUrls || []);
                      toast({ title: `Slika dodata (${(resp.imageUrls || []).length}/5)` });
                    }
                  }}
                  buttonClassName="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Dodaj sliku ({addUploadedImages.length}/5)
                </ObjectUploader>
              )}
              <Button className="w-full" onClick={() => {
                setShowAddDialog(false);
                setAddForm(defaultSpotForm);
                setAddStep(1);
                setCreatedSpotId(null);
                setAddUploadedImages([]);
              }} data-testid="button-add-spot-finish">
                Završi
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Spot Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        if (!open) { setShowEditDialog(false); setEditSpot(null); setEditUploadedImages([]); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-edit-spot">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-accent" />
              Uredi parking: {editSpot?.parkingNumber && <span className="font-mono text-accent">{editSpot.parkingNumber}</span>}
            </DialogTitle>
          </DialogHeader>
          {editSpot && (
            <>
              <SpotFormFields form={editForm} setForm={setEditForm} isEdit />

              {/* Pending changes section */}
              {editSpot?.pendingChanges && (() => {
                const pending = editSpot.pendingChanges as Record<string, unknown>;
                const fieldLabels: Record<string, string> = {
                  title: "Naslov", description: "Opis", address: "Adresa", city: "Grad",
                  pricePerHour: "Cena", currency: "Valuta", spotType: "Tip mesta",
                  pricingType: "Period naplate", paymentType: "Način plaćanja",
                  hasEvCharging: "EV punjač", hasSecurityCamera: "Kamera",
                  is24Hours: "24/7", phone: "Telefon", contactEmail: "Email",
                  companyName: "Naziv firme", pib: "PIB", contactPerson: "Kontakt osoba",
                };
                const changedKeys = Object.keys(pending);
                if (changedKeys.length === 0) return null;
                return (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left"
                        onClick={() => setShowPendingDetails(v => !v)}
                        data-testid="button-toggle-pending"
                      >
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Na čekanju ({changedKeys.length})</Badge>
                        {editSpot.pendingChangesFrom && (
                          <span className="text-xs text-muted-foreground">
                            od {new Date(editSpot.pendingChangesFrom).toLocaleString("sr-RS")}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{showPendingDetails ? "▲" : "▼"}</span>
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => applyPendingMutation.mutate(editSpot.id)}
                        disabled={applyPendingMutation.isPending}
                        data-testid="button-apply-pending"
                      >
                        {applyPendingMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Primeni odmah
                      </Button>
                    </div>
                    {showPendingDetails && (
                      <div className="rounded-md border border-border divide-y divide-border overflow-hidden">
                        {changedKeys.map((key) => {
                          const oldVal = (editSpot as unknown as Record<string, unknown>)[key];
                          const newVal = pending[key];
                          const label = fieldLabels[key] || key;
                          const fmt = (v: unknown) => {
                            if (v === null || v === undefined) return "—";
                            if (typeof v === "boolean") return v ? "Da" : "Ne";
                            return String(v);
                          };
                          return (
                            <div key={key} className="flex items-start gap-3 px-3 py-2 text-xs bg-surface">
                              <span className="text-muted-foreground w-24 shrink-0 pt-0.5">{label}</span>
                              <span className="text-destructive line-through break-all">{fmt(oldVal)}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-green-400 break-all">{fmt(newVal)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Image upload section */}
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium">Slike parkinga</p>
                {editUploadedImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {editUploadedImages.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                        <img src={img.startsWith("http") ? img : `/api/images/${img}`} alt={`Slika ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 transition-colors"
                          onClick={() => editSpot && deleteImageMutation.mutate({ spotId: editSpot.id, imageUrl: img })}
                          disabled={deleteImageMutation.isPending}
                          data-testid={`button-delete-image-${i}`}
                          title="Obriši sliku"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {editUploadedImages.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nema slika.</p>
                )}
                {editUploadedImages.length < 5 && (
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760}
                    onGetUploadParameters={async () => {
                      const response = await apiRequest("POST", "/api/objects/upload", {});
                      return { method: "PUT" as const, url: response.uploadURL };
                    }}
                    onComplete={async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
                      const uploadURL = result.successful?.[0]?.uploadURL;
                      if (uploadURL && editSpot) {
                        const resp = await apiRequest("PUT", `/api/parking-spots/${editSpot.id}/images`, { imageURL: uploadURL });
                        setEditUploadedImages(resp.imageUrls || []);
                        toast({ title: `Slika dodata (${(resp.imageUrls || []).length}/5)` });
                      }
                    }}
                    buttonClassName="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Dodaj sliku ({editUploadedImages.length}/5)
                  </ObjectUploader>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowEditDialog(false); setEditSpot(null); setEditUploadedImages([]); }} data-testid="button-edit-spot-cancel">Otkaži</Button>
                <Button className="flex-1" onClick={() => fullEditMutation.mutate({ id: editSpot.id, data: editForm })} disabled={fullEditMutation.isPending} data-testid="button-edit-spot-save">
                  {fullEditMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sačuvaj"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCoordSpot} onOpenChange={(open) => { if (!open) setEditCoordSpot(null); }}>
        <DialogContent className="max-w-md" data-testid="modal-edit-coords">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent" />
              Uredi koordinate
            </DialogTitle>
          </DialogHeader>
          {editCoordSpot && (
            <div className="space-y-3 pt-2">
              <div>
                <p className="text-sm font-medium text-foreground">{editCoordSpot.title}</p>
                <p className="text-xs text-muted-foreground">{editCoordSpot.address}</p>
              </div>
              {editLat && editLng && parseFloat(editLat) && parseFloat(editLng) && (
                <DraggableLocationMap
                  latitude={parseFloat(editLat)}
                  longitude={parseFloat(editLng)}
                  onPositionChange={(lat, lng) => {
                    setEditLat(lat.toFixed(7));
                    setEditLng(lng.toFixed(7));
                  }}
                  height="220px"
                  hint="Prevucite pin na tačnu lokaciju"
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Latitude</label>
                  <Input
                    value={editLat}
                    onChange={(e) => setEditLat(e.target.value)}
                    placeholder="45.2417301"
                    className="text-sm"
                    data-testid="input-edit-lat"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Longitude</label>
                  <Input
                    value={editLng}
                    onChange={(e) => setEditLng(e.target.value)}
                    placeholder="19.8107777"
                    className="text-sm"
                    data-testid="input-edit-lng"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditCoordSpot(null)}
                  data-testid="button-edit-coords-cancel"
                >
                  Otkaži
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => updateCoordsMutation.mutate({ id: editCoordSpot.id, latitude: editLat, longitude: editLng })}
                  disabled={updateCoordsMutation.isPending || !editLat || !editLng}
                  data-testid="button-edit-coords-save"
                >
                  {updateCoordsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sačuvaj"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
