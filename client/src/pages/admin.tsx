import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, Users, Car, Shield, Loader2, Power, ShoppingBag } from "lucide-react";
import type { User, ParkingSpot, SalesListing } from "@shared/schema";
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

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: currentUser, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
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
          <TabsList className="grid w-full grid-cols-3 mb-6">
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
                <CardTitle>Sva parking mesta</CardTitle>
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
                        className={`flex items-center justify-between gap-3 p-4 rounded-md border ${
                          spot.isActive
                            ? "bg-surface border-border"
                            : "bg-destructive/5 border-destructive/20"
                        }`}
                        data-testid={`row-spot-${spot.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground truncate">{spot.title}</p>
                            {getTierBadge(spot.subscriptionType)}
                            <Badge variant="outline">{getCategoryLabel(spot.category)}</Badge>
                            {spot.isActive ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Aktivan</Badge>
                            ) : (
                              <Badge variant="destructive">Neaktivan</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">{spot.address}</p>
                          <p className="text-xs text-muted-foreground">
                            Vlasnik: {spot.ownerId} | Cena: {spot.pricePerHour} RSD
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
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
        </Tabs>
      </main>
    </div>
  );
}
