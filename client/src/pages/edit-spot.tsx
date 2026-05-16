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
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ParkingSpot } from "@shared/schema";
import { Link } from "wouter";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { HomeIcon, Info, Clock } from "lucide-react";

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
  paymentType: z.enum(['cash', 'bank_transfer']),
  spotType: z.string().min(1, "Tip mesta je obavezan"),
  hasEvCharging: z.boolean().default(false),
  hasSecurityCamera: z.boolean().default(false),
  is24Hours: z.boolean().default(true),
  pricingType: z.enum(['hourly', 'daily', 'weekly', 'monthly']).default('daily'),
  advertiserType: z.enum(['owner', 'agency', 'company']).default('owner'),
  companyName: z.string().optional(),
  pib: z.string().optional(),
  contactPerson: z.string().optional(),
});

const serbianCities = [
  "Beograd", "Novi Sad", "Niš", "Kragujevac", "Subotica",
  "Zrenjanin", "Pančevo", "Čačak", "Kraljevo", "Smederevo",
  "Leskovac", "Užice", "Valjevo", "Šabac", "Sombor",
];

const CATEGORY_LABELS: Record<string, string> = {
  private: "Privatni parking/garaža",
  company: "Firma",
  truck: "Truck stop",
  residential: "Stambena zajednica",
  carlot: "Auto-plac",
};

const SUB_TYPE_LABELS: Record<string, string> = {
  standard: "Besplatni", silver: "Silver Premium", gold: "Gold Premium",
};

export default function EditSpot() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/edit-spot/:id");
  const spotId = params?.id as string | undefined;
  const { toast } = useToast();
  const [rentalDurationType, setRentalDurationType] = useState<'short' | 'long'>('short');

  const { data: spot, isLoading: spotLoading } = useQuery<ParkingSpot & { pendingUntil?: string }>({
    queryKey: ["/api/parking-spots", spotId],
    enabled: !!spotId && isAuthenticated,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "", description: "", address: "", city: "", phone: "", contactEmail: "",
      latitude: "45.2671", longitude: "19.8335", pricePerHour: "", currency: "RSD",
      paymentType: "cash", spotType: "uncovered", hasEvCharging: false,
      hasSecurityCamera: false, is24Hours: true, pricingType: "daily",
      advertiserType: "owner", companyName: "", pib: "", contactPerson: "",
    },
  });

  const watchedPricingType = form.watch("pricingType");
  const watchedAdvertiserType = form.watch("advertiserType");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) setLocation("/");
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
        paymentType: spot.paymentType as 'cash' | 'bank_transfer',
        spotType: spot.spotType,
        hasEvCharging: spot.hasEvCharging,
        hasSecurityCamera: spot.hasSecurityCamera,
        is24Hours: spot.is24Hours,
        pricingType: (spot.pricingType as 'hourly' | 'daily' | 'monthly' | 'weekly') || "daily",
        advertiserType: (spot.advertiserType as 'owner' | 'agency' | 'company') || "owner",
        companyName: spot.companyName || "",
        pib: spot.pib || "",
        contactPerson: spot.contactPerson || "",
      });
      if (spot.pricingType === 'weekly' || spot.pricingType === 'monthly') {
        setRentalDurationType('long');
      } else {
        setRentalDurationType('short');
      }
    }
  }, [spot, form]);

  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) =>
      apiRequest("PUT", `/api/parking-spots/${spotId}`, data),
    onSuccess: (response: { pendingUntil?: string }) => {
      const pendingUntil = response?.pendingUntil;
      if (pendingUntil) {
        const date = new Date(pendingUntil);
        const formattedDate = date.toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
        toast({
          title: "Izmene su sačuvane",
          description: `Izmene će biti primenjene u ponoć — ${formattedDate}`,
        });
      } else {
        toast({ title: "Uspešno", description: "Parking mesto je ažurirano" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/parking-spots/my-spots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parking-spots", spotId] });
      setLocation("/dashboard");
    },
    onError: () => {
      toast({ title: "Greška", description: "Nije moguće ažurirati parking mesto", variant: "destructive" });
    },
  });

  if (!spotId || spotLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Učitavanje...</div>;
  }

  if (!spot) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Parking mesto nije pronađeno</div>;
  }

  const hasPending = !!spot.pendingChanges;
  const pendingFrom: Date | null = spot.pendingChangesFrom ? new Date(spot.pendingChangesFrom) : null;
  const pendingActive = hasPending && pendingFrom && pendingFrom > new Date();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <img src={parkInLogo} alt="CarDrop" className="w-8 h-8 rounded-lg" />
              <span className="text-base font-bold text-foreground hidden sm:inline">CarDrop</span>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" data-testid="button-dashboard">
                <HomeIcon className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Moj Nalog</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Izmeni Parking Mesto</h1>
        <p className="text-muted-foreground mb-6">Ažurirajte informacije o svom parking mestu</p>

        {/* Read-only system info */}
        <Card className="p-4 mb-6 bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Sistemske informacije (samo za čitanje)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {spot.parkingNumber && (
              <Badge variant="outline" className="text-xs">
                Broj: {spot.parkingNumber}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              Kategorija: {CATEGORY_LABELS[spot.category] || spot.category || 'N/A'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Plan: {SUB_TYPE_LABELS[spot.subscriptionType] || spot.subscriptionType}
            </Badge>
            <Badge variant={spot.isPremium ? 'default' : 'outline'} className="text-xs">
              {spot.isPremium ? 'Premium' : 'Osnovno'}
            </Badge>
            <Badge variant={spot.isActive ? 'default' : 'secondary'} className="text-xs">
              {spot.isActive ? 'Aktivno' : 'Neaktivno'}
            </Badge>
            {spot.stripeLink && (
              <Badge variant="outline" className="text-xs">
                Stripe: {spot.stripeLinkActive ? 'Aktivan' : 'Neaktivan'}
              </Badge>
            )}
          </div>
        </Card>

        {/* Pending changes banner */}
        {pendingActive && pendingFrom && (
          <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md" data-testid="banner-pending-changes">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Izmene čekaju primenu</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Prethodne izmene biće vidljive korisnicima od{' '}
                <strong>{pendingFrom.toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</strong>.
                Nove izmene će zameniti prethodne.
              </p>
            </div>
          </div>
        )}

        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Naslov</FormLabel>
                  <FormControl><Input placeholder="Naslov parking mesta" {...field} data-testid="input-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis</FormLabel>
                  <FormControl><Textarea placeholder="Detaljno opišite parking mesto" className="min-h-32" {...field} data-testid="input-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresa</FormLabel>
                  <FormControl><Input placeholder="Unesite adresu" {...field} data-testid="input-address" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="city" render={({ field }) => (
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
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl><Input placeholder="Broj telefona" {...field} data-testid="input-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="Email adresa" {...field} data-testid="input-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">Trajanje zakupa</label>
                <Select value={rentalDurationType} onValueChange={(val: 'short' | 'long') => {
                  setRentalDurationType(val);
                  form.setValue('pricingType', val === 'short' ? 'hourly' : 'weekly');
                }}>
                  <SelectTrigger data-testid="select-rental-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Kratkoročno (sat/dan)</SelectItem>
                    <SelectItem value="long">Dugoročno (nedelja/mesec)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <FormField control={form.control} name="pricingType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Period naplate</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-pricing-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rentalDurationType === 'short' ? (
                        <>
                          <SelectItem value="hourly">Po satu</SelectItem>
                          <SelectItem value="daily">Po danu</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="weekly">Po nedelji</SelectItem>
                          <SelectItem value="monthly">Po mesecu</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="pricePerHour" render={({ field }) => {
                  const label = { hourly: 'Cena po satu', daily: 'Cena po danu', weekly: 'Cena po nedelji', monthly: 'Cena po mesecu' }[watchedPricingType] || 'Cena po danu';
                  return (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="Cena" {...field} data-testid="input-price" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }} />

                <FormField control={form.control} name="paymentType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tip Plaćanja</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Keš</SelectItem>
                        <SelectItem value="bank_transfer">Preko računa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="spotType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tip Parking Mesta</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-spot-type"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="uncovered">Otvoreno</SelectItem>
                      <SelectItem value="covered">Pokriveno</SelectItem>
                      <SelectItem value="garage">Garaža</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="space-y-3">
                <FormField control={form.control} name="hasEvCharging" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-ev" /></FormControl>
                    <FormLabel className="!mt-0 cursor-pointer">Ima EV punjač</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="hasSecurityCamera" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-camera" /></FormControl>
                    <FormLabel className="!mt-0 cursor-pointer">Ima sigurnosnu kameru</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="is24Hours" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-24h" /></FormControl>
                    <FormLabel className="!mt-0 cursor-pointer">Dostupno 24/7</FormLabel>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="advertiserType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tip oglašivača</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-advertiser-type"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="owner">Vlasnik</SelectItem>
                      <SelectItem value="agency">Agencija</SelectItem>
                      <SelectItem value="company">Firma</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {(watchedAdvertiserType === 'company' || watchedAdvertiserType === 'agency') && (
                <div className="space-y-4">
                  <FormField control={form.control} name="companyName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Naziv firme</FormLabel>
                      <FormControl><Input placeholder="Unesite naziv firme" {...field} data-testid="input-company-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="pib" render={({ field }) => (
                    <FormItem>
                      <FormLabel>PIB</FormLabel>
                      <FormControl><Input placeholder="Poreski identifikacioni broj" {...field} data-testid="input-pib" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contactPerson" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kontakt osoba</FormLabel>
                      <FormControl><Input placeholder="Ime kontakt osobe" {...field} data-testid="input-contact-person" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-save">
                {mutation.isPending ? "Čuvanje..." : "Sačuvaj Izmene"}
              </Button>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
