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
import type { User, ParkingSpot, SalesListing } from "@shared/schema";
import { MapPin, Edit2, Trash2, LogOut, Bell, BellOff, Sparkles, Tag, Ruler, Phone } from "lucide-react";
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
        variant: "destructive",
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
            <a href="/api/logout">
              <Button variant="outline" size="sm" data-testid="button-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Odjava
              </Button>
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-foreground">Moj Nalog</h1>

        <Tabs defaultValue="spots" className="w-full">
          <TabsList className="mb-8" data-testid="dashboard-tabs">
            <TabsTrigger value="spots" data-testid="tab-my-spots">Moja Parking Mesta</TabsTrigger>
            <TabsTrigger value="sales" data-testid="tab-my-sales">Moji Oglasi Prodaje</TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">Moje Rezervacije</TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile">Profil</TabsTrigger>
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
              <Link href="/add-spot">
                <Button data-testid="button-add-spot">Dodaj Novo Mesto</Button>
              </Link>
            </div>

            {mySpots.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">Nemate aktivnih parking mesta</p>
                <Link href="/add-spot">
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
                        {spot.subscriptionType === 'standard' 
                          ? 'Standard plan - 60 dana' 
                          : spot.subscriptionExpiresAt 
                            ? `${spot.subscriptionType === 'gold' ? 'Gold' : 'Silver'} - Ističe: ${new Date(spot.subscriptionExpiresAt).toLocaleDateString('sr-RS')}`
                            : 'Aktivan'
                        }
                      </p>
                    </div>
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
