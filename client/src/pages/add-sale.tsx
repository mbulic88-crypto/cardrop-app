import { useState, useEffect, useRef } from "react";
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
import { ArrowLeft, Home as HomeIcon, Globe, Upload, Check, Sparkles } from "lucide-react";
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
import { PRICING_PLANS, getPlanById, getMaxPhotos, type SubscriptionType } from "@shared/pricing";

const SERBIAN_CITIES = [
  "Beograd", "Novi Sad", "Niš", "Kragujevac", "Subotica", "Zrenjanin",
  "Pančevo", "Čačak", "Kraljevo", "Smederevo", "Leskovac", "Užice",
  "Valjevo", "Šabac", "Sombor", "Kruševac", "Ostalo"
];

const FEATURES_LIST = [
  { id: "electricity", labelSr: "Struja", labelEn: "Electricity", labelDe: "Strom", labelHu: "Villany", labelSk: "Elektrina", labelMk: "Струја" },
  { id: "water", labelSr: "Voda", labelEn: "Water", labelDe: "Wasser", labelHu: "Víz", labelSk: "Voda", labelMk: "Вода" },
  { id: "heating", labelSr: "Grejanje", labelEn: "Heating", labelDe: "Heizung", labelHu: "Fűtés", labelSk: "Kúrenie", labelMk: "Греење" },
  { id: "camera", labelSr: "Kamera", labelEn: "Camera", labelDe: "Kamera", labelHu: "Kamera", labelSk: "Kamera", labelMk: "Камера" },
  { id: "ramp", labelSr: "Rampa", labelEn: "Ramp", labelDe: "Rampe", labelHu: "Rámpa", labelSk: "Rampa", labelMk: "Рампа" },
  { id: "remote_control", labelSr: "Daljinski upravljač", labelEn: "Remote Control", labelDe: "Fernbedienung", labelHu: "Távirányító", labelSk: "Diaľkový ovládač", labelMk: "Далечински управувач" },
];

const translations = {
  sr: {
    pageTitle: "Dodajte Oglas za Prodaju",
    pageSubtitle: "Popunite informacije o vašem parking mestu ili garaži za prodaju",
    homeButton: "Početna",
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
  },
  de: {
    pageTitle: "Verkaufsanzeige hinzufügen",
    pageSubtitle: "Füllen Sie die Informationen über Ihren Parkplatz oder Ihre Garage zum Verkauf aus",
    homeButton: "Startseite",
    title: "Titel",
    titlePlaceholder: "z.B. Garage im Stadtzentrum",
    price: "Preis (RSD)",
    pricePlaceholder: "z.B. 1500000",
    area: "Fläche (m²)",
    areaPlaceholder: "z.B. 15",
    pricePerSqm: "Preis pro m²",
    description: "Beschreibung",
    descriptionPlaceholder: "Detaillierte Beschreibung der Immobilie",
    advertiserType: "Werbetreibender",
    advertiserTypePlaceholder: "Wählen Sie den Typ des Werbetreibenden",
    advertiserOwner: "Eigentümer",
    advertiserAgency: "Agentur",
    advertiserCompany: "Unternehmen",
    propertyType: "Immobilientyp",
    propertyTypePlaceholder: "Typ auswählen",
    propertyGarage: "Garage",
    propertyOpenParking: "Offener Parkplatz",
    propertyClosedParking: "Geschlossener Parkplatz",
    propertyTruckParking: "LKW-Parkplatz",
    propertyBuildingGarage: "Garagenplatz im Gebäude",
    propertyWarehouseParking: "Lager mit Parkplatz",
    propertyOther: "Sonstiges",
    condition: "Zustand",
    conditionPlaceholder: "Zustand auswählen",
    conditionNew: "Neu",
    conditionUsed: "Gebraucht",
    conditionRenovated: "Renoviert",
    address: "Adresse",
    addressPlaceholder: "Adresse eingeben",
    addressDescription: "Verwenden Sie die Autovervollständigung für genaue Standorte",
    city: "Stadt",
    cityPlaceholder: "Stadt auswählen",
    contactPhone: "Kontakttelefon",
    phonePlaceholder: "+381 64 123 4567",
    phoneDescription: "Telefon für den Kontakt mit Käufern",
    numberOfSpots: "Anzahl der Parkplätze",
    numberOfSpotsPlaceholder: "z.B. 2",
    numberOfSpotsDescription: "Optional - wie viele Parkplätze sind enthalten",
    features: "Zusätzliche Merkmale",
    photos: "Fotos",
    photosDescription: "Fügen Sie bis zu 5 Bilder Ihrer Immobilie hinzu, um mehr Käufer anzulocken.",
    uploadButton: "Bilder hinzufügen",
    submitButton: "Anzeige veröffentlichen",
    submittingButton: "Veröffentlichung...",
    successTitle: "Erfolgreich veröffentlicht",
    successDescription: "Ihre Verkaufsanzeige wurde erfolgreich veröffentlicht.",
    loginRequired: "Zum Veröffentlichen einer Anzeige ist eine Anmeldung erforderlich.",
    finishButton: "Fertig",
    imageUploadTitle: "Immobilienbilder hinzufügen",
  },
  hu: {
    pageTitle: "Eladási hirdetés hozzáadása",
    pageSubtitle: "Töltse ki az eladásra kínált parkolóhelyéről vagy garázsáról szóló információkat",
    homeButton: "Főoldal",
    title: "Cím",
    titlePlaceholder: "pl. Garázs a belvárosban",
    price: "Ár (RSD)",
    pricePlaceholder: "pl. 1500000",
    area: "Terület (m²)",
    areaPlaceholder: "pl. 15",
    pricePerSqm: "Ár per m²",
    description: "Leírás",
    descriptionPlaceholder: "Az ingatlan részletes leírása",
    advertiserType: "Hirdető",
    advertiserTypePlaceholder: "Válassza ki a hirdető típusát",
    advertiserOwner: "Tulajdonos",
    advertiserAgency: "Ügynökség",
    advertiserCompany: "Vállalat",
    propertyType: "Ingatlan típusa",
    propertyTypePlaceholder: "Típus kiválasztása",
    propertyGarage: "Garázs",
    propertyOpenParking: "Nyitott parkolóhely",
    propertyClosedParking: "Zárt parkolóhely",
    propertyTruckParking: "Kamion parkoló",
    propertyBuildingGarage: "Garázshely épületben",
    propertyWarehouseParking: "Raktár parkolóval",
    propertyOther: "Egyéb",
    condition: "Állapot",
    conditionPlaceholder: "Állapot kiválasztása",
    conditionNew: "Új",
    conditionUsed: "Használt",
    conditionRenovated: "Felújított",
    address: "Cím",
    addressPlaceholder: "Adja meg a címet",
    addressDescription: "Használja az automatikus kiegészítést a pontos helyhez",
    city: "Város",
    cityPlaceholder: "Válasszon várost",
    contactPhone: "Kapcsolattartó telefon",
    phonePlaceholder: "+381 64 123 4567",
    phoneDescription: "Telefon a vevőkkel való kapcsolattartáshoz",
    numberOfSpots: "Parkolóhelyek száma",
    numberOfSpotsPlaceholder: "pl. 2",
    numberOfSpotsDescription: "Opcionális - hány parkolóhely tartozik hozzá",
    features: "További jellemzők",
    photos: "Fotók",
    photosDescription: "Adjon hozzá legfeljebb 5 képet az ingatlanáról, hogy több vevőt vonzzon.",
    uploadButton: "Képek hozzáadása",
    submitButton: "Hirdetés közzététele",
    submittingButton: "Közzététel...",
    successTitle: "Sikeresen közzétéve",
    successDescription: "Eladási hirdetése sikeresen közzétéve.",
    loginRequired: "Hirdetés közzétételéhez bejelentkezés szükséges.",
    finishButton: "Befejezés",
    imageUploadTitle: "Ingatlanképek hozzáadása",
  },
  sk: {
    pageTitle: "Pridať inzerát na predaj",
    pageSubtitle: "Vyplňte informácie o vašom parkovacom mieste alebo garáži na predaj",
    homeButton: "Domov",
    title: "Názov",
    titlePlaceholder: "napr. Garáž v centre mesta",
    price: "Cena (RSD)",
    pricePlaceholder: "napr. 1500000",
    area: "Plocha (m²)",
    areaPlaceholder: "napr. 15",
    pricePerSqm: "Cena za m²",
    description: "Popis",
    descriptionPlaceholder: "Podrobný popis nehnuteľnosti",
    advertiserType: "Inzerent",
    advertiserTypePlaceholder: "Vyberte typ inzerenta",
    advertiserOwner: "Vlastník",
    advertiserAgency: "Agentúra",
    advertiserCompany: "Spoločnosť",
    propertyType: "Typ nehnuteľnosti",
    propertyTypePlaceholder: "Vyberte typ",
    propertyGarage: "Garáž",
    propertyOpenParking: "Otvorené parkovacie miesto",
    propertyClosedParking: "Uzavreté parkovacie miesto",
    propertyTruckParking: "Parkovanie pre kamióny",
    propertyBuildingGarage: "Garážové miesto v budove",
    propertyWarehouseParking: "Sklad s parkovaním",
    propertyOther: "Iné",
    condition: "Stav",
    conditionPlaceholder: "Vyberte stav",
    conditionNew: "Nový",
    conditionUsed: "Použitý",
    conditionRenovated: "Zrekonštruovaný",
    address: "Adresa",
    addressPlaceholder: "Zadajte adresu",
    addressDescription: "Použite automatické dopĺňanie pre presnú polohu",
    city: "Mesto",
    cityPlaceholder: "Vyberte mesto",
    contactPhone: "Kontaktný telefón",
    phonePlaceholder: "+381 64 123 4567",
    phoneDescription: "Telefón na kontakt s kupujúcimi",
    numberOfSpots: "Počet parkovacích miest",
    numberOfSpotsPlaceholder: "napr. 2",
    numberOfSpotsDescription: "Voliteľné - koľko parkovacích miest je zahrnutých",
    features: "Ďalšie vlastnosti",
    photos: "Fotografie",
    photosDescription: "Pridajte až 5 obrázkov vašej nehnuteľnosti na prilákanie viac kupujúcich.",
    uploadButton: "Pridať obrázky",
    submitButton: "Zverejniť inzerát",
    submittingButton: "Zverejňovanie...",
    successTitle: "Úspešne zverejnené",
    successDescription: "Váš inzerát na predaj bol úspešne zverejnený.",
    loginRequired: "Na zverejnenie inzerátu je potrebné prihlásenie.",
    finishButton: "Dokončiť",
    imageUploadTitle: "Pridať obrázky nehnuteľnosti",
  },
  mk: {
    pageTitle: "Додадете оглас за продажба",
    pageSubtitle: "Пополнете ги информациите за вашето паркинг место или гаража за продажба",
    homeButton: "Почетна",
    title: "Наслов",
    titlePlaceholder: "пр. Гаража во центарот на градот",
    price: "Цена (RSD)",
    pricePlaceholder: "пр. 1500000",
    area: "Квадратура (m²)",
    areaPlaceholder: "пр. 15",
    pricePerSqm: "Цена по m²",
    description: "Опис",
    descriptionPlaceholder: "Детален опис на имотот",
    advertiserType: "Огласувач",
    advertiserTypePlaceholder: "Изберете тип на огласувач",
    advertiserOwner: "Сопственик",
    advertiserAgency: "Агенција",
    advertiserCompany: "Фирма",
    propertyType: "Тип на имот",
    propertyTypePlaceholder: "Изберете тип",
    propertyGarage: "Гаража",
    propertyOpenParking: "Отворено паркинг место",
    propertyClosedParking: "Затворено паркинг место",
    propertyTruckParking: "Паркинг за камиони",
    propertyBuildingGarage: "Гаражно место во зграда",
    propertyWarehouseParking: "Магацински простор со паркинг",
    propertyOther: "Друго",
    condition: "Состојба",
    conditionPlaceholder: "Изберете состојба",
    conditionNew: "Ново",
    conditionUsed: "Користено",
    conditionRenovated: "Реновирано",
    address: "Адреса",
    addressPlaceholder: "Внесете адреса",
    addressDescription: "Користете автоматско пополнување за прецизна локација",
    city: "Град",
    cityPlaceholder: "Изберете град",
    contactPhone: "Контакт телефон",
    phonePlaceholder: "+381 64 123 4567",
    phoneDescription: "Телефон за контакт со купувачите",
    numberOfSpots: "Број на паркинг места",
    numberOfSpotsPlaceholder: "пр. 2",
    numberOfSpotsDescription: "Опционално - колку паркинг места се вклучени",
    features: "Дополнителни карактеристики",
    photos: "Фотографии",
    photosDescription: "Додадете до 5 слики на вашиот имот за да привлечете повеќе купувачи.",
    uploadButton: "Додадете слики",
    submitButton: "Објавете оглас",
    submittingButton: "Објавување...",
    successTitle: "Успешно објавено",
    successDescription: "Вашиот оглас за продажба е успешно објавен.",
    loginRequired: "За објавување оглас потребна е најава на сметка.",
    finishButton: "Заврши",
    imageUploadTitle: "Додадете слики на имот",
  },
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
  const [language, setLanguage] = useState<"sr" | "en" | "de" | "hu" | "sk" | "mk">("sr");
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType>('standard');

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
    if (savedLanguage === "en" || savedLanguage === "sr" || savedLanguage === "de" || savedLanguage === "hu" || savedLanguage === "sk" || savedLanguage === "mk") {
      setLanguage(savedLanguage);
    }
  }, []);

  const selectLanguage = (code: typeof language) => {
    setLanguage(code);
    localStorage.setItem("parkin-language", code);
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
    { code: "de" as const, label: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}" },
    { code: "hu" as const, label: "Magyar", flag: "\u{1F1ED}\u{1F1FA}" },
    { code: "sk" as const, label: "Slovenský", flag: "\u{1F1F8}\u{1F1F0}" },
    { code: "mk" as const, label: "Македонски", flag: "\u{1F1F2}\u{1F1F0}" },
  ];
  const currentLangLabel = languageOptions.find(l => l.code === language)?.label || "Srpski";

  const getLabelForLanguage = (feature: typeof FEATURES_LIST[0]) => {
    switch(language) {
      case 'sr': return feature.labelSr;
      case 'en': return feature.labelEn;
      case 'de': return feature.labelDe;
      case 'hu': return feature.labelHu;
      case 'sk': return feature.labelSk;
      case 'mk': return feature.labelMk;
      default: return feature.labelSr;
    }
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
    mutationFn: async (data: { tier: string; listingData: any }) => {
      return await apiRequest("POST", "/api/stripe/create-sale-checkout", data);
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

    const isPremium = selectedPlan === 'silver' || selectedPlan === 'gold';

    if (isPremium) {
      const listingData = {
        ...values,
        price: values.price,
        area: values.area,
        numberOfSpots: values.numberOfSpots ? parseInt(values.numberOfSpots) : undefined,
        imageUrls: uploadedImages,
        subscriptionType: selectedPlan,
        isPremium: true,
      };
      stripeMutation.mutate({ tier: selectedPlan, listingData });
    } else {
      mutation.mutate({
        ...values,
        price: values.price,
        area: values.area,
        numberOfSpots: values.numberOfSpots ? parseInt(values.numberOfSpots) : undefined,
        imageUrls: uploadedImages,
        subscriptionType: selectedPlan,
        isPremium: false,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
                                {getLabelForLanguage(feature)}
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
                    let headerBg = '';
                    let priceColor = 'text-accent';
                    let checkBorder = 'border-muted-foreground';
                    let checkBg = '';
                    let checkIcon = 'text-white';
                    
                    if (isSilver) {
                      borderClass = isSelected ? 'border-[#A8A9AD] ring-2 ring-[#A8A9AD]/50' : 'border-[#A8A9AD]/40';
                      bgClass = isSelected ? 'bg-gradient-to-b from-[#C0C0C0]/10 to-[#A8A9AD]/5' : '';
                      headerBg = 'bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#A8A9AD]';
                      priceColor = 'text-[#71706E] dark:text-[#C0C0C0]';
                      checkBorder = 'border-[#A8A9AD]';
                      checkBg = isSelected ? 'bg-gradient-to-r from-[#C0C0C0] to-[#A8A9AD]' : '';
                      checkIcon = 'text-white';
                    } else if (isGold) {
                      borderClass = isSelected ? 'border-[#DAA520] ring-2 ring-[#DAA520]/50' : 'border-[#DAA520]/40';
                      bgClass = isSelected ? 'bg-gradient-to-b from-[#FFD700]/10 to-[#DAA520]/5' : '';
                      headerBg = 'bg-gradient-to-r from-[#DAA520] via-[#FFD700] to-[#B8860B]';
                      priceColor = 'text-[#B8860B] dark:text-[#FFD700]';
                      checkBorder = 'border-[#DAA520]';
                      checkBg = isSelected ? 'bg-gradient-to-r from-[#FFD700] to-[#DAA520]' : '';
                      checkIcon = 'text-yellow-950';
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
                          <div className={`px-4 py-2 rounded-t-md ${headerBg}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-white tracking-wide">
                                {language === 'sr' ? plan.badgeSr : plan.badgeEn}
                              </span>
                              <Sparkles className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                        
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-foreground text-lg">
                                {language === 'sr' ? plan.name : plan.nameEn}
                              </h4>
                              <div className="flex items-baseline gap-1 mt-1">
                                <span className={`text-2xl font-bold ${priceColor}`}>
                                  {plan.price === 0 ? (language === 'sr' ? 'Besplatno' : 'Free') : `${plan.price.toLocaleString('sr-RS')} RSD`}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
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
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isSilver ? 'text-[#A8A9AD]' : isGold ? 'text-[#DAA520]' : 'text-accent'}`} />
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
                      {language === 'sr' ? 'Vaš oglas će biti aktivan' : 'Your listing will be active for'}{' '}
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
              </div>

              {!listingId && (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending || stripeMutation.isPending}
                  data-testid="button-submit-sale"
                >
                  {(mutation.isPending || stripeMutation.isPending)
                    ? t.submittingButton
                    : selectedPlan !== 'standard'
                      ? (language === 'sr' ? `Plati i Objavi (${getPlanById(selectedPlan)?.price} RSD)` : `Pay & Publish (${getPlanById(selectedPlan)?.price} RSD)`)
                      : t.submitButton}
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

              {uploadedImages.length < getMaxPhotos(selectedPlan) && (
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
                    if (uploadURL && listingId) {
                      const response = await apiRequest("PUT", `/api/sales-listings/${listingId}/images`, {
                        imageURL: uploadURL,
                      });
                      setUploadedImages(response.imageUrls);
                      toast({
                        title: language === 'sr' ? 'Uspešno' : 'Success',
                        description: language === 'sr' ? 'Slika je uspešno uploadovana' : 'Image uploaded successfully',
                      });
                    }
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
