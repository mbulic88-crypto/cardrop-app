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
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ArrowLeft, Home as HomeIcon, Globe, Upload } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { ObjectUploader } from "@/components/ObjectUploader";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { insertSalesListingSchema } from "@shared/schema";

const SERBIAN_CITIES = [
  "Beograd", "Novi Sad", "Niš", "Kragujevac", "Subotica", "Zrenjanin",
  "Pančevo", "Čačak", "Kraljevo", "Smederevo", "Leskovac", "Užice",
  "Valjevo", "Šabac", "Sombor", "Kruševac", "Ostalo"
];

const FEATURES_LIST = [
  { id: "electricity", labelSr: "Struja", labelEn: "Electricity" },
  { id: "water", labelSr: "Voda", labelEn: "Water" },
  { id: "heating", labelSr: "Grejanje", labelEn: "Heating" },
  { id: "camera", labelSr: "Kamera", labelEn: "Camera" },
  { id: "ramp", labelSr: "Rampa", labelEn: "Ramp" },
  { id: "remote_control", labelSr: "Daljinski upravljač", labelEn: "Remote Control" },
];

const translations = {
  sr: {
    pageTitle: "Dodajte Oglas za Prodaju",
    pageSubtitle: "Popunite informacije o vašem parking mestu ili garaži za prodaju",
    homeButton: "Početna",
    langButton: "ENG",
    title: "Naslov",
    titlePlaceholder: "npr. Garaža u centru grada",
    price: "Cena (RSD)",
    pricePlaceholder: "npr. 1500000",
    area: "Kvadratura (m²)",
    areaPlaceholder: "npr. 15",
    pricePerSqm: "Cena po m²",
    description: "Opis",
    descriptionPlaceholder: "Detaljan opis nekretnine",
    advertiserType: "Oglašivač",
    advertiserTypePlaceholder: "Izaberite tip oglašivača",
    advertiserOwner: "Vlasnik",
    advertiserAgency: "Agencija",
    advertiserCompany: "Firma",
    propertyType: "Tip nekretnine",
    propertyTypePlaceholder: "Izaberite tip",
    propertyGarage: "Garaža",
    propertyOpenParking: "Otvoreno parking mesto",
    propertyClosedParking: "Zatvoreno parking mesto",
    propertyTruckParking: "Parking za kamione",
    propertyBuildingGarage: "Garažno mesto u zgradi",
    propertyWarehouseParking: "Magacinski prostor sa parkingom",
    propertyOther: "Ostalo",
    condition: "Stanje",
    conditionPlaceholder: "Izaberite stanje",
    conditionNew: "Novo",
    conditionUsed: "Korišćeno",
    conditionRenovated: "Renovirano",
    address: "Adresa",
    addressPlaceholder: "Unesite adresu",
    addressDescription: "Koristite autocomplete za preciznu lokaciju",
    city: "Grad",
    cityPlaceholder: "Izaberite grad",
    contactPhone: "Kontakt Telefon",
    phonePlaceholder: "+381 64 123 4567",
    phoneDescription: "Telefon za kontakt sa kupcima",
    numberOfSpots: "Broj parking mesta",
    numberOfSpotsPlaceholder: "npr. 2",
    numberOfSpotsDescription: "Opciono - koliko parking mesta je uključeno",
    features: "Dodatne karakteristike",
    photos: "Fotografije",
    photosDescription: "Dodajte do 5 slika vaše nekretnine kako bi privukli više kupaca.",
    uploadButton: "Dodaj Slike",
    submitButton: "Objavi Oglas",
    submittingButton: "Objavljivanje...",
    successTitle: "Uspešno Objavljeno",
    successDescription: "Vaš oglas za prodaju je uspešno objavljen.",
    loginRequired: "Za objavljivanje oglasa potrebna je prijava na nalog.",
    finishButton: "Završi",
    imageUploadTitle: "Dodaj Slike Nekretnine",
  },
  en: {
    pageTitle: "Add Sale Listing",
    pageSubtitle: "Fill in information about your parking spot or garage for sale",
    homeButton: "Home",
    langButton: "SRP",
    title: "Title",
    titlePlaceholder: "e.g. Garage in city center",
    price: "Price (RSD)",
    pricePlaceholder: "e.g. 1500000",
    area: "Area (m²)",
    areaPlaceholder: "e.g. 15",
    pricePerSqm: "Price per m²",
    description: "Description",
    descriptionPlaceholder: "Detailed description of the property",
    advertiserType: "Advertiser",
    advertiserTypePlaceholder: "Select advertiser type",
    advertiserOwner: "Owner",
    advertiserAgency: "Agency",
    advertiserCompany: "Company",
    propertyType: "Property Type",
    propertyTypePlaceholder: "Select type",
    propertyGarage: "Garage",
    propertyOpenParking: "Open Parking Spot",
    propertyClosedParking: "Closed Parking Spot",
    propertyTruckParking: "Truck Parking",
    propertyBuildingGarage: "Garage Spot in Building",
    propertyWarehouseParking: "Warehouse with Parking",
    propertyOther: "Other",
    condition: "Condition",
    conditionPlaceholder: "Select condition",
    conditionNew: "New",
    conditionUsed: "Used",
    conditionRenovated: "Renovated",
    address: "Address",
    addressPlaceholder: "Enter address",
    addressDescription: "Use autocomplete for precise location",
    city: "City",
    cityPlaceholder: "Select city",
    contactPhone: "Contact Phone",
    phonePlaceholder: "+381 64 123 4567",
    phoneDescription: "Phone for contact with buyers",
    numberOfSpots: "Number of Parking Spots",
    numberOfSpotsPlaceholder: "e.g. 2",
    numberOfSpotsDescription: "Optional - how many parking spots are included",
    features: "Additional Features",
    photos: "Photos",
    photosDescription: "Add up to 5 images of your property to attract more buyers.",
    uploadButton: "Add Images",
    submitButton: "Publish Listing",
    submittingButton: "Publishing...",
    successTitle: "Successfully Published",
    successDescription: "Your sale listing has been successfully published.",
    loginRequired: "Login is required to publish a listing.",
    finishButton: "Finish",
    imageUploadTitle: "Add Property Images",
  }
};

const formSchema = z.object({
  title: z.string().min(3, "Naslov mora imati najmanje 3 karaktera").max(255),
  price: z.string().min(1, "Cena je obavezna"),
  area: z.string().min(1, "Kvadratura je obavezna"),
  description: z.string().optional(),
  advertiserType: z.enum(['owner', 'agency', 'company'], {
    errorMap: () => ({ message: "Izaberite tip oglašivača" })
  }),
  propertyType: z.enum(['garage', 'open_parking', 'closed_parking', 'truck_parking', 'building_garage', 'warehouse_parking', 'other'], {
    errorMap: () => ({ message: "Izaberite tip nekretnine" })
  }),
  condition: z.enum(['new', 'used', 'renovated']).default('used'),
  address: z.string().min(5, "Adresa mora biti uneta"),
  city: z.preprocess((val) => val === "" ? undefined : val, z.string().optional()),
  phone: z.string().min(5, "Telefon mora imati najmanje 5 karaktera"),
  numberOfSpots: z.string().optional(),
  features: z.array(z.string()).default([]),
});

export default function AddSale() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [listingId, setListingId] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [language, setLanguage] = useState<"sr" | "en">("sr");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      price: "",
      area: "",
      description: "",
      advertiserType: "owner",
      propertyType: "garage",
      condition: "used",
      address: "",
      city: "",
      phone: "",
      numberOfSpots: "",
      features: [],
    },
  });

  const watchedPrice = form.watch("price");
  const watchedArea = form.watch("area");

  const pricePerSqm = (() => {
    const p = parseFloat(watchedPrice);
    const a = parseFloat(watchedArea);
    if (p > 0 && a > 0) {
      return Math.round(p / a);
    }
    return null;
  })();

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
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/sales-listings", data);
    },
    onSuccess: (data) => {
      setListingId(data.id);
      toast({
        title: t.successTitle,
        description: t.successDescription,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-listings"] });
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
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }

    mutation.mutate({
      ...values,
      price: values.price,
      area: values.area,
      numberOfSpots: values.numberOfSpots ? parseInt(values.numberOfSpots) : undefined,
      imageUrls: uploadedImages,
    });
  };

  return (
    <div className="min-h-screen bg-background">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.price}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder={t.pricePlaceholder} {...field} data-testid="input-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.area}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder={t.areaPlaceholder} {...field} data-testid="input-area" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="p-3 rounded-md bg-accent/10 border border-accent/20">
                <span className="text-sm text-muted-foreground">{t.pricePerSqm}: </span>
                <span className="font-semibold text-foreground" data-testid="text-price-per-sqm">
                  {pricePerSqm !== null ? `${pricePerSqm.toLocaleString()} RSD/m²` : "—"}
                </span>
              </div>

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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="advertiserType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.advertiserType}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-advertiser-type">
                            <SelectValue placeholder={t.advertiserTypePlaceholder} />
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
                  name="propertyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.propertyType}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-property-type">
                            <SelectValue placeholder={t.propertyTypePlaceholder} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="garage">{t.propertyGarage}</SelectItem>
                          <SelectItem value="open_parking">{t.propertyOpenParking}</SelectItem>
                          <SelectItem value="closed_parking">{t.propertyClosedParking}</SelectItem>
                          <SelectItem value="truck_parking">{t.propertyTruckParking}</SelectItem>
                          <SelectItem value="building_garage">{t.propertyBuildingGarage}</SelectItem>
                          <SelectItem value="warehouse_parking">{t.propertyWarehouseParking}</SelectItem>
                          <SelectItem value="other">{t.propertyOther}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.condition}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-condition">
                            <SelectValue placeholder={t.conditionPlaceholder} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new">{t.conditionNew}</SelectItem>
                          <SelectItem value="used">{t.conditionUsed}</SelectItem>
                          <SelectItem value="renovated">{t.conditionRenovated}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                    <FormLabel>{t.city}</FormLabel>
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
                name="numberOfSpots"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.numberOfSpots}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder={t.numberOfSpotsPlaceholder} {...field} data-testid="input-number-of-spots" />
                    </FormControl>
                    <FormDescription>
                      {t.numberOfSpotsDescription}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="features"
                render={() => (
                  <FormItem>
                    <FormLabel>{t.features}</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                      {FEATURES_LIST.map((feature) => (
                        <FormField
                          key={feature.id}
                          control={form.control}
                          name="features"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(feature.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, feature.id]);
                                    } else {
                                      field.onChange(current.filter((v: string) => v !== feature.id));
                                    }
                                  }}
                                  data-testid={`checkbox-${feature.id}`}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {language === "sr" ? feature.labelSr : feature.labelEn}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!listingId && (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending}
                  data-testid="button-submit-sale"
                >
                  {mutation.isPending ? t.submittingButton : t.submitButton}
                </Button>
              )}
            </form>
          </Form>

          {listingId && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold">{t.imageUploadTitle}</h3>
              <p className="text-sm text-muted-foreground">{t.photosDescription}</p>

              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {uploadedImages.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Uploaded ${index + 1}`}
                      className="w-full h-24 object-cover rounded-md"
                    />
                  ))}
                </div>
              )}

              {uploadedImages.length < 5 && (
                <ObjectUploader
                  maxNumberOfFiles={5 - uploadedImages.length}
                  onGetUploadParameters={async () => {
                    const result = await apiRequest("POST", "/api/object-storage/upload-url", {
                      prefix: `.private/sales/${listingId}`,
                    });
                    return {
                      method: "PUT" as const,
                      url: result.url,
                    };
                  }}
                  onComplete={(result) => {
                    const newUrls = (result.successful?.map((file) => file.uploadURL).filter(Boolean) as string[]) || [];
                    const allUrls = [...uploadedImages, ...newUrls];
                    setUploadedImages(allUrls);
                    apiRequest("PATCH", `/api/sales-listings/${listingId}`, {
                      imageUrls: allUrls,
                    }).catch(console.error);
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {t.uploadButton}
                </ObjectUploader>
              )}

              <Button
                className="w-full"
                onClick={() => setLocation("/dashboard")}
                data-testid="button-finish"
              >
                {t.finishButton}
              </Button>
            </div>
          )}
        </Card>
      </div>

      <LoginRequiredDialog
        open={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        message={t.loginRequired}
        redirectPath="/add-sale"
      />
    </div>
  );
}
