import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ArrowLeft, MapPin, Upload, Home as HomeIcon, Globe } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

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
    paymentCard: "Kartično (Monri)",
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
    paymentCard: "Card (Monri)",
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
  paymentType: z.enum(['cash', 'bank_transfer', 'card_monri'], {
    errorMap: () => ({ message: "Tip plaćanja mora biti izabran" })
  }),
  spotType: z.string().min(1, "Tip mesta je obavezan"),
  hasEvCharging: z.boolean().default(false),
  hasSecurityCamera: z.boolean().default(false),
  is24Hours: z.boolean().default(true),
});

export default function AddSpot() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [spotId, setSpotId] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [language, setLanguage] = useState<"sr" | "en">("sr");
  
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
      setLocation("/home");
    }
  }, [isAuthenticated, isLoading, setLocation]);

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
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return await apiRequest("POST", "/api/parking-spots", data);
    },
    onSuccess: (data) => {
      setSpotId(data.id);
      toast({
        title: "Uspešno Dodato",
        description: "Sada možete dodati slike parking mesta ili kliknite Završi.",
      });
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
    
    mutation.mutate(values);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-1 xs:px-2 sm:px-4 py-2.5 xs:py-3 sm:py-4">
          <div className="flex items-center justify-between gap-1 xs:gap-2">
            <Link href="/home" className="flex items-center gap-1.5 xs:gap-2">
              <img src={parkInLogo} alt="ParkIN" className="w-7 xs:w-8 h-7 xs:h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground hidden sm:inline">ParkIN</span>
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
            {t.pageTitle}
          </h1>
          <p className="text-muted-foreground">
            {t.pageSubtitle}
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.latitude}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.0001" {...field} data-testid="input-latitude" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.longitude}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.0001" {...field} data-testid="input-longitude" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormDescription className="text-sm text-muted-foreground -mt-4">
                {t.coordinatesDescription}
              </FormDescription>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pricePerHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.price}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder={t.pricePlaceholder} {...field} data-testid="input-price" />
                      </FormControl>
                      <FormDescription>
                        {t.priceDescription}
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
                        <SelectItem value="card_monri">{t.paymentCard}</SelectItem>
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

              <div className="space-y-3">
                <div className="p-4 bg-accent/10 border border-accent rounded-md">
                  <p className="text-sm text-muted-foreground mb-1">
                    💳 {t.subscriptionPrice}
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {t.subscriptionAmount}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.subscriptionDuration}
                  </p>
                </div>

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
              {t.imageUploadDescription}
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
