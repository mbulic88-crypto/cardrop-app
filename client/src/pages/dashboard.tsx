import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User, ParkingSpot, SalesListing, Message, Booking, Review } from "@shared/schema";
import {
  MapPin, Edit2, Trash2, LogOut, Bell, BellOff, Sparkles, Tag, Ruler, Phone,
  ArrowUpCircle, MessageSquare, Send, ArrowLeft, Check, CheckCheck, Shield,
  TriangleAlert, LayoutDashboard, Calendar, User as UserIcon, Download,
  TrendingUp, Activity, ChevronRight, Star, AlertTriangle, Wallet, Plus,
  History, ArrowDownCircle, DoorOpen, Loader2,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { useLanguage } from "@/hooks/useLanguage";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";

type Section = 'overview' | 'spots' | 'bookings' | 'messages' | 'sales' | 'profile';

type OwnerBooking = {
  id: string; spotId: string; spotTitle: string;
  renterId: string; renterFirstName: string | null; renterLastName: string | null;
  licensePlate: string | null; renterPhone: string | null; spaceNumber: number;
  startTime: string; endTime: string; totalPrice: string; currency: string;
  status: string; paymentStatus: string; paymentMethod: string | null; createdAt: string | null;
};

// Payout helpers — 35 RSD ≈ €0.30 Stripe per-transaction fee
const APP_FEE = 0.15;
const INSTANT_STRIPE_PCT = 0.039;
const INSTANT_STRIPE_FIXED = 35; // RSD
const CREDIT_STRIPE_PCT = 0.015;

function calcPayout(price: number, method: string | null): { neto: number; stripeFee: number; appFee: number } {
  const appFee = price * APP_FEE;
  if (method === 'instant') {
    // Stripe fee is already charged to the customer on top of the price,
    // so the platform receives ~price net from Stripe — do not deduct again.
    const stripeFee = price * INSTANT_STRIPE_PCT + INSTANT_STRIPE_FIXED;
    return { neto: price - appFee, stripeFee, appFee };
  }
  if (method === 'credit') {
    const stripeFee = price * CREDIT_STRIPE_PCT;
    return { neto: price - appFee - stripeFee, stripeFee, appFee };
  }
  // cash — no Stripe fee
  return { neto: price - appFee, stripeFee: 0, appFee };
}

const TAB_MAP: Record<string, Section> = {
  spots: 'spots', bookings: 'bookings', messages: 'messages',
  sales: 'sales', profile: 'profile',
};

const STATUS_LABELS_SR: Record<string, string> = {
  pending: 'Na čekanju', confirmed: 'Potvrđena', completed: 'Završena', cancelled: 'Otkazana',
};
const STATUS_LABELS_EN: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

type QuickFilter = 'week' | 'month' | 'lastmonth' | 'all';

const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
});


type DashT = {
  myAccount: string; loading: string; logout: string;
  gateOpening: string; signalSent: string; cannotOpen: string; error: string;
  openGateTitle: string; gateWindow: string; openRamp: string; openRampOut: string; open: string;
  creditAdded: string; creditAddedDesc: (a: string, b: string) => string;
  verifyError: string; contactSupport: string;
  pushOff: string; pushOffDesc: string; pushOn: string; pushOnDesc: string; pushError: string;
  paymentError: string; messageSent: string; messageError: string;
  profileSaved: string; profileError: string; deleteAccountError: string;
  nicknameSaved: string; cooldownActive: string; nicknameError: string;
  spotDeleted: string; spotDeleteError: string; saleDeleted: string; saleDeleteError: string; upgradeError: string;
  statusPending: string; statusConfirmed: string; statusCompleted: string; statusCancelled: string;
  welcome: string; accountOverview: string; totalEarnings: string; rsdAllTime: string;
  monthEarnings: string; rsdConfirmed: string; activeBookings: string; currentlyConfirmed: string;
  avgRating: string; noRatings: string; ratingsCount: (n: number) => string;
  recentBookings: string; seeAll: string; noOwnerBookings: string;
  mySpots: string; addNewSpot: string; noSpots: string; addSpot: string;
  topSpot: string; featured: string; active: string; inactive: string;
  bookingsTotal: (n: number) => string; spaces: (n: number) => string;
  edit: string; deleteSpot: string; irreversible: string; cancel: string; delete: string;
  bookingsTitle: string; receivedTab: string; myBookingsTab: string;
  thisWeek: string; thisMonth: string; lastMonth: string; allTime: string;
  from: string; to: string; clearFilter: string; exportCsv: string; forPayout: string;
  payoutTitle: (n: number) => string; afterFees: string; afterCredit: string;
  totalPayout: string; fromTotal: (n: string) => string; noBookingsPeriod: string;
  colParking: string; colTenant: string; colPeriod: string; colPriceNet: string;
  colStatus: string; colGate: string; colPrice: string;
  space: (n: number) => string; net: string;
  noMyBookings: string; findSpot: string; bookingDetails: string; bookingInfo: string;
  labelParking: string; labelStatus: string; labelAddress: string; labelOwnerContact: string; labelPeriod: string; labelAmount: string; labelNote: string;
  gateRamp: string; rampNote: string;
  browseSpots: string; credit: string; instant: string;
  messages: string; loadingMsg: string; noMessages: string; messagesDesc: string;
  convoNotFound: string; back: string; you: string; replyPlaceholder: string;
  mySales: string; addSale: string; noSales: string; listSale: string;
  salePropGarage: string; salePropOpen: string; salePropClosed: string; salePropTruck: string;
  salePropBuilding: string; salePropWarehouse: string; salePropOther: string;
  profile: string; backToMap: string; myData: string;
  firstName: string; firstNamePh: string; lastName: string; lastNamePh: string;
  phone: string; phonePh: string; trialLabel: string; trialUsed: string; trialAvail: string;
  pushBlocked: string; pushBlockedDesc: string; pushNotifications: string; pushActive: string; pushOff2: string;
  saving: string; saveChanges: string; mapNickname: string; mapNicknameDesc: string;
  cooldownMsg: (days: number, date: string) => string; nicknamePh: string;
  savingNick: string; saveNick: string; wallet: string; walletDesc: string;
  availBalance: string; topup: string; txHistory: string; txTopup: string; txBooking: string;
  dangerZone: string; dangerDesc: string; deleteAccount: string;
  deleteConfirmTitle: string; deleteConfirmDesc: string; deleteConfirmBold: string; deleteConfirmDesc2: string;
  deletingAccount: string; confirmDelete: string;
  accountDeletedTitle: string; accountDeletedSub: string; accountDeletedNoSub: string; ok: string;
};

const dashT: { sr: DashT; en: DashT } = {
  sr: {
    myAccount: 'Moj Nalog', loading: 'Učitavanje...', logout: 'Odjava',
    gateOpening: 'Kapija se otvara!', signalSent: 'Signal je poslat.',
    cannotOpen: 'Nije moguće otvoriti', error: 'Greška',
    openGateTitle: 'Otvori kapiju', gateWindow: 'Kapija dostupna ±10 min od rezervacije',
    openRamp: 'Otvori rampu', openRampOut: 'Otvori rampu (van prozora)', open: 'Otvori',
    creditAdded: 'Kredit dodat!', creditAddedDesc: (a, b) => `Dodato ${a} RSD. Novi balans: ${b} RSD`,
    verifyError: 'Greška pri verifikaciji', contactSupport: 'Kontaktirajte podršku.',
    pushOff: 'Obaveštenja isključena', pushOffDesc: 'Nećete više primati push obaveštenja',
    pushOn: 'Obaveštenja uključena', pushOnDesc: 'Primaćete obaveštenja o novim porukama i rezervacijama',
    pushError: 'Nije moguće uključiti obaveštenja. Proverite dozvole u pretraživaču.',
    paymentError: 'Nije moguće pokrenuti plaćanje',
    messageSent: 'Poruka poslata', messageError: 'Nije moguće poslati poruku',
    profileSaved: 'Profil je ažuriran', profileError: 'Nije moguće ažurirati profil',
    deleteAccountError: 'Greška pri brisanju naloga',
    nicknameSaved: 'Nadimak na mapi je promenjen',
    cooldownActive: 'Cooldown aktivan', nicknameError: 'Nije moguće promeniti nadimak',
    spotDeleted: 'Parking mesto je izbrisano', spotDeleteError: 'Nije moguće obrisati parking mesto',
    saleDeleted: 'Oglas prodaje je izbrisan', saleDeleteError: 'Nije moguće obrisati oglas',
    upgradeError: 'Nije moguće pokrenuti nadogradnju',
    statusPending: 'Na čekanju', statusConfirmed: 'Potvrđena', statusCompleted: 'Završena', statusCancelled: 'Otkazana',
    welcome: 'Dobrodošli', accountOverview: 'Pregled vašeg naloga',
    totalEarnings: 'Ukupna zarada', rsdAllTime: 'RSD (svo vreme)',
    monthEarnings: 'Zarada ovog meseca', rsdConfirmed: 'RSD (potvrđene)',
    activeBookings: 'Aktivne rezervacije', currentlyConfirmed: 'Trenutno potvrđene',
    avgRating: 'Prosečna ocena', noRatings: 'Nema ocena', ratingsCount: (n) => `${n} ocena`,
    recentBookings: 'Poslednje rezervacije', seeAll: 'Sve', noOwnerBookings: 'Još nema rezervacija na vašim parking mestima.',
    mySpots: 'Moja Parking Mesta', addNewSpot: 'Dodaj Novo Mesto', noSpots: 'Nemate aktivnih parking mesta',
    addSpot: 'Dodaj Parking Mesto', topSpot: 'Top lokacija', featured: 'Istaknuto',
    active: 'Aktivno', inactive: 'Neaktivno',
    bookingsTotal: (n) => `${n} rezervacija ukupno`, spaces: (n) => `${n} mesta`,
    edit: 'Izmeni', deleteSpot: 'Obriši parking mesto?', irreversible: 'Ova akcija je nepovratna.',
    cancel: 'Otkaži', delete: 'Obriši',
    bookingsTitle: 'Rezervacije i Zarada', receivedTab: 'Primljene rezervacije', myBookingsTab: 'Moje rezervacije',
    thisWeek: 'Ova nedelja', thisMonth: 'Ovaj mesec', lastMonth: 'Prošli mesec', allTime: 'Sve',
    from: 'Od', to: 'Do', clearFilter: 'Obriši filter', exportCsv: 'Izvezi CSV', forPayout: 'Za isplatu',
    payoutTitle: (n) => `Obračun isplate — ${n} rezervacija`,
    afterFees: 'posle 15% app provizije (Stripe naknada naplaćena kupcu)', afterCredit: 'posle 15% app + 1.5% Stripe',
    totalPayout: 'Ukupno za isplatu', fromTotal: (n) => `od ${n} RSD ukupno`,
    noBookingsPeriod: 'Nema rezervacija u izabranom periodu',
    colParking: 'Parking', colTenant: 'Stanar', colPeriod: 'Period',
    colPriceNet: 'Cena / Neto', colStatus: 'Status', colGate: 'Kapija', colPrice: 'Cena',
    space: (n) => `Mesto ${n}`, net: 'neto',
    noMyBookings: 'Niste još napravili nijednu rezervaciju', findSpot: 'Pronađi parking mesto',
    bookingDetails: 'Detalji Rezervacije', bookingInfo: 'Informacije o vašoj rezervaciji',
    labelParking: 'Parking', labelStatus: 'Status', labelAddress: 'Adresa',
    labelOwnerContact: 'Kontakt vlasnika', labelPeriod: 'Period', labelNote: 'Napomena',
    gateRamp: 'Kapija / rampa', rampNote: 'Dostupno ±10 min od vremena rezervacije',
    labelAmount: 'Iznos', browseSpots: 'Pregledaj parking mesta', credit: 'Kredit', instant: 'Instant',
    messages: 'Poruke', loadingMsg: 'Učitavanje...', noMessages: 'Nemate poruka',
    messagesDesc: 'Poruke sa vlasnicima parking mesta pojavit će se ovde.',
    convoNotFound: 'Razgovor nije pronađen', back: 'Nazad', you: 'Vi: ', replyPlaceholder: 'Napišite odgovor...',
    mySales: 'Moji Oglasi Prodaje', addSale: 'Dodaj Novi Oglas',
    noSales: 'Nemate aktivnih oglasa prodaje', listSale: 'Oglasi Prodaju',
    salePropGarage: 'Garaža', salePropOpen: 'Otvoreno PM', salePropClosed: 'Zatvoreno PM',
    salePropTruck: 'Parking za kamione', salePropBuilding: 'Garažno mesto',
    salePropWarehouse: 'Magacinski prostor', salePropOther: 'Ostalo',
    profile: 'Profil', backToMap: 'Nazad na mapu', myData: 'Moji Podaci',
    firstName: 'Ime', firstNamePh: 'Vaše ime', lastName: 'Prezime', lastNamePh: 'Vaše prezime',
    phone: 'Telefon', phonePh: 'Vaš telefon',
    trialLabel: 'Probni Period', trialUsed: 'Već iskorišćen', trialAvail: 'Dostupan',
    pushBlocked: 'Push Obaveštenja su blokirana',
    pushBlockedDesc: 'Idite na Podešavanja → Aplikacije → Chrome → Obaveštenja i dozvolite notifikacije.',
    pushNotifications: 'Push Obaveštenja', pushActive: 'Aktivna', pushOff2: 'Isključena',
    saving: 'Čuvanje...', saveChanges: 'Sačuvaj Izmene',
    mapNickname: 'Nadimak na Mapi',
    mapNicknameDesc: 'Tvoje ime koje se prikazuje u Map Hack NS. Može se menjati jednom u 30 dana.',
    cooldownMsg: (days, date) => `Možeš da menjaš nadimak za ${days} ${days === 1 ? 'dan' : 'dana'} (${date})`,
    nicknamePh: 'Nadimak (3–20 znakova, a-z 0-9 _ -)',
    savingNick: 'Čuvanje...', saveNick: 'Sačuvaj',
    wallet: 'Moj novčanik', walletDesc: 'Kredit za plaćanje parkinga na Map Hack NS.',
    availBalance: 'Dostupan balans', topup: 'Dopuni kredit',
    txHistory: 'Istorija transakcija', txTopup: 'Dopuna', txBooking: 'Rezervacija',
    dangerZone: 'Opasna zona', dangerDesc: 'Trajno brišeš svoj nalog i sve podatke. Ova akcija je nepovratna.',
    deleteAccount: 'Obriši nalog',
    deleteConfirmTitle: 'Sigurno želiš da obrišeš nalog?',
    deleteConfirmDesc: 'Ova akcija je ', deleteConfirmBold: 'nepovratna',
    deleteConfirmDesc2: '. Svi tvoji podaci biće trajno obrisani.',
    deletingAccount: 'Brisanje...', confirmDelete: 'Da, obriši nalog',
    accountDeletedTitle: 'Nalog je obrisan',
    accountDeletedSub: 'Vaš nalog je uspješno obrisan. Vaša pretplata je automatski prekinuta.',
    accountDeletedNoSub: 'Vaš nalog je uspješno obrisan. Svi vaši podaci su trajno uklonjeni.',
    ok: 'U redu',
  },
  en: {
    myAccount: 'My Account', loading: 'Loading...', logout: 'Log out',
    gateOpening: 'Gate is opening!', signalSent: 'Signal sent.',
    cannotOpen: 'Cannot open gate', error: 'Error',
    openGateTitle: 'Open gate', gateWindow: 'Gate available ±10 min from booking',
    openRamp: 'Open ramp', openRampOut: 'Open ramp (outside window)', open: 'Open',
    creditAdded: 'Credit added!', creditAddedDesc: (a, b) => `Added ${a} RSD. New balance: ${b} RSD`,
    verifyError: 'Verification error', contactSupport: 'Please contact support.',
    pushOff: 'Notifications disabled', pushOffDesc: 'You will no longer receive push notifications',
    pushOn: 'Notifications enabled', pushOnDesc: 'You will receive notifications for new messages and bookings',
    pushError: 'Cannot enable notifications. Check browser permissions.',
    paymentError: 'Cannot start payment',
    messageSent: 'Message sent', messageError: 'Cannot send message',
    profileSaved: 'Profile updated', profileError: 'Cannot update profile',
    deleteAccountError: 'Error deleting account',
    nicknameSaved: 'Map nickname changed',
    cooldownActive: 'Cooldown active', nicknameError: 'Cannot change nickname',
    spotDeleted: 'Parking spot deleted', spotDeleteError: 'Cannot delete parking spot',
    saleDeleted: 'Sale listing deleted', saleDeleteError: 'Cannot delete listing',
    upgradeError: 'Cannot start upgrade',
    statusPending: 'Pending', statusConfirmed: 'Confirmed', statusCompleted: 'Completed', statusCancelled: 'Cancelled',
    welcome: 'Welcome', accountOverview: 'Your account overview',
    totalEarnings: 'Total earnings', rsdAllTime: 'RSD (all time)',
    monthEarnings: 'This month earnings', rsdConfirmed: 'RSD (confirmed)',
    activeBookings: 'Active bookings', currentlyConfirmed: 'Currently confirmed',
    avgRating: 'Average rating', noRatings: 'No ratings', ratingsCount: (n) => `${n} rating${n === 1 ? '' : 's'}`,
    recentBookings: 'Recent bookings', seeAll: 'All', noOwnerBookings: 'No bookings on your spots yet.',
    mySpots: 'My Parking Spots', addNewSpot: 'Add New Spot', noSpots: 'You have no active parking spots',
    addSpot: 'Add Parking Spot', topSpot: 'Top spot', featured: 'Featured',
    active: 'Active', inactive: 'Inactive',
    bookingsTotal: (n) => `${n} booking${n === 1 ? '' : 's'} total`, spaces: (n) => `${n} space${n === 1 ? '' : 's'}`,
    edit: 'Edit', deleteSpot: 'Delete parking spot?', irreversible: 'This action is irreversible.',
    cancel: 'Cancel', delete: 'Delete',
    bookingsTitle: 'Bookings & Earnings', receivedTab: 'Received bookings', myBookingsTab: 'My bookings',
    thisWeek: 'This week', thisMonth: 'This month', lastMonth: 'Last month', allTime: 'All',
    from: 'From', to: 'To', clearFilter: 'Clear filter', exportCsv: 'Export CSV', forPayout: 'For payout',
    payoutTitle: (n) => `Payout summary — ${n} bookings`,
    afterFees: 'after 15% app fee (Stripe fee charged to customer)', afterCredit: 'after 15% app + 1.5% Stripe',
    totalPayout: 'Total payout', fromTotal: (n) => `from ${n} RSD total`,
    noBookingsPeriod: 'No bookings in the selected period',
    colParking: 'Parking', colTenant: 'Renter', colPeriod: 'Period',
    colPriceNet: 'Price / Net', colStatus: 'Status', colGate: 'Gate', colPrice: 'Price',
    space: (n) => `Space ${n}`, net: 'net',
    noMyBookings: 'You have not made any bookings yet', findSpot: 'Find parking spot',
    bookingDetails: 'Booking Details', bookingInfo: 'Information about your booking',
    labelParking: 'Parking', labelStatus: 'Status', labelAddress: 'Address',
    labelOwnerContact: 'Owner contact', labelPeriod: 'Period', labelNote: 'Note',
    gateRamp: 'Gate / ramp', rampNote: 'Available ±10 min from booking time',
    labelAmount: 'Amount', browseSpots: 'Browse parking spots', credit: 'Credit', instant: 'Instant',
    messages: 'Messages', loadingMsg: 'Loading...', noMessages: 'No messages',
    messagesDesc: 'Messages from parking spot owners will appear here.',
    convoNotFound: 'Conversation not found', back: 'Back', you: 'You: ', replyPlaceholder: 'Write a reply...',
    mySales: 'My Sale Listings', addSale: 'Add New Listing',
    noSales: 'You have no active sale listings', listSale: 'List for Sale',
    salePropGarage: 'Garage', salePropOpen: 'Open PM', salePropClosed: 'Closed PM',
    salePropTruck: 'Truck parking', salePropBuilding: 'Building garage',
    salePropWarehouse: 'Warehouse space', salePropOther: 'Other',
    profile: 'Profile', backToMap: 'Back to map', myData: 'My Information',
    firstName: 'First name', firstNamePh: 'Your first name', lastName: 'Last name', lastNamePh: 'Your last name',
    phone: 'Phone', phonePh: 'Your phone',
    trialLabel: 'Trial Period', trialUsed: 'Already used', trialAvail: 'Available',
    pushBlocked: 'Push Notifications are blocked',
    pushBlockedDesc: 'Go to Settings → Apps → Chrome → Notifications and allow notifications.',
    pushNotifications: 'Push Notifications', pushActive: 'Active', pushOff2: 'Disabled',
    saving: 'Saving...', saveChanges: 'Save Changes',
    mapNickname: 'Map Nickname',
    mapNicknameDesc: 'Your display name in Map Hack NS. Can be changed once every 30 days.',
    cooldownMsg: (days, date) => `You can change nickname in ${days} day${days === 1 ? '' : 's'} (${date})`,
    nicknamePh: 'Nickname (3–20 chars, a-z 0-9 _ -)',
    savingNick: 'Saving...', saveNick: 'Save',
    wallet: 'My Wallet', walletDesc: 'Credit for parking payments on Map Hack NS.',
    availBalance: 'Available balance', topup: 'Top up credit',
    txHistory: 'Transaction history', txTopup: 'Top-up', txBooking: 'Booking',
    dangerZone: 'Danger zone', dangerDesc: 'Permanently delete your account and all data. This action is irreversible.',
    deleteAccount: 'Delete account',
    deleteConfirmTitle: 'Are you sure you want to delete your account?',
    deleteConfirmDesc: 'This action is ', deleteConfirmBold: 'irreversible',
    deleteConfirmDesc2: '. All your data will be permanently deleted.',
    deletingAccount: 'Deleting...', confirmDelete: 'Yes, delete account',
    accountDeletedTitle: 'Account deleted',
    accountDeletedSub: 'Your account has been deleted. Your subscription was automatically cancelled.',
    accountDeletedNoSub: 'Your account has been deleted. All your data has been permanently removed.',
    ok: 'OK',
  },
};

function RampCell({ spotId, bookingId, large, language }: { spotId: string; bookingId: string; large?: boolean; language: string }) {
  const t = dashT[language === "sr" ? "sr" : "en"];
  const STATUS_LABELS = language === "sr" ? STATUS_LABELS_SR : STATUS_LABELS_EN;
  const { toast } = useToast();
  const { data: rampStatus, refetch } = useQuery<{
    canOpen: boolean; reason?: string; cooldownLeft?: number;
  }>({
    queryKey: ["/api/parking-spots", spotId, "ramp-status"],
    queryFn: async () => {
      const res = await fetch(`/api/parking-spots/${spotId}/ramp-status`, { credentials: "include" });
      if (!res.ok) return { canOpen: false };
      return res.json();
    },
    refetchInterval: 15_000,
  });

  const openRampMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/parking-spots/${spotId}/open-ramp`, {}),
    onSuccess: () => {
      toast({ title: t.gateOpening, description: t.signalSent });
      setTimeout(() => refetch(), 3000);
    },
    onError: (error: any) => {
      const msg = error?.body?.message || error?.message || t.cannotOpen;
      toast({ title: t.error, description: msg, variant: "destructive" });
    },
  });

  const canOpen = rampStatus?.canOpen ?? false;

  if (large) {
    return (
      <Button
        className={`w-full gap-2 ${canOpen ? "bg-green-700 hover:bg-green-600 text-white border-green-600" : "opacity-50 bg-green-900 text-green-200 border-green-800"}`}
        disabled={openRampMutation.isPending || !canOpen}
        onClick={(e) => { e.stopPropagation(); if (canOpen) openRampMutation.mutate(); }}
        data-testid={`button-open-ramp-dialog-${bookingId}`}
        title={canOpen ? t.openGateTitle : t.gateWindow}
      >
        {openRampMutation.isPending
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <DoorOpen className="w-4 h-4" />}
        {canOpen ? t.openRamp : t.openRampOut}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      data-testid={`button-open-ramp-${bookingId}`}
      disabled={openRampMutation.isPending || !canOpen}
      onClick={(e) => { e.stopPropagation(); if (canOpen) openRampMutation.mutate(); }}
      className={`gap-1.5 text-xs ${canOpen ? "" : "opacity-40"}`}
      title={canOpen ? t.openGateTitle : t.gateWindow}
    >
      {openRampMutation.isPending
        ? <Loader2 className="w-3 h-3 animate-spin" />
        : <DoorOpen className="w-3 h-3" />}
      {t.open}
    </Button>
  );
}

export default function Dashboard() {
  const { isAuthenticated, isLoading, user: authUser } = useAuth();
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const t = dashT[language === "sr" ? "sr" : "en"];
  const STATUS_LABELS = language === "sr" ? STATUS_LABELS_SR : STATUS_LABELS_EN;
  const { toast } = useToast();
  const [accountDeletedInfo, setAccountDeletedInfo] = useState<{ hadSubscription: boolean } | null>(null);
  const { isSupported: pushSupported, isSubscribed, subscribe, unsubscribe, isLoading: pushLoading, permission: pushPermission } = usePushNotifications();

  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  const [activeSection, setActiveSection] = useState<Section>((tabParam && TAB_MAP[tabParam]) || 'overview');

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [bookingsTab, setBookingsTab] = useState<'received' | 'mine'>('mine');
  const [payMethodFilter, setPayMethodFilter] = useState<'all' | 'instant' | 'credit'>('all');
  const [showPayoutCard, setShowPayoutCard] = useState(false);
  const [mapNicknameInput, setMapNicknameInput] = useState('');
  const [creditVerified, setCreditVerified] = useState(false);

  // Auto-verify credit topup session from Stripe redirect
  useEffect(() => {
    const creditSessionId = urlParams.get('credit_session');
    if (!creditSessionId || !isAuthenticated || creditVerified) return;
    setCreditVerified(true);
    apiRequest("POST", "/api/credits/verify", { sessionId: creditSessionId })
      .then((data: any) => {
        if (data?.success && !data?.alreadyConsumed) {
          toast({ title: t.creditAdded, description: t.creditAddedDesc(data.amountRsd?.toLocaleString() ?? '0', data.balance?.toLocaleString() ?? '0') });
        }
        refetchWallet();
        queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete('credit_session');
        window.history.replaceState({}, '', url.toString());
      })
      .catch(() => toast({ title: t.verifyError, description: t.contactSupport, variant: "destructive" }));
  }, [isAuthenticated]);

  const handlePushToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) toast({ title: t.pushOff, description: t.pushOffDesc });
    } else {
      const success = await subscribe();
      if (success) {
        toast({ title: t.pushOn, description: t.pushOnDesc });
      } else {
        toast({ title: t.error, description: t.pushError, variant: "destructive" });
      }
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !accountDeletedInfo) setLocation("/");
  }, [isAuthenticated, isLoading, setLocation, accountDeletedInfo]);

  useEffect(() => {
    if (isAuthenticated && pushSupported && !isSubscribed && !pushLoading) {
      const autoPrompted = sessionStorage.getItem('push-auto-prompted');
      if (!autoPrompted) {
        sessionStorage.setItem('push-auto-prompted', '1');
        subscribe();
      }
    }
  }, [isAuthenticated, pushSupported, isSubscribed, pushLoading]);

  const { data: user } = useQuery<User>({ queryKey: ["/api/auth/user"], enabled: isAuthenticated });
  const { data: mySpots = [] } = useQuery<ParkingSpot[]>({ queryKey: ["/api/parking-spots/my-spots"], enabled: isAuthenticated, staleTime: 0, refetchOnMount: "always" });
  const { data: mySalesListings = [] } = useQuery<SalesListing[]>({ queryKey: ["/api/sales-listings/my-listings"], enabled: isAuthenticated });
  const { data: ownerBookings = [] } = useQuery<OwnerBooking[]>({ queryKey: ["/api/bookings/owner-received"], enabled: isAuthenticated });
  type EnrichedBooking = Booking & { spotTitle?: string | null; spotAddress?: string | null; spotPhone?: string | null; spotHasRamp?: boolean; notes?: string | null };
  const { data: myBookings = [] } = useQuery<EnrichedBooking[]>({ queryKey: ["/api/bookings"], enabled: isAuthenticated });
  const [selectedBooking, setSelectedBooking] = useState<EnrichedBooking | null>(null);
  const { data: ownerReviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/reviews/owner", user?.id],
    enabled: !!user?.id,
  });

  type WalletData = { balance: number; transactions: { id: string; amount: number; type: string; description: string | null; createdAt: string | null }[] };
  const { data: walletData, refetch: refetchWallet } = useQuery<WalletData>({
    queryKey: ["/api/credits/balance"], enabled: isAuthenticated,
  });

  const creditCheckoutMutation = useMutation({
    mutationFn: (pkg: string) => apiRequest("POST", "/api/credits/checkout", { package: pkg }),
    onSuccess: (data: { url?: string }) => { if (data?.url) window.location.href = data.url; },
    onError: () => toast({ title: t.error, description: t.paymentError, variant: "destructive" }),
  });

  type EnrichedMessage = Message & { senderName?: string; receiverName?: string; spotTitle?: string | null };
  const { data: allMessages = [], isLoading: messagesLoading } = useQuery<EnrichedMessage[]>({
    queryKey: ["/api/messages"], enabled: isAuthenticated, refetchInterval: 30000,
  });

  const replyMutation = useMutation({
    mutationFn: async (data: { receiverId: string; spotId?: string | null; content: string }) =>
      await apiRequest("POST", "/api/messages", data),
    onSuccess: () => {
      setReplyContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: t.messageSent });
    },
    onError: () => toast({ title: t.error, description: t.messageError, variant: "destructive" }),
  });

  const markReadMutation = useMutation({
    mutationFn: (messageId: string) => apiRequest("PUT", `/api/messages/${messageId}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/messages"] }),
  });

  type ConversationPartner = {
    key: string; otherId: string; otherName: string;
    lastMessage: EnrichedMessage; unreadCount: number;
    messages: EnrichedMessage[]; spotId?: string | null; spotTitle?: string | null;
  };

  const conversations: ConversationPartner[] = useMemo(() => {
    if (!user || !allMessages.length) return [];
    const grouped: Record<string, ConversationPartner> = {};
    for (const msg of allMessages) {
      const otherId = msg.senderId === user.id ? msg.receiverId : msg.senderId;
      const otherName = msg.senderId === user.id ? (msg.receiverName || 'Korisnik') : (msg.senderName || 'Korisnik');
      const key = msg.spotId ? `${otherId}-${msg.spotId}` : otherId;
      if (!grouped[key]) {
        grouped[key] = { key, otherId, otherName, lastMessage: msg, unreadCount: 0, messages: [], spotId: msg.spotId, spotTitle: msg.spotTitle };
      }
      grouped[key].messages.push(msg);
      if (!msg.isRead && msg.receiverId === user.id) grouped[key].unreadCount++;
      if (msg.createdAt && grouped[key].lastMessage.createdAt && new Date(msg.createdAt) > new Date(grouped[key].lastMessage.createdAt!)) {
        grouped[key].lastMessage = msg;
      }
    }
    return Object.values(grouped).sort((a, b) => new Date(b.lastMessage.createdAt!).getTime() - new Date(a.lastMessage.createdAt!).getTime());
  }, [user, allMessages]);

  const activeConversation = selectedConversation ? conversations.find(c => c.key === selectedConversation) : null;

  useEffect(() => {
    if (activeConversation && user) {
      activeConversation.messages.forEach(msg => {
        if (!msg.isRead && msg.receiverId === user.id) markReadMutation.mutate(msg.id);
      });
    }
  }, [selectedConversation, allMessages]);

  const totalUnread = allMessages.filter(m => !m.isRead && m.receiverId === user?.id).length;

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName || "", lastName: user?.lastName || "", phoneNumber: user?.phoneNumber || "" },
  });

  useEffect(() => {
    if (user) {
      form.reset({ firstName: user.firstName || "", lastName: user.lastName || "", phoneNumber: user.phoneNumber || "" });
      setMapNicknameInput(user.mapNickname || "");
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: z.infer<typeof profileSchema>) => apiRequest("PUT", "/api/users/profile", data),
    onSuccess: () => {
      toast({ title: t.profileSaved });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => toast({ title: t.error, description: t.profileError, variant: "destructive" }),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/users/me"),
    onSuccess: () => setAccountDeletedInfo({ hadSubscription: !!(authUser?.stripeSubscriptionId) }),
    onError: () => toast({ title: t.deleteAccountError, variant: "destructive" }),
  });

  const updateMapNicknameMutation = useMutation({
    mutationFn: (nickname: string) =>
      apiRequest("PATCH", "/api/map-hack/profile", {
        mapNickname: nickname,
        mapAvatarId: user?.mapAvatarId || 1,
      }),
    onSuccess: () => {
      toast({ title: t.nicknameSaved });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      const body = error?.body || error;
      if (body?.error === 'cooldown' && body?.nextAllowed) {
        const next = new Date(body.nextAllowed);
        const daysLeft = Math.ceil((next.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        toast({
          title: t.cooldownActive,
          description: t.cooldownMsg(daysLeft, next.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-GB')),
          variant: "destructive",
        });
      } else {
        toast({ title: t.error, description: body?.message || t.nicknameError, variant: "destructive" });
      }
    },
  });

  const deleteSpotMutation = useMutation({
    mutationFn: (spotId: string) => apiRequest("DELETE", `/api/parking-spots/${spotId}`, {}),
    onSuccess: () => {
      toast({ title: t.spotDeleted });
      queryClient.invalidateQueries({ queryKey: ["/api/parking-spots/my-spots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parking-spots"] });
    },
    onError: () => toast({ title: t.error, description: t.spotDeleteError, variant: "destructive" }),
  });

  const upgradeMutation = useMutation({
    mutationFn: ({ spotId, tier }: { spotId: string; tier: 'silver' | 'gold' }) =>
      apiRequest("POST", "/api/stripe/create-checkout-existing", { spotId, tier }),
    onSuccess: (data: { url?: string }) => { if (data.url) window.location.href = data.url; },
    onError: () => toast({ title: t.error, description: t.upgradeError, variant: "destructive" }),
  });

  const deleteSaleListingMutation = useMutation({
    mutationFn: (listingId: string) => apiRequest("DELETE", `/api/sales-listings/${listingId}`, {}),
    onSuccess: () => {
      toast({ title: t.saleDeleted });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-listings/my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-listings"] });
    },
    onError: () => toast({ title: t.error, description: t.saleDeleteError, variant: "destructive" }),
  });

  // Per-spot booking count (all statuses)
  const bookingsPerSpot = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of ownerBookings) {
      counts[b.spotId] = (counts[b.spotId] || 0) + 1;
    }
    return counts;
  }, [ownerBookings]);

  // Compute earnings from owner-received bookings
  const totalEarnings = useMemo(() =>
    ownerBookings
      .filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + parseFloat(b.totalPrice || '0'), 0),
    [ownerBookings]
  );

  const earningsThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return ownerBookings
      .filter(b =>
        (b.status === 'confirmed' || b.status === 'completed') &&
        new Date(b.startTime) >= startOfMonth
      )
      .reduce((sum, b) => sum + parseFloat(b.totalPrice || '0'), 0);
  }, [ownerBookings]);

  const avgRating = useMemo(() => {
    if (!ownerReviews.length) return null;
    return ownerReviews.reduce((sum, r) => sum + r.rating, 0) / ownerReviews.length;
  }, [ownerReviews]);

  // Filter bookings for reservations section
  const filteredBookings = useMemo(() => {
    let result = [...ownerBookings];
    const now = new Date();

    if (dateFrom || dateTo) {
      if (dateFrom) result = result.filter(b => new Date(b.startTime) >= new Date(dateFrom));
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        result = result.filter(b => new Date(b.startTime) <= end);
      }
    } else {
      if (quickFilter === 'week') {
        const cutoff = new Date(now.getTime() - 7 * 24 * 3600000);
        result = result.filter(b => new Date(b.startTime) >= cutoff);
      } else if (quickFilter === 'month') {
        const cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
        result = result.filter(b => new Date(b.startTime) >= cutoff);
      } else if (quickFilter === 'lastmonth') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        result = result.filter(b => new Date(b.startTime) >= start && new Date(b.startTime) <= end);
      }
    }
    return result;
  }, [ownerBookings, quickFilter, dateFrom, dateTo]);

  const filteredEarnings = useMemo(() =>
    filteredBookings.filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + parseFloat(b.totalPrice || '0'), 0),
    [filteredBookings]
  );

  // Split by payment method and apply payment method filter
  const payMethodFiltered = useMemo(() => {
    if (payMethodFilter === 'instant') return filteredBookings.filter(b => b.paymentMethod === 'instant');
    if (payMethodFilter === 'credit') return filteredBookings.filter(b => b.paymentMethod === 'credit');
    return filteredBookings;
  }, [filteredBookings, payMethodFilter]);

  const { totalPayout, instantPayout, creditPayout, instantCount, creditCount } = useMemo(() => {
    const paid = filteredBookings.filter(b => b.paymentStatus === 'paid' || b.status === 'confirmed' || b.status === 'completed');
    const instB = paid.filter(b => b.paymentMethod === 'instant');
    const credB = paid.filter(b => b.paymentMethod === 'credit');
    const iP = instB.reduce((s, b) => s + calcPayout(parseFloat(b.totalPrice), 'instant').neto, 0);
    const cP = credB.reduce((s, b) => s + calcPayout(parseFloat(b.totalPrice), 'credit').neto, 0);
    return { totalPayout: iP + cP, instantPayout: iP, creditPayout: cP, instantCount: instB.length, creditCount: credB.length };
  }, [filteredBookings]);

  // CSV export
  const handleCsvExport = () => {
    const headers = language === 'sr'
      ? ['ID', 'Parking', 'Stanar', 'Početak', 'Kraj', 'Cena', 'Valuta', 'Status']
      : ['ID', 'Parking', 'Renter', 'Start', 'End', 'Price', 'Currency', 'Status'];
    const rows = filteredBookings.map(b => [
      b.id,
      b.spotTitle,
      `${b.renterFirstName || ''} ${b.renterLastName || ''}`.trim() || 'N/A',
      b.startTime ? new Date(b.startTime).toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-GB') : '',
      b.endTime ? new Date(b.endTime).toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-GB') : '',
      b.totalPrice,
      b.currency,
      STATUS_LABELS[b.status] || b.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rezervacije-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const nl = {
    overview: language === 'sr' ? 'Pregled' : 'Overview',
    spots: language === 'sr' ? 'Parking Mesta' : 'Parking Spots',
    bookings: language === 'sr' ? 'Rezervacije' : 'Bookings',
    messages: language === 'sr' ? 'Poruke' : 'Messages',
    sales: language === 'sr' ? 'Prodaja' : 'Sales',
    profile: language === 'sr' ? 'Profil' : 'Profile',
    loading: t.loading,
  };

  const navItems = [
    { id: 'overview' as Section, label: nl.overview, icon: LayoutDashboard },
    { id: 'spots' as Section, label: nl.spots, icon: MapPin },
    { id: 'bookings' as Section, label: nl.bookings, icon: Calendar },
    { id: 'messages' as Section, label: nl.messages, icon: MessageSquare, badge: totalUnread },
    { id: 'sales' as Section, label: nl.sales, icon: Tag },
    { id: 'profile' as Section, label: nl.profile, icon: UserIcon },
  ];

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">{t.loading}</div>;
  }
  if (!isAuthenticated) return null;

  // ─── Section renderers ──────────────────────────────────────────────────────

  function renderOverview() {
    const recentBookings = ownerBookings.slice(0, 5);
    const activeBookingsCount = ownerBookings.filter(b => b.status === 'confirmed').length;
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t.welcome}{user?.firstName ? `, ${user.firstName}` : ''}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">{t.accountOverview}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.totalEarnings}</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent" data-testid="kpi-total-earnings">
                {totalEarnings.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t.rsdAllTime}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.monthEarnings}</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent" data-testid="kpi-earnings-month">
                {earningsThisMonth.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t.rsdConfirmed}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.activeBookings}</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground" data-testid="kpi-active-bookings">{activeBookingsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">{t.currentlyConfirmed}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.avgRating}</CardTitle>
              <Star className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground" data-testid="kpi-avg-rating">
                {avgRating !== null ? avgRating.toFixed(1) : '—'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {ownerReviews.length > 0 ? t.ratingsCount(ownerReviews.length) : t.noRatings}
              </p>
            </CardContent>
          </Card>
        </div>

        {recentBookings.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-base font-semibold">{t.recentBookings}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveSection('bookings')} data-testid="button-view-all-bookings">
                {t.seeAll} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentBookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between px-6 py-3 gap-4" data-testid={`overview-booking-${b.id}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{b.spotTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {`${b.renterFirstName || ''} ${b.renterLastName || ''}`.trim() || 'N/A'}
                        {b.createdAt && ` · ${new Date(b.createdAt).toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-GB')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-foreground">{parseFloat(b.totalPrice).toLocaleString()} {b.currency}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] || ''}`}>
                        {STATUS_LABELS[b.status] || b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {recentBookings.length === 0 && (
          <Card className="p-8 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t.noOwnerBookings}</p>
            <Button variant="outline" className="mt-4" onClick={() => setActiveSection('spots')} data-testid="button-go-to-spots">
              {t.browseSpots}
            </Button>
          </Card>
        )}
      </div>
    );
  }

  function renderSpots() {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-foreground">{t.mySpots}</h2>
          <Link href="/select-category">
            <Button data-testid="button-add-spot">{t.addNewSpot}</Button>
          </Link>
        </div>

        {mySpots.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">{t.noSpots}</p>
            <Link href="/select-category">
              <Button data-testid="button-add-first-spot">{t.addSpot}</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {mySpots.map((spot) => (
              <Card
                key={spot.id}
                className={`relative overflow-hidden ${
                  spot.subscriptionType === 'gold' ? 'border-2 border-amber-600 ring-2 ring-amber-600/20'
                  : spot.subscriptionType === 'silver' ? 'border-2 border-zinc-400 ring-2 ring-zinc-400/20' : ''
                }`}
                data-testid={`spot-card-${spot.id}`}
              >
                {spot.subscriptionType === 'gold' && (
                  <Badge className="absolute top-3 right-3 z-10 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-700 text-white border-0">
                    <Sparkles className="w-3 h-3 mr-1" />{t.topSpot}
                  </Badge>
                )}
                {spot.subscriptionType === 'silver' && (
                  <Badge className="absolute top-3 right-3 z-10 bg-gradient-to-r from-zinc-300 via-zinc-100 to-zinc-400 text-zinc-800 border-0">
                    <Sparkles className="w-3 h-3 mr-1" />{t.featured}
                  </Badge>
                )}
                {spot.imageUrls?.[0] && (
                  <img src={spot.imageUrls[0]} alt={spot.title} className="w-full h-36 object-cover" />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-base mb-1 text-card-foreground">{spot.title}</h3>
                  <div className="flex items-start gap-1.5 mb-2 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span className="truncate">{spot.address}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">
                      {spot.pricePerHour} {spot.currency}/{spot.pricingType === 'hourly' ? 'h' : spot.pricingType === 'monthly' ? (language === 'sr' ? 'mes' : 'mo') : (language === 'sr' ? 'dan' : 'd')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${spot.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
                      {spot.isActive ? t.active : t.inactive}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {t.bookingsTotal(bookingsPerSpot[spot.id] ?? 0)}
                      </span>
                    </div>
                    {(spot.totalSpaces ?? 1) > 1 && (
                      <span className="text-xs text-accent font-medium">
                        {t.spaces(spot.totalSpaces ?? 1)}
                      </span>
                    )}
                  </div>

                  {(spot.subscriptionType === 'standard' || spot.subscriptionType === 'silver') && (
                    <div className="flex gap-2 mb-3">
                      {spot.subscriptionType === 'standard' && (
                        <Button variant="outline" size="sm" className="flex-1 text-xs border-zinc-400 text-zinc-500"
                          onClick={() => upgradeMutation.mutate({ spotId: spot.id, tier: 'silver' })}
                          disabled={upgradeMutation.isPending} data-testid={`button-upgrade-silver-${spot.id}`}>
                          <ArrowUpCircle className="w-3 h-3 mr-1" />Silver
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="flex-1 text-xs border-amber-600 text-amber-600"
                        onClick={() => upgradeMutation.mutate({ spotId: spot.id, tier: 'gold' })}
                        disabled={upgradeMutation.isPending} data-testid={`button-upgrade-gold-${spot.id}`}>
                        <ArrowUpCircle className="w-3 h-3 mr-1" />Gold
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link href={`/edit-spot/${spot.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full" data-testid={`button-edit-${spot.id}`}>
                        <Edit2 className="w-3.5 h-3.5 mr-1.5" />{t.edit}
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" data-testid={`button-delete-${spot.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t.deleteSpot}</AlertDialogTitle>
                          <AlertDialogDescription>{t.irreversible}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteSpotMutation.mutate(spot.id)}
                            className="bg-destructive text-destructive-foreground">{t.delete}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderBookings() {
    return (
      <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-foreground">{t.bookingsTitle}</h2>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 border-b border-border pb-2">
          <Button size="sm" variant={bookingsTab === 'received' ? 'default' : 'outline'}
            onClick={() => setBookingsTab('received')} data-testid="tab-received-bookings">
            {t.receivedTab}
          </Button>
          <Button size="sm" variant={bookingsTab === 'mine' ? 'default' : 'outline'}
            onClick={() => setBookingsTab('mine')} data-testid="tab-my-bookings">
            {t.myBookingsTab}
          </Button>
        </div>

        {bookingsTab === 'received' ? (
          <>
            {/* Date + export controls */}
            <Card className="p-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {(['week', 'month', 'lastmonth', 'all'] as QuickFilter[]).map(f => (
                  <Button key={f} size="sm" variant={quickFilter === f && !dateFrom && !dateTo ? 'default' : 'outline'}
                    onClick={() => { setQuickFilter(f); setDateFrom(''); setDateTo(''); }}
                    data-testid={`filter-${f}`}>
                    {{ week: t.thisWeek, month: t.thisMonth, lastmonth: t.lastMonth, all: t.allTime }[f]}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 items-end justify-between">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">{t.from}</label>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      className="w-40" data-testid="input-date-from" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">{t.to}</label>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                      className="w-40" data-testid="input-date-to" />
                  </div>
                  {(dateFrom || dateTo) && (
                    <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>{t.clearFilter}</Button>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleCsvExport} disabled={filteredBookings.length === 0}
                  data-testid="button-export-csv">
                  <Download className="w-4 h-4 mr-2" />{t.exportCsv}
                </Button>
              </div>
            </Card>

            {/* Payment method filter tabs */}
            <div className="flex gap-2 flex-wrap">
              {(['all', 'instant', 'credit'] as const).map(m => {
                const count = m === 'all'
                  ? filteredBookings.length
                  : filteredBookings.filter(b => b.paymentMethod === m).length;
                const label = m === 'all' ? t.allTime : m === 'instant' ? t.instant : t.credit;
                return (
                  <Button key={m} size="sm"
                    variant={payMethodFilter === m ? 'default' : 'outline'}
                    onClick={() => setPayMethodFilter(m)}
                    data-testid={`filter-method-${m}`}>
                    {`${label} (${count})`}
                  </Button>
                );
              })}
              <Button size="sm" variant={showPayoutCard ? 'default' : 'outline'}
                onClick={() => setShowPayoutCard(v => !v)}
                data-testid="button-toggle-payout">
                <TrendingUp className="w-4 h-4 mr-1" />{t.forPayout}
              </Button>
            </div>

            {/* Payout summary card */}
            {showPayoutCard && (
              <Card className="p-4 border-green-500/30 bg-green-500/5">
                <p className="text-sm font-semibold text-foreground mb-3">{t.payoutTitle(filteredBookings.length)}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {instantCount > 0 && (
                    <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3">
                      <p className="text-xs text-blue-400 font-semibold mb-1">{t.instant} ({instantCount})</p>
                      <p className="text-lg font-bold text-foreground">{Math.round(instantPayout).toLocaleString()} RSD</p>
                      <p className="text-xs text-muted-foreground">{t.afterFees}</p>
                    </div>
                  )}
                  {creditCount > 0 && (
                    <div className="rounded-md bg-purple-500/10 border border-purple-500/20 p-3">
                      <p className="text-xs text-purple-400 font-semibold mb-1">{t.credit} ({creditCount})</p>
                      <p className="text-lg font-bold text-foreground">{Math.round(creditPayout).toLocaleString()} RSD</p>
                      <p className="text-xs text-muted-foreground">{t.afterCredit}</p>
                    </div>
                  )}
                  <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3">
                    <p className="text-xs text-green-400 font-semibold mb-1">{t.totalPayout}</p>
                    <p className="text-lg font-bold text-green-400">{Math.round(totalPayout).toLocaleString()} RSD</p>
                    <p className="text-xs text-muted-foreground">{t.fromTotal(filteredEarnings.toLocaleString())}</p>
                  </div>
                </div>
              </Card>
            )}

            {payMethodFiltered.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{t.noBookingsPeriod}</p>
              </Card>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.colParking}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.colTenant}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.colPeriod}</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t.colPriceNet}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.colStatus}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {payMethodFiltered.map(b => {
                        const price = parseFloat(b.totalPrice);
                        const { neto, stripeFee } = calcPayout(price, b.paymentMethod);
                        const isInstant = b.paymentMethod === 'instant';
                        const isCredit = b.paymentMethod === 'credit';
                        return (
                          <tr key={b.id} className="hover:bg-muted/30 transition-colors" data-testid={`booking-row-${b.id}`}>
                            <td className="px-4 py-3 text-foreground font-medium max-w-[150px] truncate">{b.spotTitle}</td>
                            <td className="px-4 py-3 text-foreground">
                              <div className="flex flex-col gap-0.5">
                                <span>{`${b.renterFirstName || ''} ${b.renterLastName || ''}`.trim() || 'N/A'}</span>
                                {b.licensePlate && <span className="text-xs text-muted-foreground font-mono">{b.licensePlate}</span>}
                                {b.renterPhone && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Phone className="w-3 h-3 shrink-0" />{b.renterPhone}
                                  </span>
                                )}
                                {b.spaceNumber > 1 && <span className="text-xs text-accent font-medium">{t.space(b.spaceNumber)}</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {new Date(b.startTime).toLocaleDateString(language === "sr" ? "sr-RS" : "en-GB")}
                              {' — '}
                              {new Date(b.endTime).toLocaleDateString(language === "sr" ? "sr-RS" : "en-GB")}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex flex-col gap-0.5 items-end">
                                <span className="font-semibold text-foreground">{Math.round(price).toLocaleString()} RSD</span>
                                <span className="text-xs text-muted-foreground">
                                  {t.net}: {Math.round(neto).toLocaleString()} RSD
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] || ''}`}>
                                  {STATUS_LABELS[b.status] || b.status}
                                </span>
                                {isInstant && <span className="text-xs text-blue-400 font-medium">instant</span>}
                                {isCredit && <span className="text-xs text-purple-400 font-medium">kredit</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Moje rezervacije — bookings the user made as a renter */
          <>
            {myBookings.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{t.noMyBookings}</p>
                <Button variant="outline" className="mt-4" onClick={() => setLocation('/parking-spots')} data-testid="button-find-spots">
                  {t.findSpot}
                </Button>
              </Card>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.colParking}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.colPeriod}</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t.colPrice}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.colStatus}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.colGate}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {myBookings.map(b => (
                        <tr
                          key={b.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          data-testid={`my-booking-row-${b.id}`}
                          onClick={() => setSelectedBooking(b)}
                        >
                          <td className="px-4 py-3 text-foreground font-medium max-w-[180px] truncate">{b.spotTitle ?? `#${b.spotId.slice(0, 8)}`}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {new Date(b.startTime).toLocaleDateString(language === "sr" ? "sr-RS" : "en-GB")}
                            {' — '}
                            {new Date(b.endTime).toLocaleDateString(language === "sr" ? "sr-RS" : "en-GB")}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">
                            {parseFloat(b.totalPrice).toLocaleString()} {b.currency}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] || ''}`}>
                              {STATUS_LABELS[b.status] || b.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {b.spotHasRamp && (
                              <RampCell spotId={b.spotId} bookingId={b.id} language={language} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Booking detail dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => { if (!open) setSelectedBooking(null); }}>
        <DialogContent data-testid="dialog-booking-detail">
          <DialogHeader>
            <DialogTitle>{t.bookingDetails}</DialogTitle>
            <DialogDescription>{t.bookingInfo}</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t.labelParking}</p>
                  <p className="text-sm text-foreground font-medium">{selectedBooking.spotTitle ?? `ID: ${selectedBooking.spotId.slice(0, 8)}`}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t.labelStatus}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selectedBooking.status] || ''}`}>
                    {STATUS_LABELS[selectedBooking.status] || selectedBooking.status}
                  </span>
                </div>
              </div>
              {selectedBooking.spotAddress && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t.labelAddress}</p>
                  <p className="text-sm text-foreground flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                    {selectedBooking.spotAddress}
                  </p>
                </div>
              )}
              {selectedBooking.spotPhone && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t.labelOwnerContact}</p>
                  <p className="text-sm text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-accent shrink-0" />
                    {selectedBooking.spotPhone}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t.labelPeriod}</p>
                <p className="text-sm text-foreground">
                  {new Date(selectedBooking.startTime).toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {' — '}
                  {new Date(selectedBooking.endTime).toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t.labelAmount}</p>
                <p className="text-lg font-bold text-foreground">
                  {parseFloat(selectedBooking.totalPrice).toLocaleString()} {selectedBooking.currency}
                </p>
              </div>
              {selectedBooking.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t.labelNote}</p>
                  <p className="text-sm text-foreground">{selectedBooking.notes}</p>
                </div>
              )}
              {selectedBooking.spotHasRamp && (
                <div className="pt-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t.gateRamp}</p>
                  <RampCell spotId={selectedBooking.spotId} bookingId={selectedBooking.id} large language={language} />
                  <p className="text-xs text-muted-foreground mt-1.5 text-center">{t.rampNote}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </>
    );
  }

  function renderMessages() {
    return (
      <div className="space-y-4">
        {!selectedConversation ? (
          <>
            <h2 className="text-2xl font-bold text-foreground">{t.messages}</h2>
            {messagesLoading ? (
              <Card className="p-8 text-center"><p className="text-muted-foreground">{t.loadingMsg}</p></Card>
            ) : conversations.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{t.noMessages}</p>
                <p className="text-sm text-muted-foreground mt-2">{t.messagesDesc}</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {conversations.map(conv => (
                  <Card key={conv.key} className={`p-4 cursor-pointer hover-elevate ${conv.unreadCount > 0 ? 'border-accent/50' : ''}`}
                    onClick={() => setSelectedConversation(conv.key)} data-testid={`conversation-${conv.key}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-card-foreground ${conv.unreadCount > 0 ? 'text-foreground' : ''}`}>{conv.otherName}</span>
                          {conv.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-destructive text-destructive-foreground">{conv.unreadCount}</span>
                          )}
                        </div>
                        {conv.spotTitle && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{conv.spotTitle}
                          </p>
                        )}
                        <p className={`text-sm mt-1 truncate ${conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {conv.lastMessage.senderId === user?.id ? t.you : ''}{conv.lastMessage.content}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {conv.lastMessage.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleDateString(language === "sr" ? "sr-RS" : "en-GB", { day: 'numeric', month: 'short' }) : ''}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : activeConversation ? (
          <div className="flex flex-col h-[calc(100vh-180px)] min-h-[400px]">
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="icon" onClick={() => { setSelectedConversation(null); setReplyContent(''); }} data-testid="button-back-messages">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h3 className="font-semibold text-foreground">{activeConversation.otherName}</h3>
                {activeConversation.spotTitle && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{activeConversation.spotTitle}
                  </p>
                )}
              </div>
            </div>
            <Card className="flex-1 overflow-y-auto p-4 space-y-3">
              {[...activeConversation.messages].sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()).map(msg => {
                const isMine = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`} data-testid={`message-${msg.id}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 ${isMine ? 'bg-accent text-accent-foreground' : 'bg-muted text-foreground'}`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                        <span className="text-[10px] opacity-70">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString(language === "sr" ? "sr-RS" : "en-GB", { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        {isMine && (msg.isRead ? <CheckCheck className="w-3 h-3 opacity-70" /> : <Check className="w-3 h-3 opacity-50" />)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </Card>
            <div className="flex gap-2 mt-3">
              <Textarea value={replyContent} onChange={e => setReplyContent(e.target.value)}
                placeholder={t.replyPlaceholder} className="resize-none flex-1" rows={2}
                data-testid="input-reply-message"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (replyContent.trim()) {
                      const payload: { receiverId: string; content: string; spotId?: string | null } = { receiverId: activeConversation.otherId, content: replyContent.trim() };
                      if (activeConversation.spotId) payload.spotId = activeConversation.spotId;
                      replyMutation.mutate(payload);
                    }
                  }
                }}
              />
              <Button size="icon" disabled={!replyContent.trim() || replyMutation.isPending}
                onClick={() => {
                  if (replyContent.trim()) {
                    const payload: { receiverId: string; content: string; spotId?: string | null } = { receiverId: activeConversation.otherId, content: replyContent.trim() };
                    if (activeConversation.spotId) payload.spotId = activeConversation.spotId;
                    replyMutation.mutate(payload);
                  }
                }} data-testid="button-send-reply">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">{t.convoNotFound}</p>
            <Button variant="outline" className="mt-4" onClick={() => setSelectedConversation(null)}>{t.back}</Button>
          </Card>
        )}
      </div>
    );
  }

  function renderSales() {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-foreground">{t.mySales}</h2>
          <Link href="/add-sale">
            <Button data-testid="button-add-sale">{t.addSale}</Button>
          </Link>
        </div>

        {mySalesListings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">{t.noSales}</p>
            <Link href="/add-sale">
              <Button data-testid="button-add-first-sale">{t.listSale}</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {mySalesListings.map(listing => {
              const priceNum = parseFloat(listing.price);
              const areaNum = parseFloat(listing.area);
              const pricePerSqm = areaNum > 0 ? Math.round(priceNum / areaNum) : 0;
              const salePropLabels: Record<string, string> = {
                garage: t.salePropGarage, open_parking: t.salePropOpen, closed_parking: t.salePropClosed,
                truck_parking: t.salePropTruck, building_garage: t.salePropBuilding,
                warehouse_parking: t.salePropWarehouse, other: t.salePropOther,
              };
              return (
                <Card key={listing.id} className="p-4" data-testid={`sale-card-${listing.id}`}>
                  {listing.imageUrls?.[0] && (
                    <img src={listing.imageUrls[0]} alt={listing.title} className="w-full h-32 object-cover rounded-lg mb-4" />
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-accent" />
                    <Badge variant="secondary">{salePropLabels[listing.propertyType] || listing.propertyType}</Badge>
                  </div>
                  <h3 className="font-semibold text-base mb-1 text-card-foreground">{listing.title}</h3>
                  <div className="flex items-start gap-2 mb-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="truncate">{listing.address}</span>
                  </div>
                  <p className="text-foreground font-semibold text-lg mb-1">{priceNum.toLocaleString()} RSD</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{areaNum} m²</span>
                    <span>{pricePerSqm.toLocaleString()} RSD/m²</span>
                  </div>
                  {listing.phone && (
                    <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" /><span>{listing.phone}</span>
                    </div>
                  )}
                  <Button variant="destructive" size="sm" className="w-full"
                    onClick={() => deleteSaleListingMutation.mutate(listing.id)}
                    data-testid={`button-delete-sale-${listing.id}`}>
                    <Trash2 className="w-4 h-4 mr-2" />{t.delete}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderProfile() {
    // Cooldown za mapNickname (30 dana)
    const mapCooldownInfo = (() => {
      if (!user?.mapProfileLastChangedAt || user?.isAdmin) return null;
      const lastChanged = new Date(user.mapProfileLastChangedAt);
      const nextAllowed = new Date(lastChanged.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (new Date() < nextAllowed) {
        const daysLeft = Math.ceil((nextAllowed.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        return { daysLeft, nextAllowed };
      }
      return null;
    })();

    return (
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-2xl font-bold text-foreground">{t.profile}</h2>
          <Link href="/map-hack">
            <Button variant="outline" size="sm" data-testid="button-go-to-map-hack">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.backToMap}
            </Button>
          </Link>
        </div>
        <Card className="p-6">
          <h3 className="text-base font-semibold mb-4 text-foreground">{t.myData}</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(data => updateProfileMutation.mutate(data))} className="space-y-4">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.firstName}</FormLabel>
                  <FormControl><Input placeholder={t.firstNamePh} {...field} data-testid="input-first-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.lastName}</FormLabel>
                  <FormControl><Input placeholder={t.lastNamePh} {...field} data-testid="input-last-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.phone}</FormLabel>
                  <FormControl><Input placeholder={t.phonePh} {...field} data-testid="input-phone" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="bg-muted/50 p-4 rounded-md space-y-1">
                <p className="text-sm text-muted-foreground"><strong>Email:</strong> {user?.email}</p>
                <p className="text-sm text-muted-foreground"><strong>{t.trialLabel}:</strong> {user?.hasUsedFreeTrial ? t.trialUsed : t.trialAvail}</p>
              </div>

              {pushSupported && pushPermission === 'denied' && (
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-md">
                  <BellOff className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">{t.pushBlocked}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{t.pushBlockedDesc}</p>
                  </div>
                </div>
              )}
              {pushSupported && pushPermission !== 'denied' && (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-3">
                    {isSubscribed ? <Bell className="w-5 h-5 text-accent" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
                    <div>
                      <p className="font-medium text-foreground">{t.pushNotifications}</p>
                      <p className="text-sm text-muted-foreground">{isSubscribed ? t.pushActive : t.pushOff2}</p>
                    </div>
                  </div>
                  <Switch checked={isSubscribed} onCheckedChange={handlePushToggle} disabled={pushLoading} data-testid="switch-push-notifications" />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                {updateProfileMutation.isPending ? t.saving : t.saveChanges}
              </Button>
            </form>
          </Form>
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-semibold mb-1 text-foreground">{t.mapNickname}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t.mapNicknameDesc}</p>
          {mapCooldownInfo && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md mb-4">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">
                {t.cooldownMsg(mapCooldownInfo.daysLeft, mapCooldownInfo.nextAllowed.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-GB'))}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={mapNicknameInput}
              onChange={e => setMapNicknameInput(e.target.value)}
              placeholder={t.nicknamePh}
              maxLength={20}
              disabled={!!mapCooldownInfo}
              data-testid="input-map-nickname"
            />
            <Button
              onClick={() => updateMapNicknameMutation.mutate(mapNicknameInput.trim())}
              disabled={updateMapNicknameMutation.isPending || !!mapCooldownInfo || mapNicknameInput.trim().length < 3}
              data-testid="button-save-map-nickname"
            >
              {updateMapNicknameMutation.isPending ? t.savingNick : t.saveNick}
            </Button>
          </div>
        </Card>

        {/* Moj novčanik */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-5 w-5 text-accent" />
            <h3 className="text-base font-semibold text-foreground">{t.wallet}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t.walletDesc}</p>
          <div className="flex items-center justify-between p-4 rounded-md mb-4" style={{ background: "rgba(64,145,108,0.12)", border: "1px solid rgba(82,183,136,0.25)" }}>
            <div>
              <p className="text-xs text-muted-foreground">{t.availBalance}</p>
              <p className="text-2xl font-bold" style={{ color: "#52B788" }}>{(walletData?.balance ?? 0).toLocaleString()} <span className="text-base font-semibold">RSD</span></p>
            </div>
            <Wallet className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">{t.topup}</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { pkg: '500', label: '500 RSD' },
              { pkg: '1000', label: '1.000 RSD' },
              { pkg: '2000', label: '2.000 RSD' },
              { pkg: '5000', label: '5.000 RSD' },
            ].map(({ pkg, label }) => (
              <Button
                key={pkg}
                variant="outline"
                size="sm"
                onClick={() => creditCheckoutMutation.mutate(pkg)}
                disabled={creditCheckoutMutation.isPending}
                data-testid={`button-topup-${pkg}`}
              >
                <Plus className="h-3 w-3 mr-1" />{label}
              </Button>
            ))}
          </div>
          {walletData && walletData.transactions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <History className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground">{t.txHistory}</p>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {walletData.transactions.slice(0, 20).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                    <div className="flex items-center gap-2 min-w-0">
                      {tx.amount > 0
                        ? <ArrowDownCircle className="h-3.5 w-3.5 text-accent shrink-0" />
                        : <ArrowUpCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      }
                      <span className="text-xs text-muted-foreground truncate">{tx.description || (tx.type === 'topup' ? t.txTopup : t.txBooking)}</span>
                    </div>
                    <span className="text-xs font-semibold shrink-0 ml-2" style={{ color: tx.amount > 0 ? "#52B788" : "#f87171" }}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} RSD
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6 border-destructive/40">
          <div className="flex items-center gap-2 mb-2">
            <TriangleAlert className="h-5 w-5 text-destructive" />
            <h3 className="text-base font-semibold text-destructive">{t.dangerZone}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t.dangerDesc}</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" data-testid="button-delete-account">
                <Trash2 className="h-4 w-4 mr-2" />{t.deleteAccount}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>{t.deleteConfirmDesc}<strong>{t.deleteConfirmBold}</strong>{t.deleteConfirmDesc2}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-delete-account-cancel">{t.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteAccountMutation.mutate()} disabled={deleteAccountMutation.isPending}
                  className="bg-destructive text-destructive-foreground" data-testid="button-delete-account-confirm">
                  {deleteAccountMutation.isPending ? t.deletingAccount : t.confirmDelete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      </div>
    );
  }

  function renderSection() {
    switch (activeSection) {
      case 'overview': return renderOverview();
      case 'spots': return renderSpots();
      case 'bookings': return renderBookings();
      case 'messages': return renderMessages();
      case 'sales': return renderSales();
      case 'profile': return renderProfile();
    }
  }

  const sidebarStyle = { "--sidebar-width": "15rem", "--sidebar-width-icon": "3.5rem" };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader className="p-4">
            <Link href="/map-hack" className="flex items-center gap-2.5" data-testid="link-home">
              <img src={parkInLogo} alt="CarDrop" className="w-8 h-8 rounded-lg shrink-0" />
              <span className="text-base font-bold text-foreground group-data-[collapsible=icon]:hidden">CarDrop</span>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu className="px-2">
              {navItems.map(item => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeSection === item.id}
                    onClick={() => setActiveSection(item.id)}
                    data-testid={`nav-${item.id}`}
                    className="relative"
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:-top-1 group-data-[collapsible=icon]:-right-1">
                        {item.badge}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 space-y-1">
            {user?.isAdmin && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="w-full justify-start" data-testid="button-admin-panel">
                  <Shield className="w-4 h-4 mr-2 shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden">Admin</span>
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" className="w-full justify-start" data-testid="button-logout"
              onClick={async () => {
                try { await apiRequest("POST", "/api/auth/logout", {}); } catch {}
                queryClient.clear();
                window.location.href = "/";
              }}>
              <LogOut className="w-4 h-4 mr-2 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">{t.logout}</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="sticky top-0 z-50 bg-card border-b border-border flex items-center px-4 h-14 gap-3">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <h1 className="text-base font-semibold text-foreground">
              {navItems.find(n => n.id === activeSection)?.label || t.myAccount}
            </h1>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 md:pb-6">
            {renderSection()}
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation — visible on small screens only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-stretch h-16">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            data-testid={`mobile-nav-${item.id}`}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
              activeSection === item.id
                ? 'text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className="absolute top-2 right-[calc(50%-10px)] translate-x-full inline-flex items-center justify-center min-w-[14px] h-[14px] px-0.5 text-[9px] font-bold rounded-full bg-destructive text-destructive-foreground">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>


      <AlertDialog open={accountDeletedInfo !== null}>
        <AlertDialogContent data-testid="dialog-account-deleted">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.accountDeletedTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {accountDeletedInfo?.hadSubscription
                ? t.accountDeletedSub
                : t.accountDeletedNoSub}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction data-testid="button-account-deleted-ok"
              onClick={() => { setAccountDeletedInfo(null); queryClient.clear(); setLocation("/"); }}>
              {t.ok}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
