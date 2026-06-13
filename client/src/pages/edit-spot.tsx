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
import { useLanguage } from "@/hooks/useLanguage";

const est = {
  sr: {
    pageTitle: "Izmeni Parking Mesto",
    pageSubtitle: "Ažurirajte informacije o svom parking mestu",
    systemInfo: "Sistemske informacije (samo za čitanje)",
    badgeNumber: "Broj",
    badgeCategory: "Kategorija",
    badgePlan: "Plan",
    premium: "Premium",
    basic: "Osnovno",
    active: "Aktivno",
    inactive: "Neaktivno",
    stripeActive: "Aktivan",
    stripeInactive: "Neaktivan",
    pendingTitle: "Izmene čekaju primenu",
    pendingDesc: "Prethodne izmene biće vidljive korisnicima od",
    pendingNote: "Nove izmene će zameniti prethodne.",
    loading: "Učitavanje...",
    notFound: "Parking mesto nije pronađeno",
    myAccount: "Moj Nalog",
    title: "Naslov",
    titlePlaceholder: "Naslov parking mesta",
    description: "Opis",
    descPlaceholder: "Detaljno opišite parking mesto",
    address: "Adresa",
    addressPlaceholder: "Unesite adresu",
    city: "Grad",
    cityPlaceholder: "Izaberite grad",
    phone: "Telefon",
    phonePlaceholder: "Broj telefona",
    email: "Email",
    emailPlaceholder: "Email adresa",
    pricing: "Cene iznajmljivanja",
    pricingDesc: "Unesite bar jednu cenu. Zakupci biraju koji tip im odgovara.",
    priceHour: "Cena po satu",
    priceDay: "Cena po danu",
    priceWeek: "Cena po nedelji",
    priceMonth: "Cena po mesecu",
    spotType: "Tip Parking Mesta",
    uncovered: "Otvoreno",
    covered: "Pokriveno",
    garage: "Garaža",
    hasEv: "Ima EV punjač",
    hasCamera: "Ima sigurnosnu kameru",
    is24h: "Dostupno 24/7",
    advertiserType: "Tip oglašivača",
    owner: "Vlasnik",
    agency: "Agencija",
    company: "Firma",
    companyName: "Naziv firme",
    companyNamePlaceholder: "Unesite naziv firme",
    pib: "PIB",
    pibPlaceholder: "Poreski identifikacioni broj",
    contactPerson: "Kontakt osoba",
    contactPersonPlaceholder: "Ime kontakt osobe",
    validTitle: "Naslov mora imati najmanje 5 karaktera",
    validDesc: "Opis je obavezan",
    validAddress: "Adresa mora biti uneta",
    validPhone: "Telefon mora imati najmanje 5 karaktera",
    validEmail: "Unesite validnu email adresu",
    validLat: "Geografska širina je obavezna",
    validLng: "Geografska dužina je obavezna",
    validType: "Tip mesta je obavezan",
    save: "Sačuvaj Izmene",
    saving: "Čuvanje...",
    saveSuccess: "Izmene su sačuvane",
    saveSuccessDesc: "Izmene će biti primenjene u ponoć",
    saveSuccessOld: "Stare rezervacije važe po starim uslovima.",
    saveOk: "Uspešno",
    saveOkDesc: "Parking mesto je ažurirano",
    saveError: "Greška",
    saveErrorDesc: "Nije moguće ažurirati parking mesto",
    stripe: "Stripe",
  },
  en: {
    pageTitle: "Edit Parking Spot",
    pageSubtitle: "Update your parking spot information",
    systemInfo: "System info (read-only)",
    badgeNumber: "Number",
    badgeCategory: "Category",
    badgePlan: "Plan",
    premium: "Premium",
    basic: "Basic",
    active: "Active",
    inactive: "Inactive",
    stripeActive: "Active",
    stripeInactive: "Inactive",
    pendingTitle: "Changes pending",
    pendingDesc: "Previous changes will be visible to users from",
    pendingNote: "New changes will replace the previous ones.",
    loading: "Loading...",
    notFound: "Parking spot not found",
    myAccount: "My Account",
    title: "Title",
    titlePlaceholder: "Parking spot title",
    description: "Description",
    descPlaceholder: "Describe your parking spot in detail",
    address: "Address",
    addressPlaceholder: "Enter address",
    city: "City",
    cityPlaceholder: "Select city",
    phone: "Phone",
    phonePlaceholder: "Phone number",
    email: "Email",
    emailPlaceholder: "Email address",
    pricing: "Rental prices",
    pricingDesc: "Enter at least one price. Renters choose what works for them.",
    priceHour: "Price per hour",
    priceDay: "Price per day",
    priceWeek: "Price per week",
    priceMonth: "Price per month",
    spotType: "Parking Spot Type",
    uncovered: "Uncovered",
    covered: "Covered",
    garage: "Garage",
    hasEv: "Has EV charger",
    hasCamera: "Has security camera",
    is24h: "Available 24/7",
    advertiserType: "Advertiser type",
    owner: "Owner",
    agency: "Agency",
    company: "Company",
    companyName: "Company name",
    companyNamePlaceholder: "Enter company name",
    pib: "PIB",
    pibPlaceholder: "Tax identification number",
    contactPerson: "Contact person",
    contactPersonPlaceholder: "Contact person name",
    validTitle: "Title must be at least 5 characters",
    validDesc: "Description is required",
    validAddress: "Address is required",
    validPhone: "Phone must be at least 5 characters",
    validEmail: "Enter a valid email address",
    validLat: "Latitude is required",
    validLng: "Longitude is required",
    validType: "Spot type is required",
    save: "Save Changes",
    saving: "Saving...",
    saveSuccess: "Changes saved",
    saveSuccessDesc: "Changes will be applied at midnight",
    saveSuccessOld: "Existing reservations remain under old terms.",
    saveOk: "Success",
    saveOkDesc: "Parking spot updated",
    saveError: "Error",
    saveErrorDesc: "Unable to update parking spot",
    stripe: "Stripe",
  },
};

const makeFormSchema = (v: Pick<typeof est.sr, 'validTitle' | 'validDesc' | 'validAddress' | 'validPhone' | 'validEmail' | 'validLat' | 'validLng' | 'validType'>) => z.object({
  title: z.string().min(5, v.validTitle),
  description: z.string().min(1, v.validDesc),
  address: z.string().min(5, v.validAddress),
  city: z.preprocess((val) => val === "" ? undefined : val, z.string().optional()),
  phone: z.string().min(5, v.validPhone),
  contactEmail: z.string().email(v.validEmail),
  latitude: z.string().min(1, v.validLat),
  longitude: z.string().min(1, v.validLng),
  pricePerHour: z.string().optional(),
  pricePerDay: z.string().optional(),
  pricePerWeek: z.string().optional(),
  pricePerMonth: z.string().optional(),
  currency: z.string().default("RSD"),
  spotType: z.string().min(1, v.validType),
  hasEvCharging: z.boolean().default(false),
  hasSecurityCamera: z.boolean().default(false),
  is24Hours: z.boolean().default(true),
  advertiserType: z.enum(['owner', 'agency', 'company']).default('owner'),
  companyName: z.string().optional(),
  pib: z.string().optional(),
  contactPerson: z.string().optional(),
});
type FormValues = z.infer<ReturnType<typeof makeFormSchema>>;

const serbianCities = [
  "Beograd", "Novi Sad", "Niš", "Kragujevac", "Subotica",
  "Zrenjanin", "Pančevo", "Čačak", "Kraljevo", "Smederevo",
  "Leskovac", "Užice", "Valjevo", "Šabac", "Sombor",
];

const CATEGORY_LABELS_SR: Record<string, string> = {
  private: "Privatni parking/garaža", company: "Firma", truck: "Truck stop",
  residential: "Stambena zajednica", carlot: "Auto-plac",
};
const CATEGORY_LABELS_EN: Record<string, string> = {
  private: "Private parking/garage", company: "Company", truck: "Truck stop",
  residential: "Residential community", carlot: "Car lot",
};
const SUB_TYPE_LABELS_SR: Record<string, string> = {
  standard: "Besplatni", silver: "Silver Premium", gold: "Gold Premium",
};
const SUB_TYPE_LABELS_EN: Record<string, string> = {
  standard: "Free", silver: "Silver Premium", gold: "Gold Premium",
};

export default function EditSpot() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/edit-spot/:id");
  const spotId = params?.id as string | undefined;
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = est[language === "sr" ? "sr" : "en"];
  const formSchema = makeFormSchema(t);
  const CATEGORY_LABELS = language === "sr" ? CATEGORY_LABELS_SR : CATEGORY_LABELS_EN;
  const SUB_TYPE_LABELS = language === "sr" ? SUB_TYPE_LABELS_SR : SUB_TYPE_LABELS_EN;

  const { data: spot, isLoading: spotLoading } = useQuery<ParkingSpot & { pendingUntil?: string }>({
    queryKey: ["/api/parking-spots", spotId],
    enabled: !!spotId && isAuthenticated,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "", description: "", address: "", city: "", phone: "", contactEmail: "",
      latitude: "45.2671", longitude: "19.8335",
      pricePerHour: "", pricePerDay: "", pricePerWeek: "", pricePerMonth: "",
      currency: "RSD", spotType: "uncovered", hasEvCharging: false,
      hasSecurityCamera: false, is24Hours: true,
      advertiserType: "owner", companyName: "", pib: "", contactPerson: "",
    },
  });

  const watchedAdvertiserType = form.watch("advertiserType");

  const onSubmit = (values: FormValues) => {
    const hasPrice = [values.pricePerHour, values.pricePerDay, values.pricePerWeek, values.pricePerMonth]
      .some(p => p && parseFloat(p) > 0);
    if (!hasPrice) {
      form.setError('pricePerHour', { message: 'Unesite bar jednu cenu' });
      return;
    }
    const nullPrice = (v?: string) => (v && parseFloat(v) > 0 ? v : null);
    mutation.mutate({
      ...values,
      pricePerHour: nullPrice(values.pricePerHour) as any,
      pricePerDay: nullPrice(values.pricePerDay) as any,
      pricePerWeek: nullPrice(values.pricePerWeek) as any,
      pricePerMonth: nullPrice(values.pricePerMonth) as any,
    });
  };

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
        pricePerHour: spot.pricePerHour ? String(spot.pricePerHour) : "",
        pricePerDay: (spot as any).pricePerDay ? String((spot as any).pricePerDay) : "",
        pricePerWeek: (spot as any).pricePerWeek ? String((spot as any).pricePerWeek) : "",
        pricePerMonth: (spot as any).pricePerMonth ? String((spot as any).pricePerMonth) : "",
        currency: spot.currency,
        spotType: spot.spotType,
        hasEvCharging: spot.hasEvCharging,
        hasSecurityCamera: spot.hasSecurityCamera,
        is24Hours: spot.is24Hours,
        advertiserType: (spot.advertiserType as 'owner' | 'agency' | 'company') || "owner",
        companyName: spot.companyName || "",
        pib: spot.pib || "",
        contactPerson: spot.contactPerson || "",
      });
    }
  }, [spot, form]);

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      apiRequest("PUT", `/api/parking-spots/${spotId}`, data),
    onSuccess: (response: { pendingUntil?: string }) => {
      const pendingUntil = response?.pendingUntil;
      if (pendingUntil) {
        const date = new Date(pendingUntil);
        const formattedDate = date.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-GB', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
        toast({
          title: t.saveSuccess,
          description: `${t.saveSuccessDesc} — ${formattedDate}. ${t.saveSuccessOld}`,
        });
      } else {
        toast({ title: t.saveOk, description: t.saveOkDesc });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/parking-spots/my-spots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parking-spots", spotId] });
      setLocation("/dashboard");
    },
    onError: () => {
      toast({ title: t.saveError, description: t.saveErrorDesc, variant: "destructive" });
    },
  });

  if (!spotId || spotLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">{t.loading}</div>;
  }

  if (!spot) {
    return <div className="min-h-screen bg-background flex items-center justify-center">{t.notFound}</div>;
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
                <span className="hidden sm:inline">{t.myAccount}</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">{t.pageTitle}</h1>
        <p className="text-muted-foreground mb-6">{t.pageSubtitle}</p>

        {/* Read-only system info */}
        <Card className="p-4 mb-6 bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{t.systemInfo}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {spot.parkingNumber && (
              <Badge variant="outline" className="text-xs">
                {t.badgeNumber}: {spot.parkingNumber}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {t.badgeCategory}: {CATEGORY_LABELS[spot.category] || spot.category || 'N/A'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {t.badgePlan}: {SUB_TYPE_LABELS[spot.subscriptionType] || spot.subscriptionType}
            </Badge>
            <Badge variant={spot.isPremium ? 'default' : 'outline'} className="text-xs">
              {spot.isPremium ? t.premium : t.basic}
            </Badge>
            <Badge variant={spot.isActive ? 'default' : 'secondary'} className="text-xs">
              {spot.isActive ? t.active : t.inactive}
            </Badge>
            {spot.stripeLink && (
              <Badge variant="outline" className="text-xs">
                {t.stripe}: {spot.stripeLinkActive ? t.stripeActive : t.stripeInactive}
              </Badge>
            )}
          </div>
        </Card>

        {/* Pending changes banner */}
        {pendingActive && pendingFrom && (
          <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md" data-testid="banner-pending-changes">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{t.pendingTitle}</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {t.pendingDesc}{' '}
                <strong>{pendingFrom.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-GB', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</strong>.
                {' '}{t.pendingNote}
              </p>
            </div>
          </div>
        )}

        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.title}</FormLabel>
                  <FormControl><Input placeholder={t.titlePlaceholder} {...field} data-testid="input-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.description}</FormLabel>
                  <FormControl><Textarea placeholder={t.descPlaceholder} className="min-h-32" {...field} data-testid="input-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.address}</FormLabel>
                  <FormControl><Input placeholder={t.addressPlaceholder} {...field} data-testid="input-address" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.city}</FormLabel>
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-city">
                        <SelectValue placeholder={t.cityPlaceholder} />
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
                    <FormLabel>{t.phone}</FormLabel>
                    <FormControl><Input placeholder={t.phonePlaceholder} {...field} data-testid="input-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.email}</FormLabel>
                    <FormControl><Input type="email" placeholder={t.emailPlaceholder} {...field} data-testid="input-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Multi-pricing — up to 4 independent optional price types */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.pricing}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.pricingDesc}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="pricePerHour" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.priceHour}</FormLabel>
                      <FormControl><Input type="number" step="0.01" min="0" placeholder="200" {...field} data-testid="input-price-hourly" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="pricePerDay" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.priceDay}</FormLabel>
                      <FormControl><Input type="number" step="0.01" min="0" placeholder="1000" {...field} data-testid="input-price-daily" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="pricePerWeek" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.priceWeek}</FormLabel>
                      <FormControl><Input type="number" step="0.01" min="0" placeholder="3000" {...field} data-testid="input-price-weekly" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="pricePerMonth" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.priceMonth}</FormLabel>
                      <FormControl><Input type="number" step="0.01" min="0" placeholder="5000" {...field} data-testid="input-price-monthly" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <FormField control={form.control} name="spotType" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.spotType}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-spot-type"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="uncovered">{t.uncovered}</SelectItem>
                      <SelectItem value="covered">{t.covered}</SelectItem>
                      <SelectItem value="garage">{t.garage}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="space-y-3">
                <FormField control={form.control} name="hasEvCharging" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-ev" /></FormControl>
                    <FormLabel className="!mt-0 cursor-pointer">{t.hasEv}</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="hasSecurityCamera" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-camera" /></FormControl>
                    <FormLabel className="!mt-0 cursor-pointer">{t.hasCamera}</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="is24Hours" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-24h" /></FormControl>
                    <FormLabel className="!mt-0 cursor-pointer">{t.is24h}</FormLabel>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="advertiserType" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.advertiserType}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-advertiser-type"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="owner">{t.owner}</SelectItem>
                      <SelectItem value="agency">{t.agency}</SelectItem>
                      <SelectItem value="company">{t.company}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {(watchedAdvertiserType === 'company' || watchedAdvertiserType === 'agency') && (
                <div className="space-y-4">
                  <FormField control={form.control} name="companyName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.companyName}</FormLabel>
                      <FormControl><Input placeholder={t.companyNamePlaceholder} {...field} data-testid="input-company-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="pib" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.pib}</FormLabel>
                      <FormControl><Input placeholder={t.pibPlaceholder} {...field} data-testid="input-pib" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contactPerson" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.contactPerson}</FormLabel>
                      <FormControl><Input placeholder={t.contactPersonPlaceholder} {...field} data-testid="input-contact-person" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-save">
                {mutation.isPending ? t.saving : t.save}
              </Button>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
