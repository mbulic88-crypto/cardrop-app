import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ParkingSpot } from "@shared/schema";
import { Link } from "wouter";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { HomeIcon, Globe } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(5, "Naslov mora imati najmanje 5 karaktera"),
  description: z.string().min(1, "Opis je obavezan"),
  address: z.string().min(5, "Adresa mora biti uneta"),
  city: z.preprocess((val) => val === "" ? undefined : val, z.string().optional()),
  phone: z.string().min(5, "Telefon mora imati najmanje 5 karaktera"),
  contactEmail: z.string().email("Unesite validnu email adresu"),
  latitude: z.string().min(1, "Geografska širina je obavezna"),
  longitude: z.string().min(1, "Geografska dužina je obavezna"),
  pricePerHour: z.string().min(1, "Cena je obavezna"),
  currency: z.string().default("RSD"),
  paymentType: z.enum(['cash', 'bank_transfer', 'card_monri']),
  spotType: z.string().min(1, "Tip mesta je obavezan"),
  hasEvCharging: z.boolean().default(false),
  hasSecurityCamera: z.boolean().default(false),
  is24Hours: z.boolean().default(true),
});

const serbianCities = [
  "Beograd", "Novi Sad", "Niš", "Kragujevac", "Subotica",
  "Zrenjanin", "Pančevo", "Čačak", "Kraljevo", "Smederevo",
  "Leskovac", "Užice", "Valjevo", "Šabac", "Sombor",
];

export default function EditSpot() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/edit-spot/:id");
  const spotId = params?.id as string | undefined;
  const { toast } = useToast();

  const { data: spot, isLoading: spotLoading } = useQuery<ParkingSpot>({
    queryKey: ["/api/parking-spots", spotId],
    enabled: !!spotId && isAuthenticated,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      address: "",
      city: "",
      phone: "",
      contactEmail: "",
      latitude: "45.2671",
      longitude: "19.8335",
      pricePerHour: "",
      currency: "RSD",
      paymentType: "cash",
      spotType: "uncovered",
      hasEvCharging: false,
      hasSecurityCamera: false,
      is24Hours: true,
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (spot) {
      form.reset({
        title: spot.title,
        description: spot.description,
        address: spot.address,
        city: spot.city || "",
        phone: spot.phone,
        contactEmail: spot.contactEmail,
        latitude: String(spot.latitude),
        longitude: String(spot.longitude),
        pricePerHour: String(spot.pricePerHour),
        currency: spot.currency,
        paymentType: spot.paymentType as any,
        spotType: spot.spotType,
        hasEvCharging: spot.hasEvCharging,
        hasSecurityCamera: spot.hasSecurityCamera,
        is24Hours: spot.is24Hours,
      });
    }
  }, [spot, form]);

  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) =>
      apiRequest("PUT", `/api/parking-spots/${spotId}`, data),
    onSuccess: () => {
      toast({
        title: "Uspešno",
        description: "Parking mesto je ažurirano",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/parking-spots/my-spots"] });
      setLocation("/dashboard");
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Nije moguće ažurirati parking mesto",
        variant: "destructive",
      });
    },
  });

  if (!spotId || spotLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Učitavanje...</div>;
  }

  if (!spot) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Parking mesto nije pronađeno</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-1 xs:px-2 sm:px-4 py-2.5 xs:py-3 sm:py-4">
          <div className="flex items-center justify-between gap-1 xs:gap-2">
            <Link href="/dashboard" className="flex items-center gap-1.5 xs:gap-2">
              <img src={parkInLogo} alt="ParkIN" className="w-7 xs:w-8 h-7 xs:h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground hidden sm:inline">ParkIN</span>
            </Link>

            <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-2">
              <Link href="/dashboard" className="hidden xs:inline-block">
                <Button variant="outline" size="icon" className="h-8 w-8 xs:h-9 xs:w-9 sm:w-auto sm:px-3" data-testid="button-dashboard">
                  <HomeIcon className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Moj Nalog</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Izmeni Parking Mesto</h1>
        <p className="text-muted-foreground mb-8">Ažurirajte informacije o svom parking mestu</p>

        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naslov</FormLabel>
                    <FormControl>
                      <Input placeholder="Naslov parking mesta" {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opis</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detaljno opišite parking mesto" className="min-h-32" {...field} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Unesite adresu" {...field} data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grad</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-city">
                          <SelectValue placeholder="Izaberite grad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serbianCities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input placeholder="Broj telefona" {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email adresa" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pricePerHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cena po satu</FormLabel>
                      <FormControl>
                        <Input placeholder="Cena" {...field} data-testid="input-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tip Plaćanja</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Keš</SelectItem>
                          <SelectItem value="bank_transfer">Preko računa</SelectItem>
                          <SelectItem value="card_monri">Kartično</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="spotType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tip Parking Mesta</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-spot-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="uncovered">Otvoreno</SelectItem>
                        <SelectItem value="covered">Pokriveno</SelectItem>
                        <SelectItem value="garage">Garaža</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="hasEvCharging"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-ev" />
                      </FormControl>
                      <FormLabel className="!mt-0 cursor-pointer">Ima EV punjač</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasSecurityCamera"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-camera" />
                      </FormControl>
                      <FormLabel className="!mt-0 cursor-pointer">Ima sigurnosnu kameru</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is24Hours"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-24h" />
                      </FormControl>
                      <FormLabel className="!mt-0 cursor-pointer">Dostupno 24/7</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
                data-testid="button-save"
              >
                {mutation.isPending ? "Čuvanje..." : "Sačuvaj Izmene"}
              </Button>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
