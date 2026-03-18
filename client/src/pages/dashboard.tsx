import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User, ParkingSpot, SalesListing, Message } from "@shared/schema";
import { MapPin, Edit2, Trash2, LogOut, Bell, BellOff, Sparkles, Tag, Ruler, Phone, ArrowUpCircle, MessageSquare, Send, ArrowLeft, Check, CheckCheck, Shield } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import MyBookings from "./my-bookings";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export default function Dashboard() {
  const { isAuthenticated, isLoading, user: authUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isSupported: pushSupported, isSubscribed, subscribe, unsubscribe, isLoading: pushLoading } = usePushNotifications();

  const handlePushToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast({ title: "Obaveštenja isključena", description: "Nećete više primati push obaveštenja" });
      }
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
    if (!isLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  useEffect(() => {
    if (isAuthenticated && pushSupported && !isSubscribed && !pushLoading) {
      const autoPrompted = sessionStorage.getItem('push-auto-prompted');
      if (!autoPrompted) {
        sessionStorage.setItem('push-auto-prompted', '1');
        subscribe();
      }
    }
  }, [isAuthenticated, pushSupported, isSubscribed, pushLoading]);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
  });

  const { data: mySpots = [] } = useQuery<ParkingSpot[]>({
    queryKey: ["/api/parking-spots/my-spots"],
    enabled: isAuthenticated,
  });

  const { data: mySalesListings = [] } = useQuery<SalesListing[]>({
    queryKey: ["/api/sales-listings/my-listings"],
    enabled: isAuthenticated,
  });

  type EnrichedMessage = Message & { senderName?: string; receiverName?: string; spotTitle?: string | null };

  const { data: allMessages = [], isLoading: messagesLoading } = useQuery<EnrichedMessage[]>({
    queryKey: ["/api/messages"],
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const replyMutation = useMutation({
    mutationFn: async (data: { receiverId: string; spotId?: string | null; content: string }) => {
      return await apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      setReplyContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Poruka poslata" });
    },
    onError: () => {
      toast({ title: "Greška", description: "Nije moguće poslati poruku", variant: "destructive" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (messageId: string) => apiRequest("PUT", `/api/messages/${messageId}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  type ConversationPartner = {
    otherId: string;
    otherName: string;
    lastMessage: EnrichedMessage;
    unreadCount: number;
    messages: EnrichedMessage[];
    spotId?: string | null;
    spotTitle?: string | null;
  };

  const conversations = (() => {
    if (!user || !allMessages.length) return [];
    const grouped: Record<string, ConversationPartner> = {};
    for (const msg of allMessages) {
      const otherId = msg.senderId === user.id ? msg.receiverId : msg.senderId;
      const otherName = msg.senderId === user.id ? (msg.receiverName || 'Korisnik') : (msg.senderName || 'Korisnik');
      const key = msg.spotId ? `${otherId}-${msg.spotId}` : otherId;
      if (!grouped[key]) {
        grouped[key] = {
          otherId,
          otherName,
          lastMessage: msg,
          unreadCount: 0,
          messages: [],
          spotId: msg.spotId,
          spotTitle: msg.spotTitle,
        };
      }
      grouped[key].messages.push(msg);
      if (!msg.isRead && msg.receiverId === user.id) {
        grouped[key].unreadCount++;
      }
      if (msg.createdAt && grouped[key].lastMessage.createdAt && new Date(msg.createdAt) > new Date(grouped[key].lastMessage.createdAt!)) {
        grouped[key].lastMessage = msg;
      }
    }
    return Object.entries(grouped)
      .map(([key, conv]) => ({ key, ...conv }))
      .sort((a, b) => new Date(b.lastMessage.createdAt!).getTime() - new Date(a.lastMessage.createdAt!).getTime());
  })();

  const activeConversation = selectedConversation ? conversations.find(c => c.key === selectedConversation) : null;

  useEffect(() => {
    if (activeConversation && user) {
      activeConversation.messages.forEach(msg => {
        if (!msg.isRead && msg.receiverId === user.id) {
          markReadMutation.mutate(msg.id);
        }
      });
    }
  }, [selectedConversation, allMessages]);

  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'spots';

  const totalUnread = allMessages.filter(m => !m.isRead && m.receiverId === user?.id).length;

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phoneNumber: user?.phoneNumber || "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phoneNumber: user.phoneNumber || "",
      });
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: z.infer<typeof profileSchema>) =>
      apiRequest("PUT", "/api/users/profile", data),
    onSuccess: () => {
      toast({
        title: "Uspešno",
        description: "Profil je ažuriran",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Nije moguće ažurirati profil",
        variant: "destructive",
      });
    },
  });

  const deleteSpotMutation = useMutation({
    mutationFn: (spotId: string) =>
      apiRequest("DELETE", `/api/parking-spots/${spotId}`, {}),
    onSuccess: () => {
      toast({
        title: "Uspešno",
        description: "Parking mesto je izbrisano",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/parking-spots/my-spots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parking-spots"] });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Nije moguće obrisati parking mesto",
        variant: "destructive" as const,
      });
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: ({ spotId, tier }: { spotId: string; tier: 'silver' | 'gold' }) =>
      apiRequest("POST", "/api/stripe/create-checkout-existing", { spotId, tier }),
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Nije moguće pokrenuti nadogradnju",
        variant: "destructive" as const,
      });
    },
  });

  const deleteSaleListingMutation = useMutation({
    mutationFn: (listingId: string) =>
      apiRequest("DELETE", `/api/sales-listings/${listingId}`, {}),
    onSuccess: () => {
      toast({
        title: "Uspešno",
        description: "Oglas prodaje je izbrisan",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-listings/my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-listings"] });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Nije moguće obrisati oglas",
        variant: "destructive",
      });
    },
  });

  // Calculate total earnings from manual bookings in localStorage
  const [totalEarnings, setTotalEarnings] = useState(0);
  useEffect(() => {
    const saved = localStorage.getItem("parkin-manual-bookings");
    if (saved) {
      const bookings = JSON.parse(saved);
      const total = bookings.reduce((sum: number, booking: { price: string }) => {
        const priceNum = parseFloat(booking.price) || 0;
        return sum + priceNum;
      }, 0);
      setTotalEarnings(total);
    }
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Učitavanje...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/home" className="flex items-center gap-2">
              <img src={parkInLogo} alt="CarDrop" className="w-10 h-10 rounded-lg" />
              <span className="text-xl font-bold text-foreground">CarDrop</span>
            </Link>
            <div className="flex items-center gap-2">
              {user?.isAdmin && (
                <Link href="/admin">
                  <Button variant="outline" size="sm" data-testid="button-admin-panel">
                    <Shield className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                data-testid="button-logout"
                onClick={async () => {
                  try {
                    await apiRequest("POST", "/api/auth/logout", {});
                  } catch (e) {}
                  queryClient.clear();
                  window.location.href = "/";
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Odjava
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-foreground">Moj Nalog</h1>

        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="mb-8 flex-wrap gap-2 h-auto p-2 bg-card border border-border" data-testid="dashboard-tabs">
            <TabsTrigger value="spots" data-testid="tab-my-spots" className="px-4 py-2.5 text-sm font-medium rounded-md data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-sm">
              <MapPin className="w-4 h-4 mr-2" />
              Parking Mesta
            </TabsTrigger>
            <TabsTrigger value="sales" data-testid="tab-my-sales" className="px-4 py-2.5 text-sm font-medium rounded-md data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-sm">
              <Tag className="w-4 h-4 mr-2" />
              Oglasi Prodaje
            </TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings" className="px-4 py-2.5 text-sm font-medium rounded-md data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-sm">
              <Edit2 className="w-4 h-4 mr-2" />
              Rezervacije
            </TabsTrigger>
            <TabsTrigger value="messages" data-testid="tab-messages" className="px-4 py-2.5 text-sm font-medium rounded-md data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-sm">
              <MessageSquare className="w-4 h-4 mr-2" />
              Poruke
              {totalUnread > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold rounded-full bg-destructive text-destructive-foreground">
                  {totalUnread}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile" className="px-4 py-2.5 text-sm font-medium rounded-md data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-sm">
              <Bell className="w-4 h-4 mr-2" />
              Profil
            </TabsTrigger>
          </TabsList>

          {/* Ukupna zarada */}
          <Card className="p-4 mb-6 bg-accent/10 border-accent/30">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">Ukupna Zarada iz Rezervacija:</span>
              <span className="text-2xl font-bold text-accent" data-testid="text-total-earnings">
                {totalEarnings.toLocaleString('sr-RS')} RSD
              </span>
            </div>
          </Card>

          {/* Moja Parking Mesta */}
          <TabsContent value="spots" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-foreground">Moja Parking Mesta</h2>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mySpots.map((spot) => (
                  <Card 
                    key={spot.id} 
                    className={`p-4 hover-elevate relative ${
                      spot.subscriptionType === 'gold'
                        ? 'border-2 border-[#DAA520] ring-2 ring-[#DAA520]/20'
                        : spot.subscriptionType === 'silver'
                          ? 'border-2 border-[#A8A9AD] ring-2 ring-[#A8A9AD]/20'
                          : ''
                    }`} 
                    data-testid={`spot-card-${spot.id}`}
                  >
                    {spot.subscriptionType === 'gold' && (
                      <Badge className="absolute top-2 right-2 bg-gradient-to-r from-[#DAA520] via-[#FFD700] to-[#B8860B] text-white border-0">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Top lokacija
                      </Badge>
                    )}
                    {spot.subscriptionType === 'silver' && (
                      <Badge className="absolute top-2 right-2 bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A9AD] text-[#333] border-0">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Istaknuto
                      </Badge>
                    )}
                    {spot.imageUrls && spot.imageUrls[0] && (
                      <img
                        src={spot.imageUrls[0]}
                        alt={spot.title}
                        className={`w-full h-32 object-cover rounded-lg mb-4 ${
                          spot.subscriptionType === 'gold' ? 'ring-2 ring-[#DAA520]/30' 
                          : spot.subscriptionType === 'silver' ? 'ring-2 ring-[#A8A9AD]/30' 
                          : ''
                        }`}
                      />
                    )}
                    <h3 className="font-semibold text-lg mb-2 text-card-foreground">{spot.title}</h3>
                    <div className="flex items-start gap-2 mb-3 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="truncate">{spot.address}</span>
                    </div>
                    <div className="mb-4 text-sm">
                      <p className="text-foreground font-semibold">{spot.pricePerHour} {spot.currency}/h</p>
                      <p className="text-muted-foreground text-xs">
                        {spot.subscriptionType === 'gold'
                          ? `Gold plan - ${spot.subscriptionExpiresAt ? `Ističe: ${new Date(spot.subscriptionExpiresAt).toLocaleDateString('sr-RS')}` : 'Permanentno'}`
                          : spot.subscriptionType === 'silver'
                            ? `Silver plan - ${spot.subscriptionExpiresAt ? `Ističe: ${new Date(spot.subscriptionExpiresAt).toLocaleDateString('sr-RS')}` : 'Permanentno'}`
                            : `Standard plan - ${spot.subscriptionExpiresAt ? `Ističe: ${new Date(spot.subscriptionExpiresAt).toLocaleDateString('sr-RS')}` : 'Permanentno'}`
                        }
                      </p>
                    </div>
                    {(spot.subscriptionType === 'standard' || spot.subscriptionType === 'silver') && (
                      <div className="flex gap-2 mb-3">
                        {spot.subscriptionType === 'standard' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-[#A8A9AD] text-[#A8A9AD]"
                            onClick={() => upgradeMutation.mutate({ spotId: spot.id, tier: 'silver' })}
                            disabled={upgradeMutation.isPending}
                            data-testid={`button-upgrade-silver-${spot.id}`}
                          >
                            <ArrowUpCircle className="w-4 h-4 mr-1" />
                            Silver
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-[#DAA520] text-[#DAA520]"
                          onClick={() => upgradeMutation.mutate({ spotId: spot.id, tier: 'gold' })}
                          disabled={upgradeMutation.isPending}
                          data-testid={`button-upgrade-gold-${spot.id}`}
                        >
                          <ArrowUpCircle className="w-4 h-4 mr-1" />
                          Gold
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Link href={`/edit-spot/${spot.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full" data-testid={`button-edit-${spot.id}`}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Izmeni
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteSpotMutation.mutate(spot.id)}
                        data-testid={`button-delete-${spot.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Moji Oglasi Prodaje */}
          <TabsContent value="sales" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-foreground">Moji Oglasi Prodaje</h2>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mySalesListings.map((listing) => {
                  const priceNum = parseFloat(listing.price);
                  const areaNum = parseFloat(listing.area);
                  const pricePerSqm = areaNum > 0 ? Math.round(priceNum / areaNum) : 0;
                  const propertyTypeLabels: Record<string, string> = {
                    garage: "Garaža",
                    open_parking: "Otvoreno parking mesto",
                    closed_parking: "Zatvoreno parking mesto",
                    truck_parking: "Parking za kamione",
                    building_garage: "Garažno mesto u zgradi",
                    warehouse_parking: "Magacinski prostor",
                    other: "Ostalo",
                  };
                  return (
                    <Card key={listing.id} className="p-4 hover-elevate" data-testid={`sale-card-${listing.id}`}>
                      {listing.imageUrls && listing.imageUrls[0] && (
                        <img
                          src={listing.imageUrls[0]}
                          alt={listing.title}
                          className="w-full h-32 object-cover rounded-lg mb-4"
                        />
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="w-4 h-4 text-accent" />
                        <Badge variant="secondary">{propertyTypeLabels[listing.propertyType] || listing.propertyType}</Badge>
                      </div>
                      <h3 className="font-semibold text-lg mb-2 text-card-foreground">{listing.title}</h3>
                      <div className="flex items-start gap-2 mb-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="truncate">{listing.address}</span>
                      </div>
                      <div className="mb-2 text-sm">
                        <p className="text-foreground font-semibold text-lg">{priceNum.toLocaleString('sr-RS')} RSD</p>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Ruler className="w-3 h-3" />
                            {areaNum} m²
                          </span>
                          <span>{pricePerSqm.toLocaleString('sr-RS')} RSD/m²</span>
                        </div>
                      </div>
                      {listing.phone && (
                        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{listing.phone}</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => deleteSaleListingMutation.mutate(listing.id)}
                          data-testid={`button-delete-sale-${listing.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Obriši
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Moje Rezervacije */}
          <TabsContent value="bookings">
            <MyBookings embedded />
          </TabsContent>

          {/* Poruke */}
          <TabsContent value="messages" className="space-y-4">
            {!selectedConversation ? (
              <>
                <h2 className="text-2xl font-semibold text-foreground">Poruke</h2>
                {messagesLoading ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">Učitavanje poruka...</p>
                  </Card>
                ) : conversations.length === 0 ? (
                  <Card className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Nemate poruka</p>
                    <p className="text-sm text-muted-foreground mt-2">Poruke koje razmenjujete sa vlasnicima parking mesta će se pojaviti ovde.</p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <Card
                        key={conv.key}
                        className={`p-4 cursor-pointer hover-elevate ${conv.unreadCount > 0 ? 'border-accent/50' : ''}`}
                        onClick={() => setSelectedConversation(conv.key)}
                        data-testid={`conversation-${conv.key}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-semibold text-card-foreground ${conv.unreadCount > 0 ? 'text-foreground' : ''}`}>
                                {conv.otherName}
                              </span>
                              {conv.unreadCount > 0 && (
                                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-destructive text-destructive-foreground">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                            {conv.spotTitle && (
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {conv.spotTitle}
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
              <div className="flex flex-col h-[calc(100vh-320px)] min-h-[400px]">
                <div className="flex items-center gap-3 mb-4">
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedConversation(null); setReplyContent(""); }} data-testid="button-back-messages">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h3 className="font-semibold text-foreground">{activeConversation.otherName}</h3>
                    {activeConversation.spotTitle && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {activeConversation.spotTitle}
                      </p>
                    )}
                  </div>
                </div>

                <Card className="flex-1 overflow-y-auto p-4 space-y-3">
                  {[...activeConversation.messages].sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()).map((msg) => {
                    const isMine = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        data-testid={`message-${msg.id}`}
                      >
                        <div className={`max-w-[75%] rounded-lg px-3 py-2 ${isMine ? 'bg-accent text-accent-foreground' : 'bg-muted text-foreground'}`}>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                            <span className="text-[10px] opacity-70">
                              {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                            {isMine && (
                              msg.isRead
                                ? <CheckCheck className="w-3 h-3 opacity-70" />
                                : <Check className="w-3 h-3 opacity-50" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </Card>

                <div className="flex gap-2 mt-3">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Napišite odgovor..."
                    className="resize-none flex-1"
                    rows={2}
                    data-testid="input-reply-message"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (replyContent.trim()) {
                          const payload: any = {
                            receiverId: activeConversation.otherId,
                            content: replyContent.trim(),
                          };
                          if (activeConversation.spotId) payload.spotId = activeConversation.spotId;
                          replyMutation.mutate(payload);
                        }
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={() => {
                      if (replyContent.trim()) {
                        const payload: any = {
                          receiverId: activeConversation.otherId,
                          content: replyContent.trim(),
                        };
                        if (activeConversation.spotId) payload.spotId = activeConversation.spotId;
                        replyMutation.mutate(payload);
                      }
                    }}
                    disabled={!replyContent.trim() || replyMutation.isPending}
                    data-testid="button-send-reply"
                  >
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
          </TabsContent>

          {/* Profil */}
          <TabsContent value="profile" className="max-w-2xl">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-6 text-foreground">Moji Podaci</h2>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ime</FormLabel>
                        <FormControl>
                          <Input placeholder="Vaše ime" {...field} data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prezime</FormLabel>
                        <FormControl>
                          <Input placeholder="Vaše prezime" {...field} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input placeholder="Vaš telefon" {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Email:</strong> {user?.email}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        <strong>Probni Period:</strong> {user?.hasUsedFreeTrial ? "Već iskorišćen" : "Dostupan"}
                      </p>
                    </div>

                    {pushSupported && (
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {isSubscribed ? (
                            <Bell className="w-5 h-5 text-accent" />
                          ) : (
                            <BellOff className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium text-foreground">Push Obaveštenja</p>
                            <p className="text-sm text-muted-foreground">
                              {isSubscribed ? "Primate obaveštenja" : "Obaveštenja su isključena"}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={isSubscribed}
                          onCheckedChange={handlePushToggle}
                          disabled={pushLoading}
                          data-testid="switch-push-notifications"
                        />
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      {updateProfileMutation.isPending ? "Čuvanje..." : "Sačuvaj Izmene"}
                    </Button>
                  </div>
                </form>
              </Form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
