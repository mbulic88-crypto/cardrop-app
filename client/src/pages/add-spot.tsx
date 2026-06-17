import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ArrowLeft, MapPin, Upload, Home as HomeIcon, Globe, Check, Sparkles, Lock, Shield, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation, useSearch } from "wouter";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { DraggableLocationMap } from "@/components/DraggableLocationMap";
import { PRICING_PLANS, getPlanById, getMaxPhotos, type SubscriptionType, type CategoryType } from "@shared/pricing";
import type { User } from "@shared/schema";
import { useLanguage } from "@/hooks/useLanguage";

const SERBIAN_CITIES = [
  "Beograd", "Novi Sad", "Niš", "Kragujevac", "Subotica", "Zrenjanin",
  "Pančevo", "Čačak", "Kraljevo", "Smederevo", "Leskovac", "Užice",
  "Valjevo", "Šabac", "Sombor", "Kruševac", "Ostalo"
];

const translations = {
  sr: {
    pageTitle: "Dodajte Parking Mesto",
    pageSubtitle: "Popunite informacije o vašem parking mestu i počnite da zarađujete",
    homeButton: "Početna",
    title: "Naslov",
    titlePlaceholder: "npr. Parking u centru grada",
    description: "Opis",
    descriptionPlaceholder: "Detaljan opis vašeg parking mesta",
    address: "Adresa",
    addressPlaceholder: "Unesite adresu",
    addressDescription: "Koristite autocomplete za preciznu lokaciju",
    city: "Grad",
    cityPlaceholder: "Izaberite grad",
    cityOptional: "(opciono)",
    contactPhone: "Kontakt Telefon",
    phonePlaceholder: "+381 64 123 4567",
    phoneDescription: "Telefon za kontakt sa iznajmljivačima",
    contactEmail: "Kontakt Email",
    emailPlaceholder: "primer@email.com",
    emailDescription: "Email za kontakt i potvrde",
    latitude: "Geografska Širina",
    longitude: "Geografska Dužina",
    coordinatesDescription: "Automatski popunjeno na osnovu adrese",
    price: "Cena po Satu",
    pricePlaceholder: "200",
    priceDescription: "Cena po satu parkiranja",
    currency: "Valuta",
    paymentType: "Tip Plaćanja",
    paymentCash: "Keš",
    paymentBankTransfer: "Preko računa",
    spotType: "Tip Parking Mesta",
    spotUncovered: "Otvoreno",
    spotCovered: "Pokriveno",
    spotGarage: "Garaža",
    evCharging: "Punjač za električna vozila",
    evChargingDescription: "Da li imate punjač za EV?",
    securityCamera: "Sigurnosna kamera",
    securityCameraDescription: "Da li je prostor pod video nadzorom?",
    available24h: "Dostupno 24/7",
    available24hDescription: "Da li je parking mesto dostupno non-stop?",
    additionalOptions: "Dodatne Opcije",
    subscriptionPrice: "Cena pretplate",
    subscriptionAmount: "1.000 RSD + Stripe provizija",
    subscriptionDuration: "Vaše parking mesto će biti objavljeno 30 dana",
    submitButton: "Dodaj Parking Mesto",
    submittingButton: "Dodavanje...",
    imageUploadTitle: "Dodaj Slike Parking Mesta",
    imageUploadDescription: "Dodajte do 5 slika vašeg parking mesta kako bi privukli više korisnika.",
    uploadButton: "Dodaj Slike",
    finishButton: "Završi",
    successTitle: "Uspešno Dodato",
    successDescription: "Sada možete dodati slike parking mesta ili kliknite Završi.",
    loginRequired: "Za dodavanje parking mesta potrebna je prijava na nalog.",
    // Company specific
    companyName: "Ime Firme",
    companyNamePlaceholder: "npr. Parking DOO",
    pib: "PIB",
    pibPlaceholder: "123456789",
    numberOfSpots: "Broj Parking Mesta",
    numberOfSpotsPlaceholder: "5",
    numberOfSpotsDescription: "Koliko parking mesta iznajmljujete",
    autoRenewal: "Automatska Pretplata",
    autoRenewalDescription: "Automatski produžite pretplatu kada istekne",
    // Truck stop specific
    truckPageTitle: "Oglasite Vaše Stajalište za Kamione",
    truckPageSubtitle: "Popunite informacije o vašem stajalištu i počnite da zarađujete",
    pricePerDay: "Cena po Danu",
    pricePerDayPlaceholder: "1000",
    pricePerDayDescription: "Cena po danu parkiranja",
    truckPib: "PIB Firme",
    truckPibPlaceholder: "123456789",
    truckPibDescription: "Poreski identifikacioni broj (opciono)",
    // Residential specific
    residentialPageTitle: "Oglasite Parking Stambene Zajednice",
    residentialPageSubtitle: "Popunite informacije o parkingu vaše stambene zajednice",
    contactPerson: "Kontakt Osoba",
    contactPersonPlaceholder: "Ime i prezime",
    contactPersonDescription: "Osoba za kontakt u stambenoj zajednici",
    residentialPib: "PIB (opciono)",
    residentialPibPlaceholder: "123456789",
    residentialPibDescription: "Poreski identifikacioni broj stambene zajednice",
    // Advertiser type for all categories
    advertiserType: "Oglašivač",
    advertiserOwner: "Vlasnik",
    advertiserAgency: "Agencija",
    advertiserCompany: "Kompanija",
    // Rental duration type
    rentalDuration: "Tip Izdavanja",
    rentalDurationDescription: "Izaberite da li izdajete kratkoročno ili dugoročno",
    rentalShortTerm: "Kratkoročno",
    rentalLongTerm: "Dugoročno",
    pricingPeriod: "Period Naplate",
    pricingPeriodDescription: "Izaberite period za koji naplaćujete",
    pricingHourly: "Po Satu",
    pricingDaily: "Po Danu",
    pricingWeekly: "Po Nedelji",
    pricingMonthly: "Po Mesecu",
    pricePerHourLabel: "Cena po Satu",
    pricePerHourPlaceholder: "200",
    pricePerHourDescription: "Cena po satu parkiranja",
    pricePerDayLabel: "Cena po Danu",
    pricePerDayLabelPlaceholder: "1000",
    pricePerDayLabelDescription: "Dnevna cena parkiranja",
    pricePerWeek: "Cena po Nedelji",
    pricePerWeekPlaceholder: "3000",
    pricePerWeekDescription: "Nedeljnja cena parkiranja",
    pricePerMonth: "Cena po Mesecu",
    pricePerMonthPlaceholder: "5000",
    pricePerMonthDescription: "Mesečna cena parkiranja",
  },
  en: {
    pageTitle: "Add Parking Spot",
    pageSubtitle: "Fill in information about your parking spot and start earning",
    homeButton: "Home",
    title: "Title",
    titlePlaceholder: "e.g. Parking in city center",
    description: "Description",
    descriptionPlaceholder: "Detailed description of your parking spot",
    address: "Address",
    addressPlaceholder: "Enter address",
    addressDescription: "Use autocomplete for precise location",
    city: "City",
    cityPlaceholder: "Select city",
    cityOptional: "(optional)",
    contactPhone: "Contact Phone",
    phonePlaceholder: "+381 64 123 4567",
    phoneDescription: "Phone for contact with renters",
    contactEmail: "Contact Email",
    emailPlaceholder: "example@email.com",
    emailDescription: "Email for contact and confirmations",
    latitude: "Latitude",
    longitude: "Longitude",
    coordinatesDescription: "Automatically filled based on address",
    price: "Price per Hour",
    pricePlaceholder: "200",
    priceDescription: "Price per hour of parking",
    currency: "Currency",
    paymentType: "Payment Type",
    paymentCash: "Cash",
    paymentBankTransfer: "Bank Transfer",
    spotType: "Parking Spot Type",
    spotUncovered: "Uncovered",
    spotCovered: "Covered",
    spotGarage: "Garage",
    evCharging: "EV Charger",
    evChargingDescription: "Do you have an EV charger?",
    securityCamera: "Security Camera",
    securityCameraDescription: "Is the area under video surveillance?",
    available24h: "Available 24/7",
    available24hDescription: "Is the parking spot available non-stop?",
    additionalOptions: "Additional Options",
    subscriptionPrice: "Subscription Price",
    subscriptionAmount: "1,000 RSD + Stripe fee",
    subscriptionDuration: "Your parking spot will be published for 30 days",
    submitButton: "Add Parking Spot",
    submittingButton: "Adding...",
    imageUploadTitle: "Add Parking Spot Images",
    imageUploadDescription: "Add up to 5 images of your parking spot to attract more users.",
    uploadButton: "Add Images",
    finishButton: "Finish",
    successTitle: "Successfully Added",
    successDescription: "You can now add images of the parking spot or click Finish.",
    loginRequired: "Login is required to add a parking spot.",
    // Company specific
    companyName: "Company Name",
    companyNamePlaceholder: "e.g. Parking Ltd",
    pib: "Tax ID (PIB)",
    pibPlaceholder: "123456789",
    numberOfSpots: "Number of Parking Spots",
    numberOfSpotsPlaceholder: "5",
    numberOfSpotsDescription: "How many parking spots are you renting out",
    autoRenewal: "Auto Renewal",
    autoRenewalDescription: "Automatically renew subscription when it expires",
    // Truck stop specific
    truckPageTitle: "Advertise Your Truck Stop",
    truckPageSubtitle: "Fill in information about your truck stop and start earning",
    pricePerDay: "Price per Day",
    pricePerDayPlaceholder: "1000",
    pricePerDayDescription: "Price per day of parking",
    truckPib: "Company Tax ID (PIB)",
    truckPibPlaceholder: "123456789",
    truckPibDescription: "Tax identification number (optional)",
    // Residential specific
    residentialPageTitle: "Advertise Residential Community Parking",
    residentialPageSubtitle: "Fill in information about your residential parking",
    contactPerson: "Contact Person",
    contactPersonPlaceholder: "Full name",
    contactPersonDescription: "Contact person in the residential community",
    residentialPib: "Tax ID (optional)",
    residentialPibPlaceholder: "123456789",
    residentialPibDescription: "Tax identification number of the community",
    // Advertiser type for all categories
    advertiserType: "Advertiser",
    advertiserOwner: "Owner",
    advertiserAgency: "Agency",
    advertiserCompany: "Company",
    // Rental duration type
    rentalDuration: "Rental Type",
    rentalDurationDescription: "Choose short-term or long-term rental",
    rentalShortTerm: "Short-term",
    rentalLongTerm: "Long-term",
    pricingPeriod: "Billing Period",
    pricingPeriodDescription: "Choose the billing period",
    pricingHourly: "Per Hour",
    pricingDaily: "Per Day",
    pricingWeekly: "Per Week",
    pricingMonthly: "Per Month",
    pricePerHourLabel: "Price per Hour",
    pricePerHourPlaceholder: "200",
    pricePerHourDescription: "Hourly parking price",
    pricePerDayLabel: "Price per Day",
    pricePerDayLabelPlaceholder: "1000",
    pricePerDayLabelDescription: "Daily parking price",
    pricePerWeek: "Price per Week",
    pricePerWeekPlaceholder: "3000",
    pricePerWeekDescription: "Weekly parking price",
    pricePerMonth: "Price per Month",
    pricePerMonthPlaceholder: "5000",
    pricePerMonthDescription: "Monthly parking price",
  },
};

const formSchema = z.object({
  title: z.string().min(5, "Naslov mora imati najmanje 5 karaktera"),
  description: z.string().min(1, "Opis je obavezan"),
  address: z.string().min(5, "Adresa mora biti uneta"),
  city: z.preprocess((val) => val === "" ? undefined : val, z.string().optional()),
  phone: z.string().min(5, "Telefon mora imati najmanje 5 karaktera").max(50, "Telefon može imati maksimalno 50 karaktera"),
  contactEmail: z.string().email("Unesite validnu email adresu"),
  latitude: z.string().min(1, "Geografska širina je obavezna"),
  longitude: z.string().min(1, "Geografska dužina je obavezna"),
  pricePerHour: z.string().optional(),
  pricePerDay: z.string().optional(),
  pricePerWeek: z.string().optional(),
  pricePerMonth: z.string().optional(),
  currency: z.string().default("RSD"),
  spotType: z.string().min(1, "Tip mesta je obavezan"),
  hasEvCharging: z.boolean().default(false),
  hasSecurityCamera: z.boolean().default(false),
  is24Hours: z.boolean().default(true),
  // Advertiser type for all categories
  advertiserType: z.enum(['owner', 'agency', 'company']).default('owner'),
  // Company specific fields
  companyName: z.string().optional(),
  pib: z.string().optional(),
  // Residential specific fields
  contactPerson: z.string().optional(),
  autoRenewal: z.boolean().default(false),
});

export default function AddSpot() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [spotId, setSpotId] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const { language, setLanguage } = useLanguage();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType>('standard');
  const [rentalDurationType, setRentalDurationType] = useState<'short' | 'long'>('short');
  
  // Get category from URL params
  const urlParams = new URLSearchParams(searchString);
  const category = (urlParams.get('category') || 'private') as CategoryType;
  const isCompany = category === 'company';
  const isTruckStop = category === 'truck_stop';
  const isResidential = category === 'residential';
  
  // Check if user has already used free trial
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
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
      pricePerDay: "",
      pricePerWeek: "",
      pricePerMonth: "",
      currency: "RSD",
      spotType: "uncovered",
      hasEvCharging: false,
      hasSecurityCamera: false,
      is24Hours: true,
      advertiserType: "owner",
      companyName: "",
      pib: "",
      contactPerson: "",
      autoRenewal: false,
    },
  });

  const watchedLat = form.watch("latitude");
  const watchedLng = form.watch("longitude");
  const hasCustomLocation = watchedLat && watchedLng && watchedLat !== "45.2671" && watchedLng !== "19.8335";
  
  const getMaxImages = () => {
    return getMaxPhotos(selectedPlan);
  };
  
  const maxImages = getMaxImages();
  const canUploadMore = uploadedImages.length < maxImages;

  const selectLanguage = (code: "sr" | "en") => {
    setLanguage(code);
    setLangMenuOpen(false);
  };

  useEffect(() => {
    const handleLangClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    if (langMenuOpen) {
      document.addEventListener("mousedown", handleLangClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleLangClickOutside);
  }, [langMenuOpen]);

  const languageOptions = [
    { code: "sr" as const, label: "Srpski", flag: "\u{1F1F7}\u{1F1F8}" },
    { code: "en" as const, label: "English", flag: "\u{1F1EC}\u{1F1E7}" },
  ];
  const currentLangLabel = languageOptions.find(l => l.code === language)?.label || "Srpski";

  const t = translations[language];

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema> & { subscriptionType: SubscriptionType; category: CategoryType }) => {
      const nullPrice = (v?: string) => (v && parseFloat(v) > 0 ? v : null);
      return await apiRequest("POST", "/api/parking-spots", {
        ...data,
        pricePerHour: nullPrice(data.pricePerHour),
        pricePerDay: nullPrice(data.pricePerDay),
        pricePerWeek: nullPrice(data.pricePerWeek),
        pricePerMonth: nullPrice(data.pricePerMonth),
      });
    },
    onSuccess: (data) => {
      setSpotId(data.id);
      toast({
        title: "Uspešno Dodato",
        description: "Sada možete dodati slike parking mesta ili kliknite Završi.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/parking-spots/my-spots"] });
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Greška",
        description: "Došlo je do greške. Pokušajte ponovo.",
        variant: "destructive",
      });
    },
  });

  const stripeMutation = useMutation({
    mutationFn: async (data: { spotId: string; tier: string }) => {
      return await apiRequest("POST", "/api/stripe/create-checkout-existing", data);
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Greška",
        description: language === 'sr' 
          ? "Došlo je do greške pri kreiranju plaćanja. Pokušajte ponovo." 
          : "Error creating payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }

    if (mutation.isPending || spotId) {
      return;
    }

    const hasPrice = [values.pricePerHour, values.pricePerDay, values.pricePerWeek, values.pricePerMonth]
      .some(p => p && parseFloat(p) > 0);
    if (!hasPrice) {
      form.setError('pricePerHour', { message: language === 'sr' ? 'Unesite bar jednu cenu' : 'Enter at least one price' });
      return;
    }
    
    mutation.mutate({
      ...values,
      subscriptionType: selectedPlan,
      category: category,
      isPremium: selectedPlan === 'silver' || selectedPlan === 'gold',
    } as any);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-1 xs:px-2 sm:px-4 py-2.5 xs:py-3 sm:py-4">
          <div className="flex items-center justify-between gap-1 xs:gap-2">
            <Link href="/map-hack" className="flex items-center gap-1.5 xs:gap-2">
              <img src={parkInLogo} alt="CarDrop" className="w-7 xs:w-8 h-7 xs:h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground hidden sm:inline">CarDrop</span>
            </Link>

            <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-2">
              <Link href="/map-hack" className="hidden xs:inline-block">
                <Button variant="outline" size="icon" className="h-8 w-8 xs:h-9 xs:w-9 sm:w-auto sm:px-3" data-testid="button-home">
                  <HomeIcon className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t.homeButton}</span>
                </Button>
              </Link>

              <div className="relative" ref={langMenuRef}>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-1"
                  data-testid="button-language"
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                >
                  <Globe className="w-4 h-4" />
                  <span className="hidden sm:inline">{currentLangLabel}</span>
                </Button>
                {langMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-md shadow-lg z-50 min-w-[160px]">
                    {languageOptions.map((lang) => (
                      <div
                        key={lang.code}
                        onClick={() => selectLanguage(lang.code)}
                        className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover-elevate ${language === lang.code ? 'bg-accent/20' : ''}`}
                        data-testid={`lang-option-${lang.code}`}
                      >
                        <span>{lang.flag}</span>
                        <span className="text-sm text-foreground">{lang.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            {isTruckStop ? t.truckPageTitle : isResidential ? t.residentialPageTitle : t.pageTitle}
          </h1>
          <p className="text-muted-foreground">
            {isTruckStop ? t.truckPageSubtitle : isResidential ? t.residentialPageSubtitle : t.pageSubtitle}
          </p>
        </div>

        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.title}</FormLabel>
                    <FormControl>
                      <Input placeholder={t.titlePlaceholder} {...field} data-testid="input-title" />
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
                    <FormLabel>{t.description}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t.descriptionPlaceholder}
                        className="min-h-32"
                        {...field}
                        data-testid="input-description"
                      />
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
                    <FormLabel>{t.address}</FormLabel>
                    <FormControl>
                      <AddressAutocomplete
                        value={field.value}
                        onChange={field.onChange}
                        onLocationSelect={(data) => {
                          // Automatically populate latitude, longitude, and city
                          form.setValue('latitude', data.latitude.toString());
                          form.setValue('longitude', data.longitude.toString());
                          if (data.city) {
                            form.setValue('city', data.city);
                          }
                        }}
                        placeholder={t.addressPlaceholder}
                      />
                    </FormControl>
                    <FormDescription>
                      {t.addressDescription}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.city} {t.cityOptional}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-city">
                          <SelectValue placeholder={t.cityPlaceholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERBIAN_CITIES.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t.addressDescription}
                    </FormDescription>
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
                      <FormLabel>{t.contactPhone}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.phonePlaceholder} {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormDescription>
                        {t.phoneDescription}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.contactEmail}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={t.emailPlaceholder} {...field} data-testid="input-contact-email" />
                      </FormControl>
                      <FormDescription>
                        {t.emailDescription}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="totalSpaces"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {language === "sr" ? "Broj parking mesta" : "Number of spaces"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        placeholder="1"
                        {...field}
                        value={field.value ?? 1}
                        onChange={(e) => field.onChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        data-testid="input-total-spaces"
                      />
                    </FormControl>
                    <FormDescription>
                      {language === "sr" ? "Koliko nezavisnih mesta možete iznajmiti istovremeno (npr. parking sa 3 mesta = 3)" : "How many independent spots can be booked simultaneously"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hidden lat/lng fields - auto-populated by address autocomplete or map click */}
              <input type="hidden" {...form.register('latitude')} />
              <input type="hidden" {...form.register('longitude')} />

              {/* Interactive map — always visible, click to place or drag to fine-tune */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">
                  {language === "sr" ? "Lokacija na mapi" : "Location on map"}
                </p>
                <DraggableLocationMap
                  latitude={parseFloat(watchedLat) || 45.2671}
                  longitude={parseFloat(watchedLng) || 19.8335}
                  hasPinPlaced={!!hasCustomLocation}
                  onPositionChange={(lat, lng) => {
                    form.setValue('latitude', lat.toFixed(7));
                    form.setValue('longitude', lng.toFixed(7));
                  }}
                  onAddressResolve={(address) => {
                    form.setValue('address', address);
                  }}
                  height="280px"
                  hint={language === "sr"
                    ? "Kliknite na mapu ili prevucite pin da odredite tačnu lokaciju"
                    : "Click on the map or drag the pin to set the exact location"}
                />
              </div>

              {/* Company specific fields */}
              {isCompany && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.companyName}</FormLabel>
                          <FormControl>
                            <Input placeholder={t.companyNamePlaceholder} {...field} data-testid="input-company-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pib"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.pib}</FormLabel>
                          <FormControl>
                            <Input placeholder={t.pibPlaceholder} {...field} data-testid="input-pib" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              {/* Truck Stop specific fields */}
              {isTruckStop && (
                <FormField
                  control={form.control}
                  name="pib"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.truckPib}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.truckPibPlaceholder} {...field} data-testid="input-truck-pib" />
                      </FormControl>
                      <FormDescription>
                        {t.truckPibDescription}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Residential specific fields */}
              {isResidential && (
                <>
                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.contactPerson}</FormLabel>
                        <FormControl>
                          <Input placeholder={t.contactPersonPlaceholder} {...field} data-testid="input-contact-person" />
                        </FormControl>
                        <FormDescription>
                          {t.contactPersonDescription}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="pib"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.residentialPib}</FormLabel>
                        <FormControl>
                          <Input placeholder={t.residentialPibPlaceholder} {...field} data-testid="input-residential-pib" />
                        </FormControl>
                        <FormDescription>
                          {t.residentialPibDescription}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Multi-pricing — owners set one or more price types */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {language === 'sr' ? 'Cene iznajmljivanja' : 'Rental prices'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === 'sr' ? 'Unesite bar jednu cenu. Zakupci biraju koji tip im odgovara.' : 'Enter at least one price. Renters choose which type suits them.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="pricePerHour"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.pricePerHourLabel}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder={t.pricePerHourPlaceholder} {...field} data-testid="input-price-hourly" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pricePerDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.pricePerDayLabel}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder={t.pricePerDayLabelPlaceholder} {...field} data-testid="input-price-daily" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pricePerWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.pricePerWeek}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder={t.pricePerWeekPlaceholder} {...field} data-testid="input-price-weekly" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pricePerMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.pricePerMonth}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder={t.pricePerMonthPlaceholder} {...field} data-testid="input-price-monthly" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.currency}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-currency">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RSD">RSD (Dinar)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="advertiserType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.advertiserType}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-advertiser-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="owner">{t.advertiserOwner}</SelectItem>
                        <SelectItem value="agency">{t.advertiserAgency}</SelectItem>
                        <SelectItem value="company">{t.advertiserCompany}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="spotType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.spotType}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-spot-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="uncovered">{t.spotUncovered}</SelectItem>
                        <SelectItem value="covered">{t.spotCovered}</SelectItem>
                        <SelectItem value="garage">{t.spotGarage}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground">{t.additionalOptions}</h3>
                
                <FormField
                  control={form.control}
                  name="hasEvCharging"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>{t.evCharging}</FormLabel>
                        <FormDescription>{t.evChargingDescription}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-ev-charging"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasSecurityCamera"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>{t.securityCamera}</FormLabel>
                        <FormDescription>{t.securityCameraDescription}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-security-camera"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is24Hours"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>{t.available24h}</FormLabel>
                        <FormDescription>{t.available24hDescription}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-24-hours"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground">
                  {language === 'sr' ? 'Izaberite Plan' : 'Choose Your Plan'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PRICING_PLANS.map((plan) => {
                    const isSelected = selectedPlan === plan.id;
                    const isSilver = plan.tier === 'silver';
                    const isGold = plan.tier === 'gold';
                    
                    let borderClass = 'border-card-border';
                    let bgClass = '';
                    let priceColor = 'text-accent';
                    let titleColor = 'text-foreground';
                    let subtitleColor = 'text-muted-foreground';
                    let benefitTextColor = 'text-muted-foreground';
                    let checkColor = 'text-accent';
                    let checkBorder = 'border-muted-foreground';
                    let checkBg = '';
                    let checkIcon = 'text-white';
                    let badgeTextColor = 'text-white';
                    
                    if (isSilver) {
                      borderClass = isSelected ? 'border-[#A8A9AD] ring-2 ring-[#A8A9AD]/50' : 'border-[#A8A9AD]';
                      bgClass = 'bg-gradient-to-br from-[#C0C0C0] via-[#E8E8E8] to-[#A8A9AD] shadow-[0_0_15px_rgba(168,169,173,0.3)]';
                      priceColor = 'text-[#1a1a1a]';
                      titleColor = 'text-[#1a1a1a]';
                      subtitleColor = 'text-[#444]';
                      benefitTextColor = 'text-[#222]';
                      checkColor = 'text-[#333]';
                      checkBorder = 'border-white';
                      checkBg = isSelected ? 'bg-white' : '';
                      checkIcon = 'text-[#555]';
                      badgeTextColor = 'text-[#333]';
                    } else if (isGold) {
                      borderClass = isSelected ? 'border-[#DAA520] ring-2 ring-[#DAA520]/50' : 'border-[#DAA520]';
                      bgClass = 'bg-gradient-to-br from-[#DAA520] via-[#FFD700] to-[#B8860B] shadow-[0_0_15px_rgba(218,165,32,0.3)]';
                      priceColor = 'text-white';
                      titleColor = 'text-white';
                      subtitleColor = 'text-white/70';
                      benefitTextColor = 'text-white/90';
                      checkColor = 'text-white';
                      checkBorder = 'border-white';
                      checkBg = isSelected ? 'bg-white' : '';
                      checkIcon = 'text-[#B8860B]';
                      badgeTextColor = 'text-white';
                    } else {
                      borderClass = isSelected ? 'border-accent border-2' : 'border-card-border';
                      bgClass = isSelected ? 'bg-accent/5' : '';
                      checkBorder = isSelected ? 'border-accent' : 'border-muted-foreground';
                      checkBg = isSelected ? 'bg-accent' : '';
                    }
                    
                    return (
                      <Card
                        key={plan.id}
                        className={`cursor-pointer transition-all hover-elevate border-2 overflow-visible ${borderClass} ${bgClass}`}
                        onClick={() => setSelectedPlan(plan.id)}
                        data-testid={`card-plan-${plan.id}`}
                      >
                        {(isSilver || isGold) && (
                          <div className="px-4 py-2 rounded-t-md bg-white/15">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-bold tracking-wide ${badgeTextColor}`}>
                                {isSilver ? (plan.badgeSr && language === 'sr' ? plan.badgeSr : plan.badgeEn) : (plan.badgeSr && language === 'sr' ? plan.badgeSr : plan.badgeEn)}
                              </span>
                              <Sparkles className={`w-4 h-4 ${badgeTextColor}`} />
                            </div>
                          </div>
                        )}
                        
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className={`font-semibold text-lg ${titleColor}`}>
                                {language === 'sr' ? plan.name : plan.nameEn}
                              </h4>
                              <div className="flex items-baseline gap-1 mt-1">
                                <span className={`text-2xl font-bold ${priceColor}`}>
                                  {plan.price === 0 ? (language === 'sr' ? 'Besplatno' : 'Free') : `${plan.price.toLocaleString('sr-RS')} RSD`}
                                </span>
                              </div>
                              <p className={`text-xs mt-0.5 ${subtitleColor}`}>
                                {language === 'sr' 
                                  ? `${plan.totalVisibilityDays} dana vidljivosti`
                                  : `${plan.totalVisibilityDays} days visibility`}
                              </p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${checkBorder} ${checkBg}`}>
                              {isSelected && (
                                <Check className={`w-4 h-4 ${checkIcon}`} />
                              )}
                            </div>
                          </div>
                          
                          <ul className="space-y-1.5 mt-3">
                            {plan.benefits.map((benefit, idx) => (
                              <li key={idx} className={`text-sm flex items-start gap-2 ${benefitTextColor}`}>
                                <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${checkColor}`} />
                                <span>{language === 'sr' ? benefit.sr : benefit.en}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </Card>
                    );
                  })}
                </div>
                
                {selectedPlan && (
                  <div className={`p-3 rounded-md ${
                    selectedPlan === 'gold'
                      ? 'bg-[#FFD700]/10 border border-[#DAA520]/30'
                      : selectedPlan === 'silver'
                        ? 'bg-[#C0C0C0]/10 border border-[#A8A9AD]/30'
                        : 'bg-muted/20'
                  }`}>
                    <p className="text-sm text-muted-foreground">
                      {language === 'sr' ? 'Vaše parking mesto će biti aktivno' : 'Your parking spot will be active for'}{' '}
                      <span className="font-semibold text-foreground">
                        {getPlanById(selectedPlan)?.totalVisibilityDays} {language === 'sr' ? 'dana' : 'days'}
                      </span>
                      {selectedPlan !== 'standard' && (
                        <>
                          {' '}({language === 'sr' 
                            ? `${getPlanById(selectedPlan)?.activeDays} dana ${selectedPlan === 'gold' ? 'Gold' : 'Silver'} + ${(getPlanById(selectedPlan)?.totalVisibilityDays || 0) - (getPlanById(selectedPlan)?.activeDays || 0)} dana Standard`
                            : `${getPlanById(selectedPlan)?.activeDays} days ${selectedPlan === 'gold' ? 'Gold' : 'Silver'} + ${(getPlanById(selectedPlan)?.totalVisibilityDays || 0) - (getPlanById(selectedPlan)?.activeDays || 0)} days Standard`
                          })
                        </>
                      )}
                    </p>
                  </div>
                )}

                {selectedPlan && selectedPlan !== 'standard' && (
                  <div className="flex items-center justify-center gap-2.5 py-3" data-testid="stripe-trust-addspot">
                    <Shield className="w-4.5 h-4.5 text-[#635BFF]" />
                    <span className="text-sm text-foreground font-medium">
                      {language === 'sr' ? 'Sigurna plaćanja preko' : 'Secure payments via'}
                    </span>
                    <span className="text-xl font-extrabold text-[#635BFF] leading-none tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>stripe</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={mutation.isPending}
                  data-testid="button-submit"
                >
                  {mutation.isPending 
                    ? t.submittingButton 
                    : (language === 'sr' ? 'Nastavi' : 'Continue')}
                </Button>
              </div>
            </form>
          </Form>
        </Card>

        {spotId && (
          <Card className="p-6 mt-6">
            <h3 className="text-xl font-semibold mb-4 text-foreground">
              {t.imageUploadTitle}
            </h3>
            <p className="text-muted-foreground mb-4">
              {language === 'sr' 
                ? `Dodajte do ${maxImages} ${maxImages === 1 ? 'sliku' : maxImages < 5 ? 'slike' : 'slika'} vašeg parking mesta. Preostalo: ${Math.max(0, maxImages - uploadedImages.length)}`
                : `Add up to ${maxImages} images of your parking spot. Remaining: ${Math.max(0, maxImages - uploadedImages.length)}`}
            </p>
            
            {uploadedImages.length > 0 && (
              <div className="mb-4 grid grid-cols-3 gap-4">
                {uploadedImages.map((img, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={img} 
                      alt={`Uploaded ${index + 1}`} 
                      className="rounded-md object-cover h-32 w-full"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ opacity: 1 }}
                      onClick={async () => {
                        try {
                          const response = await apiRequest("DELETE", `/api/parking-spots/${spotId}/images`, {
                            imageUrl: img,
                          });
                          setUploadedImages(response.imageUrls);
                          toast({
                            title: language === 'sr' ? 'Slika obrisana' : 'Image removed',
                          });
                        } catch (error) {
                          toast({
                            title: language === 'sr' ? 'Greška' : 'Error',
                            description: language === 'sr' ? 'Nije moguće obrisati sliku' : 'Could not remove image',
                            variant: 'destructive',
                          });
                        }
                      }}
                      data-testid={`button-delete-image-${index}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3">
              {canUploadMore ? (
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={10485760}
                  onGetUploadParameters={async () => {
                    const response = await apiRequest("POST", "/api/objects/upload", {});
                    return {
                      method: "PUT" as const,
                      url: response.uploadURL,
                    };
                  }}
                  onComplete={async (result) => {
                    const uploadURL = result.successful?.[0]?.uploadURL;
                    if (uploadURL && spotId) {
                      const response = await apiRequest("PUT", `/api/parking-spots/${spotId}/images`, {
                        imageURL: uploadURL,
                      });
                      setUploadedImages(response.imageUrls);
                      toast({
                        title: language === 'sr' ? 'Slika dodata' : 'Image added',
                        description: language === 'sr' ? `Preostalo slika: ${Math.max(0, maxImages - (response.imageUrls?.length || 0))}` : `Remaining: ${Math.max(0, maxImages - (response.imageUrls?.length || 0))}`,
                      });
                    }
                  }}
                  buttonClassName="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {t.uploadButton} ({uploadedImages.length}/{maxImages})
                </ObjectUploader>
              ) : (
                <Button variant="outline" disabled className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  {language === 'sr' ? `Dostignut limit slika (${maxImages}/${maxImages})` : `Image limit reached (${maxImages}/${maxImages})`}
                </Button>
              )}

              {(selectedPlan === 'silver' || selectedPlan === 'gold') ? (
                <Button
                  onClick={() => {
                    stripeMutation.mutate({ spotId: spotId!, tier: selectedPlan });
                  }}
                  className={`w-full ${selectedPlan === 'gold' 
                    ? 'bg-gradient-to-r from-[#DAA520] via-[#FFD700] to-[#B8860B] text-white border-0' 
                    : 'bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A9AD] text-[#333] border-0'}`}
                  size="lg"
                  disabled={stripeMutation.isPending}
                  data-testid="button-proceed-to-payment"
                >
                  {stripeMutation.isPending
                    ? (language === 'sr' ? 'Preusmeravanje...' : 'Redirecting...')
                    : (language === 'sr' 
                      ? `Plati ${getPlanById(selectedPlan)?.price?.toLocaleString('sr-RS')} RSD - ${selectedPlan === 'gold' ? 'Gold' : 'Silver'} paket`
                      : `Pay ${getPlanById(selectedPlan)?.price?.toLocaleString()} RSD - ${selectedPlan === 'gold' ? 'Gold' : 'Silver'} plan`)}
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/parking-spots"] });
                    setLocation("/map-hack");
                  }}
                  className="w-full"
                  size="lg"
                  data-testid="button-finish"
                >
                  {language === 'sr' ? 'Objavi oglas' : 'Publish listing'}
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Login Required Dialog */}
      <LoginRequiredDialog
        open={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        message={t.loginRequired}
        redirectPath="/add-spot"
      />
    </div>
  );
}
