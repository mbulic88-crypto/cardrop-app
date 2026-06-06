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
    const stripeFee = price * INSTANT_STRIPE_PCT + INSTANT_STRIPE_FIXED;
    return { neto: price - appFee - stripeFee, stripeFee, appFee };
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

const STATUS_LABELS: Record<string, string> = {
  pending: 'Na čekanju', confirmed: 'Potvrđena', completed: 'Završena', cancelled: 'Otkazana',
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

export default function Dashboard() {
  const { isAuthenticated, isLoading, user: authUser } = useAuth();
  const [, setLocation] = useLocation();
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
  const [bookingsTab, setBookingsTab] = useState<'received' | 'mine'>('received');
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
          toast({ title: "Kredit dodat!", description: `Dodato ${data.amountRsd?.toLocaleString('sr-RS')} RSD. Novi balans: ${data.balance?.toLocaleString('sr-RS')} RSD` });
        }
        refetchWallet();
        queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete('credit_session');
        window.history.replaceState({}, '', url.toString());
      })
      .catch(() => toast({ title: "Greška pri verifikaciji", description: "Kontaktirajte podršku.", variant: "destructive" }));
  }, [isAuthenticated]);

  const handlePushToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) toast({ title: "Obaveštenja isključena", description: "Nećete više primati push obaveštenja" });
    } else {
      const success = await subscribe();
      if (success) {
        toast({ title: "Obaveštenja uključena", description: "Primaćete obaveštenja o novim porukama i rezervacijama" });
      } else {
        toast({ title: "Greška", description: "Nije moguće uključiti obaveštenja. Proverite dozvole u pretraživaču.", variant: "destructive" });
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
  type EnrichedBooking = Booking & { spotTitle?: string | null; spotAddress?: string | null; spotPhone?: string | null; spotHasRamp?: boolean };
  const { data: myBookings = [] } = useQuery<EnrichedBooking[]>({ queryKey: ["/api/bookings"], enabled: isAuthenticated });
  const [selectedBooking, setSelectedBooking] = useState<EnrichedBooking | null>(null);
  const [rampPendingId, setRampPendingId] = useState<string | null>(null);

  const openRamp = async (spotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRampPendingId(spotId);
    try {
      await apiRequest("POST", `/api/parking-spots/${spotId}/open-ramp`, {});
      toast({ title: "Kapija se otvara", description: "Signal je uspešno poslat." });
    } catch (err: any) {
      const msg = err?.message || "Greška pri otvaranju kapije";
      toast({ title: "Nije moguće otvoriti", description: msg, variant: "destructive" });
    } finally {
      setRampPendingId(null);
    }
  };

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
    onError: () => toast({ title: "Greška", description: "Nije moguće pokrenuti plaćanje", variant: "destructive" }),
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
      toast({ title: "Poruka poslata" });
    },
    onError: () => toast({ title: "Greška", description: "Nije moguće poslati poruku", variant: "destructive" }),
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
      toast({ title: "Uspešno", description: "Profil je ažuriran" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => toast({ title: "Greška", description: "Nije moguće ažurirati profil", variant: "destructive" }),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/users/me"),
    onSuccess: () => setAccountDeletedInfo({ hadSubscription: !!(authUser?.stripeSubscriptionId) }),
    onError: () => toast({ title: "Greška pri brisanju naloga", variant: "destructive" }),
  });

  const updateMapNicknameMutation = useMutation({
    mutationFn: (nickname: string) =>
      apiRequest("PATCH", "/api/map-hack/profile", {
        mapNickname: nickname,
        mapAvatarId: user?.mapAvatarId || 1,
      }),
    onSuccess: () => {
      toast({ title: "Uspešno", description: "Nadimak na mapi je promenjen" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      const body = error?.body || error;
      if (body?.error === 'cooldown' && body?.nextAllowed) {
        const next = new Date(body.nextAllowed);
        const daysLeft = Math.ceil((next.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        toast({
          title: "Cooldown aktivan",
          description: `Možeš da menjaš nadimak za ${daysLeft} ${daysLeft === 1 ? 'dan' : 'dana'} (${next.toLocaleDateString('sr-RS')})`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Greška", description: body?.message || "Nije moguće promeniti nadimak", variant: "destructive" });
      }
    },
  });

  const deleteSpotMutation = useMutation({
    mutationFn: (spotId: string) => apiRequest("DELETE", `/api/parking-spots/${spotId}`, {}),
    onSuccess: () => {
      toast({ title: "Uspešno", description: "Parking mesto je izbrisano" });
      queryClient.invalidateQueries({ queryKey: ["/api/parking-spots/my-spots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parking-spots"] });
    },
    onError: () => toast({ title: "Greška", description: "Nije moguće obrisati parking mesto", variant: "destructive" }),
  });

  const upgradeMutation = useMutation({
    mutationFn: ({ spotId, tier }: { spotId: string; tier: 'silver' | 'gold' }) =>
      apiRequest("POST", "/api/stripe/create-checkout-existing", { spotId, tier }),
    onSuccess: (data: { url?: string }) => { if (data.url) window.location.href = data.url; },
    onError: () => toast({ title: "Greška", description: "Nije moguće pokrenuti nadogradnju", variant: "destructive" }),
  });

  const deleteSaleListingMutation = useMutation({
    mutationFn: (listingId: string) => apiRequest("DELETE", `/api/sales-listings/${listingId}`, {}),
    onSuccess: () => {
      toast({ title: "Uspešno", description: "Oglas prodaje je izbrisan" });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-listings/my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-listings"] });
    },
    onError: () => toast({ title: "Greška", description: "Nije moguće obrisati oglas", variant: "destructive" }),
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
    const headers = ['ID', 'Parking', 'Stanar', 'Početak', 'Kraj', 'Cena', 'Valuta', 'Status'];
    const rows = filteredBookings.map(b => [
      b.id,
      b.spotTitle,
      `${b.renterFirstName || ''} ${b.renterLastName || ''}`.trim() || 'N/A',
      b.startTime ? new Date(b.startTime).toLocaleDateString('sr-RS') : '',
      b.endTime ? new Date(b.endTime).toLocaleDateString('sr-RS') : '',
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

  const navItems = [
    { id: 'overview' as Section, label: 'Pregled', icon: LayoutDashboard },
    { id: 'spots' as Section, label: 'Parking Mesta', icon: MapPin },
    { id: 'bookings' as Section, label: 'Rezervacije', icon: Calendar },
    { id: 'messages' as Section, label: 'Poruke', icon: MessageSquare, badge: totalUnread },
    { id: 'sales' as Section, label: 'Prodaja', icon: Tag },
    { id: 'profile' as Section, label: 'Profil', icon: UserIcon },
  ];

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Učitavanje...</div>;
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
            Dobrodošli{user?.firstName ? `, ${user.firstName}` : ''}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Pregled vašeg naloga</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ukupna zarada</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent" data-testid="kpi-total-earnings">
                {totalEarnings.toLocaleString('sr-RS')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">RSD (svo vreme)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Zarada ovog meseca</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent" data-testid="kpi-earnings-month">
                {earningsThisMonth.toLocaleString('sr-RS')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">RSD (potvrđene)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Aktivne rezervacije</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground" data-testid="kpi-active-bookings">{activeBookingsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Trenutno potvrđene</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Prosečna ocena</CardTitle>
              <Star className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground" data-testid="kpi-avg-rating">
                {avgRating !== null ? avgRating.toFixed(1) : '—'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {ownerReviews.length > 0 ? `${ownerReviews.length} ocen${ownerReviews.length === 1 ? 'a' : 'a'}` : 'Nema ocena'}
              </p>
            </CardContent>
          </Card>
        </div>

        {recentBookings.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-base font-semibold">Poslednje rezervacije</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveSection('bookings')} data-testid="button-view-all-bookings">
                Sve <ChevronRight className="w-4 h-4 ml-1" />
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
                        {b.createdAt && ` · ${new Date(b.createdAt).toLocaleDateString('sr-RS')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-foreground">{parseFloat(b.totalPrice).toLocaleString('sr-RS')} {b.currency}</span>
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
            <p className="text-muted-foreground">Još nema rezervacija na vašim parking mestima.</p>
            <Button variant="outline" className="mt-4" onClick={() => setActiveSection('spots')} data-testid="button-go-to-spots">
              Pregledaj parking mesta
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
          <h2 className="text-2xl font-bold text-foreground">Moja Parking Mesta</h2>
          <Link href="/select-category">
            <Button data-testid="button-add-spot">Dodaj Novo Mesto</Button>
          </Link>
        </div>

        {mySpots.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Nemate aktivnih parking mesta</p>
            <Link href="/select-category">
              <Button data-testid="button-add-first-spot">Dodaj Parking Mesto</Button>
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
                    <Sparkles className="w-3 h-3 mr-1" />Top lokacija
                  </Badge>
                )}
                {spot.subscriptionType === 'silver' && (
                  <Badge className="absolute top-3 right-3 z-10 bg-gradient-to-r from-zinc-300 via-zinc-100 to-zinc-400 text-zinc-800 border-0">
                    <Sparkles className="w-3 h-3 mr-1" />Istaknuto
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
                      {spot.pricePerHour} {spot.currency}/{spot.pricingType === 'hourly' ? 'h' : spot.pricingType === 'monthly' ? 'mes' : 'dan'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${spot.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
                      {spot.isActive ? 'Aktivno' : 'Neaktivno'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {bookingsPerSpot[spot.id] ?? 0} rezervacija ukupno
                      </span>
                    </div>
                    {(spot.totalSpaces ?? 1) > 1 && (
                      <span className="text-xs text-accent font-medium">
                        {spot.totalSpaces} mesta
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
                        <Edit2 className="w-3.5 h-3.5 mr-1.5" />Izmeni
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
                          <AlertDialogTitle>Obriši parking mesto?</AlertDialogTitle>
                          <AlertDialogDescription>Ova akcija je nepovratna.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Otkaži</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteSpotMutation.mutate(spot.id)}
                            className="bg-destructive text-destructive-foreground">Obriši</AlertDialogAction>
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
          <h2 className="text-2xl font-bold text-foreground">Rezervacije i Zarada</h2>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 border-b border-border pb-2">
          <Button size="sm" variant={bookingsTab === 'received' ? 'default' : 'outline'}
            onClick={() => setBookingsTab('received')} data-testid="tab-received-bookings">
            Primljene rezervacije
          </Button>
          <Button size="sm" variant={bookingsTab === 'mine' ? 'default' : 'outline'}
            onClick={() => setBookingsTab('mine')} data-testid="tab-my-bookings">
            Moje rezervacije
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
                    {{ week: 'Ova nedelja', month: 'Ovaj mesec', lastmonth: 'Prošli mesec', all: 'Sve' }[f]}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 items-end justify-between">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Od</label>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      className="w-40" data-testid="input-date-from" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Do</label>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                      className="w-40" data-testid="input-date-to" />
                  </div>
                  {(dateFrom || dateTo) && (
                    <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Obriši filter</Button>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleCsvExport} disabled={filteredBookings.length === 0}
                  data-testid="button-export-csv">
                  <Download className="w-4 h-4 mr-2" />Izvezi CSV
                </Button>
              </div>
            </Card>

            {/* Payment method filter tabs */}
            <div className="flex gap-2 flex-wrap">
              {(['all', 'instant', 'credit'] as const).map(m => {
                const count = m === 'all'
                  ? filteredBookings.length
                  : filteredBookings.filter(b => b.paymentMethod === m).length;
                const label = m === 'all' ? 'Sve' : m === 'instant' ? 'Instant' : 'Kredit';
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
                <TrendingUp className="w-4 h-4 mr-1" />Za isplatu
              </Button>
            </div>

            {/* Payout summary card */}
            {showPayoutCard && (
              <Card className="p-4 border-green-500/30 bg-green-500/5">
                <p className="text-sm font-semibold text-foreground mb-3">Obračun isplate — {filteredBookings.length} rezervacija</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {instantCount > 0 && (
                    <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3">
                      <p className="text-xs text-blue-400 font-semibold mb-1">Instant ({instantCount})</p>
                      <p className="text-lg font-bold text-foreground">{Math.round(instantPayout).toLocaleString('sr-RS')} RSD</p>
                      <p className="text-xs text-muted-foreground">posle 15% app + 3.9% + 35 RSD Stripe</p>
                    </div>
                  )}
                  {creditCount > 0 && (
                    <div className="rounded-md bg-purple-500/10 border border-purple-500/20 p-3">
                      <p className="text-xs text-purple-400 font-semibold mb-1">Kredit ({creditCount})</p>
                      <p className="text-lg font-bold text-foreground">{Math.round(creditPayout).toLocaleString('sr-RS')} RSD</p>
                      <p className="text-xs text-muted-foreground">posle 15% app + 1.5% Stripe</p>
                    </div>
                  )}
                  <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3">
                    <p className="text-xs text-green-400 font-semibold mb-1">Ukupno za isplatu</p>
                    <p className="text-lg font-bold text-green-400">{Math.round(totalPayout).toLocaleString('sr-RS')} RSD</p>
                    <p className="text-xs text-muted-foreground">od {filteredEarnings.toLocaleString('sr-RS')} RSD ukupno</p>
                  </div>
                </div>
              </Card>
            )}

            {payMethodFiltered.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nema rezervacija u izabranom periodu</p>
              </Card>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Parking</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stanar</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cena / Neto</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
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
                                {b.spaceNumber > 1 && <span className="text-xs text-accent font-medium">Mesto {b.spaceNumber}</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {new Date(b.startTime).toLocaleDateString('sr-RS')}
                              {' — '}
                              {new Date(b.endTime).toLocaleDateString('sr-RS')}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex flex-col gap-0.5 items-end">
                                <span className="font-semibold text-foreground">{Math.round(price).toLocaleString('sr-RS')} RSD</span>
                                <span className="text-xs text-muted-foreground">
                                  neto: {Math.round(neto).toLocaleString('sr-RS')} + {Math.round(stripeFee).toLocaleString('sr-RS')} RSD Stripe
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
                <p className="text-muted-foreground">Niste još napravili nijednu rezervaciju</p>
                <Button variant="outline" className="mt-4" onClick={() => setLocation('/parking-spots')} data-testid="button-find-spots">
                  Pronađi parking mesto
                </Button>
              </Card>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Parking</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cena</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kapija</th>
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
                            {new Date(b.startTime).toLocaleDateString('sr-RS')}
                            {' — '}
                            {new Date(b.endTime).toLocaleDateString('sr-RS')}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">
                            {parseFloat(b.totalPrice).toLocaleString('sr-RS')} {b.currency}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] || ''}`}>
                              {STATUS_LABELS[b.status] || b.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {b.spotHasRamp && (
                              <Button
                                size="sm"
                                variant="outline"
                                data-testid={`button-open-ramp-${b.id}`}
                                disabled={rampPendingId === b.spotId}
                                onClick={(e) => openRamp(b.spotId, e)}
                                className="gap-1.5 text-xs"
                              >
                                {rampPendingId === b.spotId
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <DoorOpen className="w-3 h-3" />}
                                Otvori
                              </Button>
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
            <DialogTitle>Detalji Rezervacije</DialogTitle>
            <DialogDescription>Informacije o vašoj rezervaciji</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Parking</p>
                  <p className="text-sm text-foreground font-medium">{selectedBooking.spotTitle ?? `ID: ${selectedBooking.spotId.slice(0, 8)}`}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selectedBooking.status] || ''}`}>
                    {STATUS_LABELS[selectedBooking.status] || selectedBooking.status}
                  </span>
                </div>
              </div>
              {selectedBooking.spotAddress && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Adresa</p>
                  <p className="text-sm text-foreground flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                    {selectedBooking.spotAddress}
                  </p>
                </div>
              )}
              {selectedBooking.spotPhone && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Kontakt vlasnika</p>
                  <p className="text-sm text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-accent shrink-0" />
                    {selectedBooking.spotPhone}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Period</p>
                <p className="text-sm text-foreground">
                  {new Date(selectedBooking.startTime).toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {' — '}
                  {new Date(selectedBooking.endTime).toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Iznos</p>
                <p className="text-lg font-bold text-foreground">
                  {parseFloat(selectedBooking.totalPrice).toLocaleString('sr-RS')} {selectedBooking.currency}
                </p>
              </div>
              {selectedBooking.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Napomena</p>
                  <p className="text-sm text-foreground">{selectedBooking.notes}</p>
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
            <h2 className="text-2xl font-bold text-foreground">Poruke</h2>
            {messagesLoading ? (
              <Card className="p-8 text-center"><p className="text-muted-foreground">Učitavanje...</p></Card>
            ) : conversations.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nemate poruka</p>
                <p className="text-sm text-muted-foreground mt-2">Poruke sa vlasnicima parking mesta pojavit će se ovde.</p>
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
                          {conv.lastMessage.senderId === user?.id ? 'Vi: ' : ''}{conv.lastMessage.content}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {conv.lastMessage.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' }) : ''}
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
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' }) : ''}
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
                placeholder="Napišite odgovor..." className="resize-none flex-1" rows={2}
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
            <p className="text-muted-foreground">Razgovor nije pronađen</p>
            <Button variant="outline" className="mt-4" onClick={() => setSelectedConversation(null)}>Nazad</Button>
          </Card>
        )}
      </div>
    );
  }

  function renderSales() {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-foreground">Moji Oglasi Prodaje</h2>
          <Link href="/add-sale">
            <Button data-testid="button-add-sale">Dodaj Novi Oglas</Button>
          </Link>
        </div>

        {mySalesListings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Nemate aktivnih oglasa prodaje</p>
            <Link href="/add-sale">
              <Button data-testid="button-add-first-sale">Oglasi Prodaju</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {mySalesListings.map(listing => {
              const priceNum = parseFloat(listing.price);
              const areaNum = parseFloat(listing.area);
              const pricePerSqm = areaNum > 0 ? Math.round(priceNum / areaNum) : 0;
              const propertyTypeLabels: Record<string, string> = {
                garage: "Garaža", open_parking: "Otvoreno PM", closed_parking: "Zatvoreno PM",
                truck_parking: "Parking za kamione", building_garage: "Garažno mesto",
                warehouse_parking: "Magacinski prostor", other: "Ostalo",
              };
              return (
                <Card key={listing.id} className="p-4" data-testid={`sale-card-${listing.id}`}>
                  {listing.imageUrls?.[0] && (
                    <img src={listing.imageUrls[0]} alt={listing.title} className="w-full h-32 object-cover rounded-lg mb-4" />
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-accent" />
                    <Badge variant="secondary">{propertyTypeLabels[listing.propertyType] || listing.propertyType}</Badge>
                  </div>
                  <h3 className="font-semibold text-base mb-1 text-card-foreground">{listing.title}</h3>
                  <div className="flex items-start gap-2 mb-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="truncate">{listing.address}</span>
                  </div>
                  <p className="text-foreground font-semibold text-lg mb-1">{priceNum.toLocaleString('sr-RS')} RSD</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{areaNum} m²</span>
                    <span>{pricePerSqm.toLocaleString('sr-RS')} RSD/m²</span>
                  </div>
                  {listing.phone && (
                    <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" /><span>{listing.phone}</span>
                    </div>
                  )}
                  <Button variant="destructive" size="sm" className="w-full"
                    onClick={() => deleteSaleListingMutation.mutate(listing.id)}
                    data-testid={`button-delete-sale-${listing.id}`}>
                    <Trash2 className="w-4 h-4 mr-2" />Obriši
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
          <h2 className="text-2xl font-bold text-foreground">Profil</h2>
          <Link href="/map-hack">
            <Button variant="outline" size="sm" data-testid="button-go-to-map-hack">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Nazad na mapu
            </Button>
          </Link>
        </div>
        <Card className="p-6">
          <h3 className="text-base font-semibold mb-4 text-foreground">Moji Podaci</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(data => updateProfileMutation.mutate(data))} className="space-y-4">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ime</FormLabel>
                  <FormControl><Input placeholder="Vaše ime" {...field} data-testid="input-first-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Prezime</FormLabel>
                  <FormControl><Input placeholder="Vaše prezime" {...field} data-testid="input-last-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon</FormLabel>
                  <FormControl><Input placeholder="Vaš telefon" {...field} data-testid="input-phone" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="bg-muted/50 p-4 rounded-md space-y-1">
                <p className="text-sm text-muted-foreground"><strong>Email:</strong> {user?.email}</p>
                <p className="text-sm text-muted-foreground"><strong>Probni Period:</strong> {user?.hasUsedFreeTrial ? "Već iskorišćen" : "Dostupan"}</p>
              </div>

              {pushSupported && pushPermission === 'denied' && (
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-md">
                  <BellOff className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Push Obaveštenja su blokirana</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Idite na Podešavanja → Aplikacije → Chrome → Obaveštenja i dozvolite notifikacije.</p>
                  </div>
                </div>
              )}
              {pushSupported && pushPermission !== 'denied' && (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-3">
                    {isSubscribed ? <Bell className="w-5 h-5 text-accent" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
                    <div>
                      <p className="font-medium text-foreground">Push Obaveštenja</p>
                      <p className="text-sm text-muted-foreground">{isSubscribed ? "Aktivna" : "Isključena"}</p>
                    </div>
                  </div>
                  <Switch checked={isSubscribed} onCheckedChange={handlePushToggle} disabled={pushLoading} data-testid="switch-push-notifications" />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                {updateProfileMutation.isPending ? "Čuvanje..." : "Sačuvaj Izmene"}
              </Button>
            </form>
          </Form>
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-semibold mb-1 text-foreground">Nadimak na Mapi</h3>
          <p className="text-sm text-muted-foreground mb-4">Tvoje ime koje se prikazuje u Map Hack NS. Može se menjati jednom u 30 dana.</p>
          {mapCooldownInfo && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md mb-4">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">
                Možeš da menjaš nadimak za <strong>{mapCooldownInfo.daysLeft} {mapCooldownInfo.daysLeft === 1 ? 'dan' : 'dana'}</strong> ({mapCooldownInfo.nextAllowed.toLocaleDateString('sr-RS')})
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={mapNicknameInput}
              onChange={e => setMapNicknameInput(e.target.value)}
              placeholder="Nadimak (3–20 znakova, a-z 0-9 _ -)"
              maxLength={20}
              disabled={!!mapCooldownInfo}
              data-testid="input-map-nickname"
            />
            <Button
              onClick={() => updateMapNicknameMutation.mutate(mapNicknameInput.trim())}
              disabled={updateMapNicknameMutation.isPending || !!mapCooldownInfo || mapNicknameInput.trim().length < 3}
              data-testid="button-save-map-nickname"
            >
              {updateMapNicknameMutation.isPending ? "Čuvanje..." : "Sačuvaj"}
            </Button>
          </div>
        </Card>

        {/* Moj novčanik */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-5 w-5 text-accent" />
            <h3 className="text-base font-semibold text-foreground">Moj novčanik</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Kredit za plaćanje parkinga na Map Hack NS.</p>
          <div className="flex items-center justify-between p-4 rounded-md mb-4" style={{ background: "rgba(64,145,108,0.12)", border: "1px solid rgba(82,183,136,0.25)" }}>
            <div>
              <p className="text-xs text-muted-foreground">Dostupan balans</p>
              <p className="text-2xl font-bold" style={{ color: "#52B788" }}>{(walletData?.balance ?? 0).toLocaleString('sr-RS')} <span className="text-base font-semibold">RSD</span></p>
            </div>
            <Wallet className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Dopuni kredit</p>
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
                <p className="text-xs font-semibold text-muted-foreground">Istorija transakcija</p>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {walletData.transactions.slice(0, 20).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                    <div className="flex items-center gap-2 min-w-0">
                      {tx.amount > 0
                        ? <ArrowDownCircle className="h-3.5 w-3.5 text-accent shrink-0" />
                        : <ArrowUpCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      }
                      <span className="text-xs text-muted-foreground truncate">{tx.description || (tx.type === 'topup' ? 'Dopuna' : 'Rezervacija')}</span>
                    </div>
                    <span className="text-xs font-semibold shrink-0 ml-2" style={{ color: tx.amount > 0 ? "#52B788" : "#f87171" }}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('sr-RS')} RSD
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
            <h3 className="text-base font-semibold text-destructive">Opasna zona</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Trajno brišeš svoj nalog i sve podatke. Ova akcija je nepovratna.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" data-testid="button-delete-account">
                <Trash2 className="h-4 w-4 mr-2" />Obriši nalog
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sigurno želiš da obrišeš nalog?</AlertDialogTitle>
                <AlertDialogDescription>Ova akcija je <strong>nepovratna</strong>. Svi tvoji podaci biće trajno obrisani.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-delete-account-cancel">Otkaži</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteAccountMutation.mutate()} disabled={deleteAccountMutation.isPending}
                  className="bg-destructive text-destructive-foreground" data-testid="button-delete-account-confirm">
                  {deleteAccountMutation.isPending ? "Brisanje..." : "Da, obriši nalog"}
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
      <div className="flex min-h-screen w-full bg-background">
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
              <span className="group-data-[collapsible=icon]:hidden">Odjava</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="sticky top-0 z-50 bg-card border-b border-border flex items-center px-4 h-14 gap-3">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <h1 className="text-base font-semibold text-foreground">
              {navItems.find(n => n.id === activeSection)?.label || 'Moj Nalog'}
            </h1>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
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

      {/* Spacer so content isn't hidden behind the mobile nav */}
      <div className="md:hidden h-16" />

      <AlertDialog open={accountDeletedInfo !== null}>
        <AlertDialogContent data-testid="dialog-account-deleted">
          <AlertDialogHeader>
            <AlertDialogTitle>Nalog je obrisan</AlertDialogTitle>
            <AlertDialogDescription>
              {accountDeletedInfo?.hadSubscription
                ? "Vaš nalog je uspješno obrisan. Vaša pretplata je automatski prekinuta."
                : "Vaš nalog je uspješno obrisan. Svi vaši podaci su trajno uklonjeni."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction data-testid="button-account-deleted-ok"
              onClick={() => { setAccountDeletedInfo(null); queryClient.clear(); setLocation("/"); }}>
              U redu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
