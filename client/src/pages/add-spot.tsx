import { useState, useEffect } from "react";
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
import { ArrowLeft, MapPin, Upload, Home as HomeIcon, Globe, Check, Sparkles } from "lucide-react";
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
import { getPlansByCategory, getBasicPlans, getPremiumPlans, PREMIUM_BENEFITS, type SubscriptionType, type CategoryType } from "@shared/pricing";
import type { User } from "@shared/schema";

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
    langButton: "ENG",
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
  },
  en: {
    pageTitle: "Add Parking Spot",
    pageSubtitle: "Fill in information about your parking spot and start earning",
    homeButton: "Home",
    langButton: "SRP",
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
  }
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
  pricePerHour: z.string().min(1, "Cena je obavezna"),
  currency: z.string().default("RSD"),
  paymentType: z.enum(['cash', 'bank_transfer'], {
    errorMap: () => ({ message: "Tip plaćanja mora biti izabran" })
  }),
  spotType: z.string().min(1, "Tip mesta je obavezan"),
  hasEvCharging: z.boolean().default(false),
  hasSecurityCamera: z.boolean().default(false),
  is24Hours: z.boolean().default(true),
  // Company specific fields
  companyName: z.string().optional(),
  pib: z.string().optional(),
  numberOfSpots: z.string().optional(),
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
  const [language, setLanguage] = useState<"sr" | "en">("sr");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType>('free');
  
  // Get category from URL params
  const urlParams = new URLSearchParams(searchString);
  const category = (urlParams.get('category') || 'private') as CategoryType;
  const isCompany = category === 'company';
  const isTruckStop = category === 'truck_stop';
  
  // Check if user has already used free trial
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
  });
  
  // Get pricing plans based on category - separated into basic and premium
  const categoryPlans = getPlansByCategory(category);
  const basicPlans = getBasicPlans(category);
  const premiumPlans = getPremiumPlans(category);
  
  // Set default plan based on category
  useEffect(() => {
    if (isCompany) {
      setSelectedPlan('company_basic');
    } else if (isTruckStop) {
      setSelectedPlan('truck_basic_monthly');
    } else {
      setSelectedPlan('free');
    }
  }, [isCompany, isTruckStop]);
  
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
      companyName: "",
      pib: "",
      numberOfSpots: "1",
      autoRenewal: false,
    },
  });

  // Watch numberOfSpots for calculating max images
  const watchedNumberOfSpots = form.watch("numberOfSpots");
  
  // Calculate max images based on plan and number of spots
  const getMaxImages = () => {
    if (!isCompany) return 5; // Default 5 for non-company
    
    const selectedPlanData = categoryPlans.find(p => p.id === selectedPlan);
    const isBasicCompanyPlan = selectedPlanData && !selectedPlanData.isPremium;
    
    if (isBasicCompanyPlan) {
      const numSpots = parseInt(watchedNumberOfSpots || "1", 10);
      return numSpots * 3; // 3 images per spot for basic plans
    }
    
    return 15; // Unlimited (high number) for premium plans
  };
  
  const maxImages = getMaxImages();
  const canUploadMore = uploadedImages.length < maxImages;

  useEffect(() => {
    const savedLanguage = localStorage.getItem("parkin-language");
    if (savedLanguage === "en" || savedLanguage === "sr") {
      setLanguage(savedLanguage);
    }
  }, []);

  const toggleLanguage = () => {
    const newLanguage = language === "sr" ? "en" : "sr";
    setLanguage(newLanguage);
    localStorage.setItem("parkin-language", newLanguage);
  };

  const t = translations[language];

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema> & { subscriptionType: SubscriptionType; category: CategoryType }) => {
      return await apiRequest("POST", "/api/parking-spots", data);
    },
    onSuccess: (data) => {
      setSpotId(data.id);
      toast({
        title: "Uspešno Dodato",
        description: "Sada možete dodati slike parking mesta ili kliknite Završi.",
      });
      // Invalidate my-spots cache so dashboard refreshes
      queryClient.invalidateQueries({ queryKey: ["/api/parking-spots/my-spots"] });
      // Scroll to the image upload section
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
          window.location.href = "/api/login";
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

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Check if user is authenticated before submitting
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
    
    // Check if selected plan is premium
    const selectedPlanData = categoryPlans.find(p => p.id === selectedPlan);
    const isPremium = selectedPlanData?.isPremium || false;
    
    // Add selected subscription plan and category to the request
    mutation.mutate({
      ...values,
      subscriptionType: selectedPlan,
      category: category,
      isPremium: isPremium,
      numberOfSpots: values.numberOfSpots ? parseInt(values.numberOfSpots) : undefined,
    } as any);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-1 xs:px-2 sm:px-4 py-2.5 xs:py-3 sm:py-4">
          <div className="flex items-center justify-between gap-1 xs:gap-2">
            <Link href="/home" className="flex items-center gap-1.5 xs:gap-2">
              <img src={parkInLogo} alt="CarDrop" className="w-7 xs:w-8 h-7 xs:h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground hidden sm:inline">CarDrop</span>
            </Link>

            <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-2">
              <Link href="/home" className="hidden xs:inline-block">
                <Button variant="outline" size="icon" className="h-8 w-8 xs:h-9 xs:w-9 sm:w-auto sm:px-3" data-testid="button-home">
                  <HomeIcon className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t.homeButton}</span>
                </Button>
              </Link>

              <Button 
                variant="outline" 
                size="icon"
                className="h-8 w-8 xs:h-9 xs:w-9 sm:w-auto sm:px-3"
                data-testid="button-language"
                onClick={toggleLanguage}
              >
                <Globe className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t.langButton}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            {isTruckStop ? t.truckPageTitle : t.pageTitle}
          </h1>
          <p className="text-muted-foreground">
            {isTruckStop ? t.truckPageSubtitle : t.pageSubtitle}
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

              {/* Hidden lat/lng fields - auto-populated by address autocomplete */}
              <input type="hidden" {...form.register('latitude')} />
              <input type="hidden" {...form.register('longitude')} />

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

                  <FormField
                    control={form.control}
                    name="numberOfSpots"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.numberOfSpots}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || "1"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-number-of-spots">
                              <SelectValue placeholder={t.numberOfSpotsPlaceholder} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {t.numberOfSpotsDescription}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pricePerHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isTruckStop ? t.pricePerDay : t.price}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder={isTruckStop ? t.pricePerDayPlaceholder : t.pricePlaceholder} {...field} data-testid="input-price" />
                      </FormControl>
                      <FormDescription>
                        {isTruckStop ? t.pricePerDayDescription : t.priceDescription}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </div>

              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.paymentType}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">{t.paymentCash}</SelectItem>
                        <SelectItem value="bank_transfer">{t.paymentBankTransfer}</SelectItem>
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

                <FormField
                  control={form.control}
                  name="autoRenewal"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>{t.autoRenewal}</FormLabel>
                        <FormDescription>{t.autoRenewalDescription}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-auto-renewal"
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
                
                {/* Basic Plans Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {language === 'sr' ? 'Osnovni Paketi' : 'Basic Plans'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {basicPlans.map((plan) => (
                      <Card
                        key={plan.id}
                        className={`p-4 cursor-pointer transition-all hover-elevate ${
                          selectedPlan === plan.id
                            ? 'border-accent border-2 bg-accent/5'
                            : 'border-card-border'
                        }`}
                        onClick={() => setSelectedPlan(plan.id)}
                        data-testid={`card-plan-${plan.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground mb-1">
                              {language === 'sr' ? plan.name : plan.nameEn}
                            </h4>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-accent">
                                {plan.price === 0 ? (language === 'sr' ? 'Besplatno' : 'Free') : `${plan.price.toLocaleString('sr-RS')} RSD`}
                              </span>
                              {plan.duration > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  / {plan.duration} {language === 'sr' ? 'dana' : 'days'}
                                </span>
                              )}
                            </div>
                            {plan.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {language === 'sr' ? plan.description : plan.descriptionEn}
                              </p>
                            )}
                            {plan.savings > 0 && (
                              <p className="text-xs text-accent mt-1">
                                {language === 'sr' ? 'Ušteda' : 'Save'} {plan.savings}%
                              </p>
                            )}
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedPlan === plan.id
                              ? 'border-accent bg-accent'
                              : 'border-muted-foreground'
                          }`}>
                            {selectedPlan === plan.id && (
                              <Check className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Premium Plans Section - with golden styling */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">
                      {language === 'sr' ? 'Premium Paketi' : 'Premium Plans'}
                    </h4>
                  </div>
                  
                  {/* Premium Benefits Banner */}
                  <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-2 border-yellow-500/30">
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                      {language === 'sr' ? 'Premium Benefiti:' : 'Premium Benefits:'}
                    </p>
                    <ul className="space-y-1">
                      {PREMIUM_BENEFITS[language].map((benefit, idx) => (
                        <li key={idx} className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {premiumPlans.map((plan) => (
                      <Card
                        key={plan.id}
                        className={`p-4 cursor-pointer transition-all hover-elevate border-2 ${
                          selectedPlan === plan.id
                            ? 'border-yellow-500 bg-yellow-500/10 ring-2 ring-yellow-500/50'
                            : 'border-yellow-500/30 hover:border-yellow-500/60'
                        }`}
                        onClick={() => setSelectedPlan(plan.id)}
                        data-testid={`card-plan-${plan.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-foreground">
                                {language === 'sr' ? plan.name : plan.nameEn}
                              </h4>
                              {plan.popular && (
                                <Badge className="bg-yellow-500 text-yellow-950 text-xs">
                                  {language === 'sr' ? 'Najpopularnije' : 'Most Popular'}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                {plan.price.toLocaleString('sr-RS')} RSD
                              </span>
                              <span className="text-xs text-muted-foreground">
                                / {plan.duration} {language === 'sr' ? 'dana' : 'days'}
                              </span>
                            </div>
                            {plan.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {language === 'sr' ? plan.description : plan.descriptionEn}
                              </p>
                            )}
                            {plan.savings > 0 && (
                              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                {language === 'sr' ? 'Ušteda' : 'Save'} {plan.savings}% ({Math.round(plan.pricePerMonth).toLocaleString('sr-RS')} RSD/{language === 'sr' ? 'mesec' : 'month'})
                              </p>
                            )}
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedPlan === plan.id
                              ? 'border-yellow-500 bg-yellow-500'
                              : 'border-yellow-500/50'
                          }`}>
                            {selectedPlan === plan.id && (
                              <Check className="w-4 h-4 text-yellow-950" />
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
                
                {/* Plan summary */}
                {selectedPlan && (
                  <div className={`p-3 rounded-md ${
                    categoryPlans.find(p => p.id === selectedPlan)?.isPremium
                      ? 'bg-yellow-500/10 border border-yellow-500/30'
                      : 'bg-muted/20'
                  }`}>
                    <p className="text-sm text-muted-foreground">
                      {categoryPlans.find(p => p.id === selectedPlan)?.duration === -1 
                        ? (language === 'sr' ? 'Vaše parking mesto će biti aktivno neograničeno.' : 'Your parking spot will be active indefinitely.')
                        : (
                          <>
                            {language === 'sr' ? 'Vaše parking mesto će biti aktivno do:' : 'Your parking spot will be active until:'}{' '}
                            <span className="font-semibold text-foreground">
                              {new Date(Date.now() + (categoryPlans.find((p: any) => p.id === selectedPlan)?.duration || 0) * 24 * 60 * 60 * 1000).toLocaleDateString('sr-RS', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </span>
                          </>
                        )}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={mutation.isPending}
                  data-testid="button-submit"
                >
                  {mutation.isPending ? t.submittingButton : t.submitButton}
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
              {isCompany && !categoryPlans.find(p => p.id === selectedPlan)?.isPremium 
                ? (language === 'sr' 
                    ? `Dodajte do ${maxImages} slika (${watchedNumberOfSpots || 1} parking mesta × 3 slike). Preostalo: ${Math.max(0, maxImages - uploadedImages.length)}`
                    : `Add up to ${maxImages} images (${watchedNumberOfSpots || 1} spots × 3 images). Remaining: ${Math.max(0, maxImages - uploadedImages.length)}`)
                : t.imageUploadDescription}
            </p>
            
            {uploadedImages.length > 0 && (
              <div className="mb-4 grid grid-cols-3 gap-4">
                {uploadedImages.map((img, index) => (
                  <img 
                    key={index} 
                    src={img} 
                    alt={`Uploaded ${index + 1}`} 
                    className="rounded-md object-cover h-32 w-full"
                  />
                ))}
              </div>
            )}

            <div className="flex gap-4">
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
                        title: t.successTitle,
                        description: t.successDescription,
                      });
                    }
                  }}
                  buttonClassName="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {t.uploadButton}
                </ObjectUploader>
              ) : (
                <Button variant="outline" disabled className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />
                  {language === 'sr' ? 'Dostignut limit slika' : 'Image limit reached'}
                </Button>
              )}

              <Button 
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/parking-spots"] });
                  setLocation("/home");
                }}
                className="flex-1"
                data-testid="button-finish"
              >
                {t.finishButton}
              </Button>
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
