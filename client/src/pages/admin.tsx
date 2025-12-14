import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, Users, Car, Shield, Loader2 } from "lucide-react";
import type { User, ParkingSpot } from "@shared/schema";
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
          Nazad na početnu
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
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="users" className="flex items-center gap-2" data-testid="tab-users">
              <Users className="h-4 w-4" />
              Korisnici ({users?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="spots" className="flex items-center gap-2" data-testid="tab-spots">
              <Car className="h-4 w-4" />
              Parking mesta ({parkingSpots?.length || 0})
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
                        className="flex items-center justify-between p-4 bg-surface rounded-lg border border-border"
                        data-testid={`row-user-${user.id}`}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {user.firstName} {user.lastName}
                            {user.isAdmin && (
                              <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                                Admin
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: {user.id} | Trial: {user.hasUsedFreeTrial ? "Iskorišćen" : "Dostupan"}
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
                                  Ova akcija je nepovratna. Korisnik {user.email} će biti trajno obrisan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Otkaži</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUserMutation.mutate(user.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Obriši
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
                        className="flex items-center justify-between p-4 bg-surface rounded-lg border border-border"
                        data-testid={`row-spot-${spot.id}`}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{spot.title}</p>
                          <p className="text-sm text-muted-foreground">{spot.address}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: {spot.id} | Vlasnik: {spot.ownerId} | Cena: {spot.pricePerHour} RSD/h
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Status: {spot.isActive ? "Aktivan" : "Neaktivan"} | 
                            Pretplata: {spot.subscriptionType || "N/A"}
                          </p>
                        </div>
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
                                Ova akcija je nepovratna. Parking mesto "{spot.title}" će biti trajno obrisano.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Otkaži</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteSpotMutation.mutate(spot.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Obriši
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nema parking mesta</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
