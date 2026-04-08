import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { DraggableLocationMap } from "@/components/DraggableLocationMap";
import { ArrowLeft, Trash2, Users, Car, Shield, Loader2, Power, ShoppingBag, MapPin, Activity } from "lucide-react";
import Map, { Marker as MapMarkerPin, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { User, ParkingSpot, SalesListing, MapMarker } from "@shared/schema";
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

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editCoordSpot, setEditCoordSpot] = useState<ParkingSpot | null>(null);
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");

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
              Map Hack NS ({mapMarkersList?.length || 0})
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

          <TabsContent value="maphack">
            <div className="space-y-4">
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
