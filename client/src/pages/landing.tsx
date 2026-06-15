import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Zap, Download, Sun, Moon, PlusCircle, Home, Building2, Truck, Users, Car, Clock, CalendarDays, Menu, X, LogIn, LayoutDashboard, Tag, Sparkles, Check, Mail, Phone, MapPin, Info, CreditCard, Crown, Star, Shield, Lock, Share, Smartphone, User as UserIcon, Hotel } from "lucide-react";
import { SiInstagram, SiFacebook, SiTiktok } from "react-icons/si";
import { useLanguage } from "@/hooks/useLanguage";
import googlePlayBadgeImg from "@assets/image_1777741996093.png";
import heroImage from "@assets/hero-female-driver_2.jpg";
import phoneGpsImage from "@assets/phone-gps-navigation.jpg";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import testimonialMarko from "@assets/images/testimonial-marko.jpg";
import testimonialAna from "@assets/images/testimonial-ana.jpg";
import testimonialNenad from "@assets/images/testimonial-nenad.jpg";
import cityBeogradImg from "@assets/images/city-beograd.jpg";
import cityNoviSadImg from "@assets/images/city-novisad.jpg";
import cityNisImg from "@assets/images/city-nis.jpg";
import cityKragujevacImg from "@assets/images/city-kragujevac.jpg";
import categoryPrivateImg from "@assets/images/category-private.jpg";
import categoryCompanyImg from "@assets/images/category-company.jpg";
import categoryTruckImg from "@assets/images/category-truck.jpg";
import categoryResidentialImg from "@assets/images/category-residential.jpg";
import categoryCarlotImg from "@assets/images/category-carlot.jpg";
import categorySaleImg from "@assets/images/category-sale.jpg";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import { usePWA } from "@/hooks/use-pwa";
import { useTheme } from "next-themes";
import { PRICING_PLANS } from "@shared/pricing";

const translations = {
  sr: {
    heroTitle: "Pronađite ili Iznajmite Parking Mesto ili Garažu",
    heroSubtitle: "Rezerviši privatni parking direktno od vlasnika i plati onlajn — ili otkrij skrivena parking mesta koja znaju samo mestani: slobodna mesta, upozorenja za pauka i tajne lokacije u realnom vremenu.",
    findSpotButton: "Pronađi parking",
    findSpotSubtitle: "Privatni parkinzi – iznajmi i rezerviši · Javni skriveni parkinzi – Štek, Zlatni Minut, Pauk Radar, Safe Zona",
    findSpotBranding: "Map Hack RS",
    listSpotButton: "Iznajmite Parking Mesto",
    howItWorks: "Kako Funkcioniše",
    rentOutTitle: "Kako Iznajmiti Parking",
    rentOutStep1: "Izaberite dugme \"Iznajmite Vaše Parking Mesto\"",
    rentOutStep2: "Izaberite kategoriju",
    rentOutStep3: "Popunite informacije o parkingu",
    reserveTitle: "Kako Rezervisati Parking",
    reserveStep1: "Izaberite \"Pronađite Parking Mesto\"",
    reserveStep2: "Pronađite parking mesto koje vam odgovara",
    reserveStep3: "Kontaktirajte vlasnika oko dogovora",
    popularLocations: "Popularne Destinacije",
    parkingSpots: "Parking Mesta",
    users: "Korisnika",
    successfulBookings: "Uspešnih Rezervacija",
    ctaTitle: "Imate Neiskorišćeno Parking Mesto?",
    ctaSubtitle: "Zaradite deljenjem svog parking prostora sa drugim vozačima. Jednostavno, sigurno, profitabilno.",
    termsButton: "Uslovi Korišćenja",
    privacyButton: "Politika Privatnosti",
    footerText: "\u00a9 2025 CarDrop owned by Ai Me IT LLC, United States",
    langButton: "ENG",
    installApp: "Instaliraj Aplikaciju",
    installAndroid: "Android",
    installAndroidDesc: "Preuzmite sa Google Play ili kliknite dugme iznad za direktnu instalaciju.",
    installIphone: "iPhone",
    installIphoneDesc: "Otvorite u Safari-ju, kliknite dugme za deljenje i izaberite \"Dodaj na početni ekran\".",
    googlePlayBadge: "Dostupno na Google Play",
    sellButton: "Oglasi Prodaju",
    whoIsThisFor: "Za Koga Je Ovo",
    whoCanRent: "Ko Može Da Iznajmi Parking",
    whoCanReserve: "Ko Može Da Rezerviše Parking",
    everyoneWhoNeeds: "Svi Kojima Je Potreban Parking",
    reserveDescription: "Bilo da vam treba parking na sat vremena dok ste u restoranu, na dan dok obavljate poslove u gradu, ili na mesec dana - CarDrop vam omogućava fleksibilnu rezervaciju po vašoj meri.",
    shortTerm: "Kratkoročno Parkiranje",
    shortTermDesc: "Idealno kada vam treba parking na nekoliko sati ili dan.",
    shortTermExamples: [
      "Ručak u restoranu u centru grada",
      "Šoping u tržnom centru",
      "Poseta lekaru ili zubar",
      "Poslovni sastanak ili intervju",
      "Koncert, utakmica ili izlazak",
    ],
    longTerm: "Dugoročno Parkiranje", 
    longTermDesc: "Zakupite mesto na duži period po povoljnijim cenama.",
    longTermExamples: [
      "Mesečni parking blizu posla",
      "Studentski parking tokom semestra",
      "Sezonski zakup za letovanje ili zimu",
      "Parking za stanare bez sopstvene garaže",
      "Skladištenje vozila tokom putovanja",
    ],
    categoryPrivate: "Privatni Parkinzi i Garaže",
    categoryCompany: "Firme i Agencije",
    categorySale: "Prodaja Parkinga",
    categoryTruck: "Stajalista za Kamione",
    categoryResidential: "Stambene Zajednice",
    categoryCarLot: "Auto Placevi",
    menuFindParking: "Pronađi Parking",
    menuListParking: "Iznajmi Parking",
    menuSellListing: "Oglasi Prodaju",
    menuMyAccount: "Moj Nalog",
    menuMyProfile: "Moj Profil",
    menuReservations: "Rezervacije",
    myReservations: "Moje Rezervacije",
    menuLogin: "Prijavi Se",
    menuWhoIsThisFor: "Za Koga Je",
    menuHowItWorks: "Kako Funkcioniše",
    menuAccommodations: "Smeštaji",
    menuPricing: "Cenovnik",
    menuContact: "Kontakt",
    menuLanguage: "English",
    menuDarkMode: "Tamni Režim",
    menuLightMode: "Svetli Režim",
    accommodationsTitle: "Preporučeni Smeštaji",
    accommodationsSubtitle: "Naši partneri — provjereni smeštaji koje preporučujemo CarDrop korisnicima.",
    accommodationsNoviSad: "Novi Sad",
    accommodationsBeograd: "Beograd",
    accommodationsNis: "Niš",
    accommodationsExplore: "Pogledaj smeštaje",
    pricingTitle: "Cenovnik",
    pricingSubtitle: "Izaberite plan koji vam najviše odgovara. Svi planovi važe za sve kategorije parkinga i prodajne oglase.",
    pricingPerListing: "po oglasu",
    pricingFree: "Besplatno",
    pricingChoosePlan: "Izaberi Plan",
    pricingMostPopular: "Najpopularniji",
    pricingBestValue: "Najbolja Vrednost",
    mapHackTitle: "Map Hack RS",
    mapHackSubtitle: "Real-time parking mapa Srbije. Štek mesta, pauk radar, safe zone alarmi — sve u jednoj aplikaciji.",
    mapHackBadge: "Dostupno širom Srbije",
    mapHackFreeLabel: "FREE",
    mapHackFreeDesc: "Osnovna mapa sa zlatnim minutom i paukom",
    mapHackFreeFeatures: ["Interaktivna parking mapa RS", "Zlatni Minut markeri", "Pauk radar upozorenja", "SMS plaćanje javnih zona (1 klik)", "Live Chat zajednica"],
    mapHackPremiumLabel: "PREMIUM",
    mapHackPremiumBadge: "Preporučeno",
    mapHackPremiumDesc: "Potpuna zaštita — najbrži parking u gradu",
    mapHackPremiumFeatures: ["Sve Free funkcije +", "Štek parking lokacije (skrivena baza)", "Radar markeri (policija i patrola)", "Safe Zone alarm — push u 300m krugu", "Push notifikacije bez gledanja u mapu"],
    mapHackDayPassLabel: "DAY PASS",
    mapHackDayPassDesc: "Sve Premium funkcije na 24 sata",
    mapHackAnnualLabel: "GODIŠNJI",
    mapHackAnnualBadge: "Ušteda 2 meseca",
    mapHackAnnualDesc: "Sve Premium funkcije — 365 dana",
    mapHackPerMonth: "/ mes",
    mapHackPerDay: "24h",
    mapHackPerYear: "/ god",
    mapHackCTA: "Otvorite Map Hack RS",
    contactTitle: "Kontaktirajte Nas",
    contactSubtitle: "Vaše mišljenje nam je važno! Pišite nam za bilo kakvo pitanje, predlog ili ideju - zajedno pravimo bolju platformu.",
    contactEmail: "Email",
    contactResponseTime: "Odgovaramo u roku od 24 sata",
    contactEncouragement: "Pišite nam slobodno za sve što vam pada na pamet - svaka poruka nam pomaže da budemo bolji!",
  },
  en: {
    heroTitle: "Find or List a Parking Spot or Garage",
    heroSubtitle: "Reserve private parking directly from owners and pay online — or discover hidden spots only locals know: free spaces, tow truck alerts, and secret locations in real time.",
    findSpotButton: "Find Parking",
    findSpotSubtitle: "Private Parking – rent & reserve · Hidden Public Spots – Štek, Golden Minute, Tow Radar, Safe Zone",
    findSpotBranding: "Map Hack RS",
    listSpotButton: "List Parking Spot",
    howItWorks: "How It Works",
    rentOutTitle: "How to Rent Out Parking",
    rentOutStep1: "Click \"List Your Parking Spot\" button",
    rentOutStep2: "Choose a category",
    rentOutStep3: "Fill in parking information",
    reserveTitle: "How to Reserve Parking",
    reserveStep1: "Click \"Find Your Parking Spot\"",
    reserveStep2: "Find a parking spot that suits you",
    reserveStep3: "Contact the owner to make arrangements",
    popularLocations: "Popular Destinations",
    parkingSpots: "Parking Spots",
    users: "Users",
    successfulBookings: "Successful Bookings",
    ctaTitle: "Have an Unused Parking Spot?",
    ctaSubtitle: "Earn by sharing your parking space with other drivers. Simple, secure, profitable.",
    termsButton: "Terms of Use",
    privacyButton: "Privacy Policy",
    footerText: "\u00a9 2025 CarDrop owned by Ai Me IT LLC, United States",
    langButton: "SRP",
    installApp: "Install App",
    installAndroid: "Android",
    installAndroidDesc: "Download from Google Play or click the button above to install directly.",
    installIphone: "iPhone",
    installIphoneDesc: "Open in Safari, tap the Share button and select \"Add to Home Screen\".",
    googlePlayBadge: "Get it on Google Play",
    sellButton: "List for Sale",
    whoIsThisFor: "Who Is This For",
    whoCanRent: "Who Can Rent Out Parking",
    whoCanReserve: "Who Can Reserve Parking",
    everyoneWhoNeeds: "Everyone Who Needs Parking",
    reserveDescription: "Whether you need parking for an hour while dining, for a day while running errands, or for a month - CarDrop offers flexible reservations tailored to your needs.",
    shortTerm: "Short-Term Parking",
    shortTermDesc: "Perfect when you need parking for a few hours or a day.",
    shortTermExamples: [
      "Lunch at a downtown restaurant",
      "Shopping at the mall",
      "Doctor or dentist appointment",
      "Business meeting or interview",
      "Concert, game, or night out",
    ],
    longTerm: "Long-Term Parking",
    longTermDesc: "Reserve a spot for an extended period at better rates.",
    longTermExamples: [
      "Monthly parking near your workplace",
      "Student parking during the semester",
      "Seasonal rental for summer or winter",
      "Parking for residents without a garage",
      "Vehicle storage while traveling",
    ],
    categoryPrivate: "Private Parking & Garages",
    categoryCompany: "Companies & Agencies",
    categorySale: "Parking for Sale",
    categoryTruck: "Truck Stops",
    categoryResidential: "Residential Communities",
    categoryCarLot: "Car Lots",
    menuFindParking: "Find Parking",
    menuListParking: "List Parking",
    menuSellListing: "List for Sale",
    menuMyAccount: "My Account",
    menuMyProfile: "My Profile",
    menuReservations: "Reservations",
    myReservations: "My Bookings",
    menuLogin: "Log In",
    menuWhoIsThisFor: "Who Is This For",
    menuHowItWorks: "How It Works",
    menuAccommodations: "Stays",
    menuPricing: "Pricing",
    menuContact: "Contact",
    menuLanguage: "Srpski",
    menuDarkMode: "Dark Mode",
    menuLightMode: "Light Mode",
    accommodationsTitle: "Recommended Stays",
    accommodationsSubtitle: "Our partners — trusted accommodations we recommend to CarDrop users.",
    accommodationsNoviSad: "Novi Sad",
    accommodationsBeograd: "Belgrade",
    accommodationsNis: "Niš",
    accommodationsExplore: "Browse stays",
    pricingTitle: "Pricing",
    pricingSubtitle: "Choose the plan that suits you best. All plans apply to every parking category and sales listings.",
    pricingPerListing: "per listing",
    pricingFree: "Free",
    pricingChoosePlan: "Choose Plan",
    pricingMostPopular: "Most Popular",
    pricingBestValue: "Best Value",
    mapHackTitle: "Map Hack RS",
    mapHackSubtitle: "Real-time parking map of Serbia. Hidden spots, speed camera alerts, safe zone alarms — all in one app.",
    mapHackBadge: "Available across Serbia",
    mapHackFreeLabel: "FREE",
    mapHackFreeDesc: "Basic map with golden minute and speed camera",
    mapHackFreeFeatures: ["Interactive RS parking map", "Golden Minute markers", "Speed camera alerts", "Public zone SMS payment (1 tap)", "Live community chat"],
    mapHackPremiumLabel: "PREMIUM",
    mapHackPremiumBadge: "Recommended",
    mapHackPremiumDesc: "Full protection — fastest parking in the city",
    mapHackPremiumFeatures: ["All Free features +", "Hidden parking spots database", "Police patrol radar markers", "Safe Zone alarm — push within 300m", "Push notifications without watching the map"],
    mapHackDayPassLabel: "DAY PASS",
    mapHackDayPassDesc: "All Premium features for 24 hours",
    mapHackAnnualLabel: "ANNUAL",
    mapHackAnnualBadge: "Save 2 months",
    mapHackAnnualDesc: "All Premium features — 365 days",
    mapHackPerMonth: "/ mo",
    mapHackPerDay: "24h",
    mapHackPerYear: "/ yr",
    mapHackCTA: "Open Map Hack RS",
    contactTitle: "Contact Us",
    contactSubtitle: "Your opinion matters! Write to us with any question, suggestion or idea - together we build a better platform.",
    contactEmail: "Email",
    contactResponseTime: "We respond within 24 hours",
    contactEncouragement: "Feel free to reach out about anything - every message helps us improve!",
  },
};


export default function Landing() {
  const { language, setLanguage } = useLanguage();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { isInstallable, installApp } = usePWA();
  const { theme, setTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIos(/iPhone|iPad|iPod/i.test(ua));
    setIsAndroid(/Android/i.test(ua));
  }, []);



  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const languageOptions = [
    { code: "sr" as const, label: "Srpski", flag: "🇷🇸" },
    { code: "en" as const, label: "English", flag: "🇬🇧" },
  ];

  const selectLanguage = (code: "sr" | "en") => {
    setLanguage(code);
    setMenuOpen(false);
  };

  const [loginRedirectPath, setLoginRedirectPath] = useState("/select-category");

  const handleListSpotClick = () => {
    if (!isAuthenticated) {
      setLoginRedirectPath("/select-category");
      setShowLoginDialog(true);
    } else {
      setLocation("/select-category");
    }
  };

  const handleSellClick = () => {
    if (!isAuthenticated) {
      setLoginRedirectPath("/add-sale");
      setShowLoginDialog(true);
    } else {
      setLocation("/add-sale");
    }
  };

  const handleProtectedAction = (path: string) => {
    if (!isAuthenticated) {
      setLoginRedirectPath(path);
      setShowLoginDialog(true);
    } else {
      setLocation(path);
    }
  };

  const scrollToSection = (id: string) => {
    setMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const t = language === "sr" ? translations.sr : translations.en;

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Hamburger Left, Logo Center */}
      <header className="absolute top-0 left-0 right-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Hamburger Menu + Flags */}
            <div className="flex items-center gap-2">
            <div className="relative" ref={menuRef}>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMenuOpen(!menuOpen)}
                className="bg-black/30 backdrop-blur-sm border-white/30 text-white"
                data-testid="button-hamburger-menu"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>

              {menuOpen && (
                <div className="absolute top-12 left-0 w-64 bg-card border border-border rounded-md shadow-lg z-50">
                  <nav className="py-2">
                    <Link href="/map-hack" onClick={() => setMenuOpen(false)}>
                      <div className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer" data-testid="menu-find-parking">
                        <Search className="w-5 h-5 text-accent" />
                        <span className="text-card-foreground font-medium">{t.menuFindParking}</span>
                      </div>
                    </Link>
                    <div
                      onClick={() => { setMenuOpen(false); handleListSpotClick(); }}
                      className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer"
                      data-testid="menu-list-parking"
                    >
                      <PlusCircle className="w-5 h-5 text-accent" />
                      <span className="text-card-foreground font-medium">{t.menuListParking}</span>
                    </div>
                    <div
                      onClick={() => { setMenuOpen(false); handleSellClick(); }}
                      className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer"
                      data-testid="menu-sell-listing"
                    >
                      <Tag className="w-5 h-5 text-accent" />
                      <span className="text-card-foreground font-medium">{t.menuSellListing}</span>
                    </div>
                    <div className="h-px bg-border mx-4 my-1" />
                    {isAuthenticated ? (
                      <>
                        <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                          <div className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer" data-testid="menu-my-account">
                            <LayoutDashboard className="w-5 h-5 text-accent" />
                            <span className="text-card-foreground font-medium">{t.menuMyAccount}</span>
                          </div>
                        </Link>
                        <Link href="/dashboard?tab=profile" onClick={() => setMenuOpen(false)}>
                          <div className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer" data-testid="menu-my-profile">
                            <UserIcon className="w-5 h-5 text-accent" />
                            <span className="text-card-foreground font-medium">{t.menuMyProfile}</span>
                          </div>
                        </Link>
                        <Link href="/dashboard?tab=bookings" onClick={() => setMenuOpen(false)}>
                          <div className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer" data-testid="menu-reservations">
                            <CalendarDays className="w-5 h-5 text-accent" />
                            <span className="text-card-foreground font-medium">{t.menuReservations}</span>
                          </div>
                        </Link>
                      </>
                    ) : (
                      <div
                        onClick={() => { setMenuOpen(false); setShowLoginDialog(true); }}
                        className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer"
                        data-testid="menu-login"
                      >
                        <LogIn className="w-5 h-5 text-accent" />
                        <span className="text-card-foreground font-medium">{t.menuLogin}</span>
                      </div>
                    )}
                    <div className="h-px bg-border mx-4 my-1" />
                    <div
                      onClick={() => scrollToSection('za-koga')}
                      className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer"
                      data-testid="menu-who-is-for"
                    >
                      <Info className="w-5 h-5 text-accent" />
                      <span className="text-card-foreground font-medium">{t.menuWhoIsThisFor}</span>
                    </div>
                    <div
                      onClick={() => scrollToSection('kako-funkcionise')}
                      className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer"
                      data-testid="menu-how-it-works"
                    >
                      <Zap className="w-5 h-5 text-accent" />
                      <span className="text-card-foreground font-medium">{t.menuHowItWorks}</span>
                    </div>
                    <Link href="/smestaji" onClick={() => setMenuOpen(false)}>
                      <div className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer" data-testid="menu-accommodations">
                        <Hotel className="w-5 h-5 text-accent" />
                        <span className="text-card-foreground font-medium">{t.menuAccommodations}</span>
                      </div>
                    </Link>
                    <div
                      onClick={() => scrollToSection('cenovnik')}
                      className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer"
                      data-testid="menu-pricing"
                    >
                      <CreditCard className="w-5 h-5 text-accent" />
                      <span className="text-card-foreground font-medium">{t.menuPricing}</span>
                    </div>
                    <div
                      onClick={() => scrollToSection('kontakt')}
                      className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer"
                      data-testid="menu-contact"
                    >
                      <Mail className="w-5 h-5 text-accent" />
                      <span className="text-card-foreground font-medium">{t.menuContact}</span>
                    </div>
                    <div className="h-px bg-border mx-4 my-1" />
                    {languageOptions.map((lang) => (
                      <div
                        key={lang.code}
                        onClick={() => selectLanguage(lang.code)}
                        className={`flex items-center gap-3 px-6 py-2.5 cursor-pointer hover-elevate ${language === lang.code ? "bg-accent/10" : ""}`}
                        data-testid={`lang-${lang.code}`}
                      >
                        <span className="text-base">{lang.flag}</span>
                        <span className="text-card-foreground text-sm font-medium flex-1">{lang.label}</span>
                        {language === lang.code && <Check className="w-4 h-4 text-accent" />}
                      </div>
                    ))}
                    <div
                      onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); setMenuOpen(false); }}
                      className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer"
                      data-testid="menu-theme"
                    >
                      {theme === "dark" ? (
                        <Sun className="w-5 h-5 text-accent" />
                      ) : (
                        <Moon className="w-5 h-5 text-accent" />
                      )}
                      <span className="text-card-foreground font-medium">
                        {theme === "dark" ? t.menuLightMode : t.menuDarkMode}
                      </span>
                    </div>
                  </nav>
                </div>
              )}
            </div>
            </div>

            {/* Center: Logo */}
            <Link href="/" className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
              <img src={parkInLogo} alt="CarDrop" className="w-10 h-10 rounded-lg" />
              <span className="text-xl font-bold text-white drop-shadow-lg">CarDrop</span>
            </Link>

            <div aria-hidden="true" />
          </div>
        </div>
      </header>
      {/* Hero Section - Image on top, content below */}
      <div className="relative">
        {/* Hero Image Area - light overlay for bright sunny feel */}
        <div className="relative h-[50vh] min-h-[320px] md:h-[55vh] md:min-h-[400px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/20 z-10" />
          <img 
            src={heroImage} 
            alt="Woman driving a car" 
            className="w-full h-full object-cover brightness-110"
          />
        </div>

        {/* Action Buttons – Pronađi, Iznajmi, Prodaja */}
        <div className="relative z-10 bg-background px-4 pt-5 pb-5">
          <div className="max-w-xl mx-auto flex flex-col gap-3">
            <Link href="/map-hack" className="w-full">
              <button
                data-testid="button-find-spot-hero"
                className="w-full flex items-center gap-3 rounded-md bg-green-700 hover:bg-green-600 active:bg-green-800 transition-colors px-4 py-3 text-white shadow-sm"
              >
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 flex flex-col items-center text-center gap-0.5">
                  <span className="font-bold text-xl leading-tight">{t.findSpotButton}</span>
                  <span className="text-green-100 text-xs leading-snug">{t.findSpotSubtitle}</span>
                  <span className="text-white/80 text-sm font-semibold leading-tight mt-0.5">{t.findSpotBranding}</span>
                </div>
                <svg className="w-4 h-4 text-white/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </Link>
            <Button
              size="lg"
              className="w-full text-base py-5"
              data-testid="button-list-spot-hero"
              onClick={handleListSpotClick}
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              {t.listSpotButton}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full text-base py-5"
              data-testid="button-my-reservations-hero"
              onClick={() => isAuthenticated ? setLocation("/dashboard?tab=bookings") : setLocation("/auth")}
            >
              <CalendarDays className="w-5 h-5 mr-2" />
              {t.myReservations}
            </Button>

            <div className="grid grid-cols-2 gap-3" data-testid="install-instructions">
              <a
                href="https://play.google.com/store/apps/details?id=cardrop.app"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-google-play"
                className="rounded-md flex items-center justify-center p-2 border border-border/50"
              >
                <img
                  src={googlePlayBadgeImg}
                  alt="Get it on Google Play"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </a>
              <button
                type="button"
                onClick={() => setShowIosModal(true)}
                data-testid="button-install-iphone"
                className={`rounded-md flex flex-col items-center justify-center p-2 gap-1.5 transition-all hover-elevate cursor-pointer ${isIos ? "border-2 border-accent" : "border border-border/50"}`}
              >
                {/* App Store badge placeholder — styled to match Google Play badge weight */}
                <div className={`w-full rounded flex items-center justify-center gap-2 px-3 py-2 ${isIos ? "bg-foreground" : "bg-foreground/80"}`}>
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-background flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div className="flex flex-col items-start">
                    <span className="text-background text-[9px] leading-tight font-normal">
                      {language === "sr" ? "Uskoro na" : "Coming soon to"}
                    </span>
                    <span className="text-background text-sm font-semibold leading-tight">App Store</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight text-center">
                  {language === "sr" ? "Tapni za Safari uputstvo" : "Tap for Safari guide"}
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Content Below Image */}
        <div className="relative z-10 bg-background px-6 pt-8 md:pt-14 pb-10 md:pb-14">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
              {/* Left: Text */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 md:mb-5 leading-tight">
                  {t.heroTitle}
                </h1>
                <p className="text-base md:text-lg text-muted-foreground mb-8 md:mb-10 max-w-2xl leading-relaxed">
                  {t.heroSubtitle}
                </p>
              </div>

              {/* Right: Phone with GPS map image */}
              <div className="hidden md:block flex-shrink-0">
                <img 
                  src={phoneGpsImage} 
                  alt="GPS navigation on phone" 
                  className="w-[320px] h-auto rounded-md object-cover"
                  data-testid="img-phone-gps"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Who Is This For Section */}
      <div id="za-koga" className="py-20 md:py-24 px-6 bg-gradient-to-b from-card/30 to-background scroll-mt-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-16 md:mb-20 text-foreground">
            {t.whoIsThisFor}
          </h2>
          
          <div className="mb-20">
            <h3 className="text-xl md:text-2xl font-semibold mb-10 text-foreground text-center">
              {t.whoCanRent}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-6">
              {[
                { icon: Home, label: t.categoryPrivate, image: categoryPrivateImg, link: "/select-category" },
                { icon: Building2, label: t.categoryCompany, image: categoryCompanyImg, link: "/select-category" },
                { icon: Truck, label: t.categoryTruck, image: categoryTruckImg, link: "/select-category" },
                { icon: Users, label: t.categoryResidential, image: categoryResidentialImg, link: "/select-category" },
                { icon: Car, label: t.categoryCarLot, image: categoryCarlotImg, link: "/select-category" },
                { icon: Tag, label: t.categorySale, image: categorySaleImg, link: "/add-sale" },
              ].map((item, index) => (
                <div 
                  key={index} 
                  className="cursor-pointer"
                  onClick={() => handleProtectedAction(item.link)}
                  data-testid={`card-category-${index}`}
                >
                  <Card className="overflow-hidden hover-elevate group h-full">
                    <div className="aspect-[4/3] relative overflow-hidden">
                      <img 
                        src={item.image} 
                        alt={item.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center flex-shrink-0">
                            <item.icon className="w-4 h-4 text-[hsl(var(--primary))]" />
                          </div>
                          <span className="text-white text-xs md:text-sm font-semibold leading-tight drop-shadow-md">{item.label}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-border mb-20" />

          <div>
            <h3 className="text-xl md:text-2xl font-semibold mb-6 text-foreground text-center">
              {t.whoCanReserve}
            </h3>
            <p className="text-center text-lg md:text-xl font-bold text-accent mb-8">
              {t.everyoneWhoNeeds}
            </p>
            <p className="text-center text-muted-foreground max-w-3xl mx-auto mb-12 text-base md:text-lg leading-relaxed">
              {t.reserveDescription}
            </p>
            
            <div className="flex flex-col md:flex-row justify-center gap-6 md:gap-8 max-w-5xl mx-auto">
              <Card className="flex-1 p-6 md:p-8 border-2 border-border hover-elevate" data-testid="card-short-term">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-lg md:text-xl font-semibold text-foreground">{t.shortTerm}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">{t.shortTermDesc}</p>
                  </div>
                </div>
                <div className="space-y-2.5 mt-5">
                  {t.shortTermExamples.map((example: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-foreground">{example}</span>
                    </div>
                  ))}
                </div>
              </Card>
              
              <Card className="flex-1 p-6 md:p-8 border-2 border-border hover-elevate" data-testid="card-long-term">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-lg md:text-xl font-semibold text-foreground">{t.longTerm}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">{t.longTermDesc}</p>
                  </div>
                </div>
                <div className="space-y-2.5 mt-5">
                  {t.longTermExamples.map((example: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-foreground">{example}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
      {/* How It Works Section */}
      <div id="kako-funkcionise" className="py-20 md:py-24 px-6 max-w-7xl mx-auto scroll-mt-16">
        <h2 className="text-2xl md:text-4xl font-bold text-center mb-10 md:mb-12 text-foreground">
          {t.howItWorks}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <Card 
            className="p-6 hover-elevate bg-primary border-primary-border cursor-pointer"
            onClick={handleListSpotClick}
            data-testid="card-how-to-rent"
          >
            <div className="w-12 h-12 rounded-lg bg-accent/30 flex items-center justify-center mb-4">
              <PlusCircle className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-4 text-primary-foreground">
              {t.rentOutTitle}
            </h3>
            <ul className="space-y-3 text-primary-foreground/80">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-accent">1.</span>
                <span>{t.rentOutStep1}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-accent">2.</span>
                <span>{t.rentOutStep2}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-accent">3.</span>
                <span>{t.rentOutStep3}</span>
              </li>
            </ul>
          </Card>

          <Link href="/map-hack">
            <Card 
              className="p-6 hover-elevate bg-primary border-primary-border cursor-pointer h-full"
              data-testid="card-how-to-reserve"
            >
              <div className="w-12 h-12 rounded-lg bg-accent/30 flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-primary-foreground">
                {t.reserveTitle}
              </h3>
              <ul className="space-y-3 text-primary-foreground/80">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-accent">1.</span>
                  <span>{t.reserveStep1}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-accent">2.</span>
                  <span>{t.reserveStep2}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-accent">3.</span>
                  <span>{t.reserveStep3}</span>
                </li>
              </ul>
            </Card>
          </Link>
        </div>
      </div>
      {/* Recommended Accommodations Section */}
      <div id="smestaji" className="py-20 md:py-24 px-6 max-w-7xl mx-auto scroll-mt-16">
        <h2 className="text-2xl md:text-4xl font-bold text-center mb-3 text-foreground">
          {t.accommodationsTitle}
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
          {t.accommodationsSubtitle}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
          {[
            { city: 'novi-sad', label: t.accommodationsNoviSad, img: cityNoviSadImg },
            { city: 'beograd',  label: t.accommodationsBeograd, img: cityBeogradImg },
            { city: 'nis',      label: t.accommodationsNis,     img: cityNisImg },
          ].map(({ city, label, img }) => (
            <Link key={city} href={`/smestaji/${city}`}>
              <div
                className="relative rounded-md overflow-hidden cursor-pointer group h-44"
                data-testid={`card-city-${city}`}
              >
                <img
                  src={img}
                  alt={label}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                  <span className="text-white font-bold text-lg leading-tight">{label}</span>
                  <span className="text-white/80 text-xs">{t.accommodationsExplore} →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Pricing Section */}
      <div id="cenovnik" className="py-20 md:py-24 px-6 bg-gradient-to-b from-card/30 to-background scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-4 text-foreground" data-testid="text-pricing-title">
            {t.pricingTitle}
          </h2>
          <p className="text-center text-muted-foreground mb-12 md:mb-16 max-w-2xl mx-auto">
            {t.pricingSubtitle}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {PRICING_PLANS.map((plan) => {
              const isStandard = plan.tier === 'standard';
              const isSilver = plan.tier === 'silver';
              const isGold = plan.tier === 'gold';

              return (
                <Card
                  key={plan.id}
                  className={`relative p-6 md:p-8 flex flex-col ${
                    isGold
                      ? 'bg-gradient-to-br from-[#DAA520] via-[#FFD700] to-[#B8860B] border-2 border-[#DAA520] shadow-[0_0_20px_rgba(218,165,32,0.4)]'
                      : isSilver
                        ? 'bg-gradient-to-br from-[#C0C0C0] via-[#E8E8E8] to-[#A8A9AD] border-2 border-[#A8A9AD] shadow-[0_0_20px_rgba(168,169,173,0.4)]'
                        : 'border border-border'
                  }`}
                  data-testid={`card-pricing-${plan.id}`}
                >
                  {isGold && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-white text-[#B8860B] border-0 font-bold no-default-hover-elevate no-default-active-elevate">
                        <Crown className="w-3 h-3 mr-1" />
                        {t.pricingBestValue}
                      </Badge>
                    </div>
                  )}
                  {isSilver && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-white text-[#555] border-0 font-bold no-default-hover-elevate no-default-active-elevate">
                        <Star className="w-3 h-3 mr-1" />
                        {t.pricingMostPopular}
                      </Badge>
                    </div>
                  )}

                  <div className="text-center mb-6 mt-2">
                    <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${
                      isGold
                        ? 'bg-white/20'
                        : isSilver
                          ? 'bg-white/30'
                          : 'bg-accent/20'
                    }`}>
                      {isGold ? (
                        <Crown className="w-7 h-7 text-white" />
                      ) : isSilver ? (
                        <Star className="w-7 h-7 text-[#333]" />
                      ) : (
                        <Check className="w-7 h-7 text-accent" />
                      )}
                    </div>
                    <h3 className={`text-2xl font-bold mb-2 ${
                      isGold
                        ? 'text-white'
                        : isSilver
                          ? 'text-[#1a1a1a]'
                          : 'text-foreground'
                    }`}>
                      {language === 'sr' ? plan.name : plan.nameEn}
                    </h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className={`text-3xl md:text-4xl font-bold ${
                        isGold
                          ? 'text-white'
                          : isSilver
                            ? 'text-[#1a1a1a]'
                            : 'text-foreground'
                      }`}>
                        {plan.price === 0 ? t.pricingFree : `${plan.price} RSD`}
                      </span>
                    </div>
                    {plan.price > 0 && (
                      <p className={`text-sm mt-1 ${isGold ? 'text-white/70' : isSilver ? 'text-[#444]' : 'text-muted-foreground'}`}>{t.pricingPerListing}</p>
                    )}
                    {plan.price > 0 && (
                      <p className="text-xs text-center mt-1 text-muted-foreground">
                        + <span style={{ color: "#635bff", fontWeight: 700 }}>Stripe</span> naknada
                      </p>
                    )}
                  </div>

                  <div className="flex-1 mb-6">
                    <ul className="space-y-3">
                      {plan.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            isGold
                              ? 'text-white'
                              : isSilver
                                ? 'text-[#333]'
                                : 'text-accent'
                          }`} />
                          <span className={`text-sm ${isGold ? 'text-white/90' : isSilver ? 'text-[#222]' : 'text-card-foreground'}`}>
                            {language === 'sr' ? benefit.sr : benefit.en}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      className={`w-full ${
                        isGold
                          ? 'bg-white text-[#B8860B] border-0 hover:bg-white/90'
                          : isSilver
                            ? 'bg-white text-[#555] border-0 hover:bg-white/90'
                            : ''
                      }`}
                      variant={isStandard ? 'outline' : 'default'}
                      onClick={handleListSpotClick}
                      data-testid={`button-rent-plan-${plan.id}`}
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      {t.listSpotButton}
                    </Button>
                    <Button
                      className={`w-full ${
                        isGold
                          ? 'bg-white/20 text-white border border-white/40 hover:bg-white/30'
                          : isSilver
                            ? 'bg-white/30 text-[#333] border border-[#999]/40 hover:bg-white/50'
                            : ''
                      }`}
                      variant={isStandard ? 'outline' : 'default'}
                      onClick={() => isAuthenticated ? setLocation("/dashboard?tab=bookings") : setLocation("/auth")}
                      data-testid={`button-my-reservations-plan-${plan.id}`}
                    >
                      <CalendarDays className="w-4 h-4 mr-2" />
                      {t.myReservations}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-3 mt-10" data-testid="stripe-trust-pricing">
            <div className="flex items-center gap-3 px-6 py-3 rounded-md bg-card border border-border">
              <Shield className="w-5 h-5 text-[#635BFF]" />
              <span className="text-base text-foreground font-medium">
                {language === 'sr' ? 'Sigurna plaćanja preko' : 'Secure payments via'}
              </span>
              <span className="text-2xl font-extrabold text-[#635BFF] leading-none tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Stripe</span>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {language === 'sr' 
                ? 'Sigurna plaćanja preko Stripe-a. Sva plaćanja su zaštićena SSL enkripcijom i obrađena od strane vodećeg svetskog platnog procesora.'
                : 'Secure payments via Stripe. All payments are SSL encrypted and processed by the world\'s leading payment processor.'}
            </p>
          </div>
        </div>
      </div>

      {/* Map Hack NS Pricing Section */}
      <div id="map-hack-pricing" className="py-20 md:py-24 px-6 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col items-center gap-3 mb-4">
            <Badge variant="secondary" className="text-sm font-semibold px-4 py-1 no-default-hover-elevate no-default-active-elevate" data-testid="badge-map-hack-only">
              {t.mapHackBadge}
            </Badge>
            <h2 className="text-2xl md:text-4xl font-bold text-center text-foreground" data-testid="text-map-hack-pricing-title">
              {t.mapHackTitle}
            </h2>
          </div>
          <p className="text-center text-muted-foreground mb-12 md:mb-16 max-w-2xl mx-auto">
            {t.mapHackSubtitle}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* FREE */}
            <div
              className="p-6 flex flex-col rounded-md"
              data-testid="card-mh-pricing-free"
              style={{
                background: "linear-gradient(145deg, #0d1f0d 0%, #132613 60%, #1a3520 100%)",
                boxShadow: "0 4px 20px rgba(64,145,108,0.15)",
                border: "1px solid rgba(82,183,136,0.2)",
              }}
            >
              <div className="mb-4">
                <span className="text-lg font-bold text-green-300">{t.mapHackFreeLabel}</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold text-white">0</span>
                  <span className="text-sm text-green-400">RSD</span>
                </div>
                <p className="text-xs text-green-500/80 mt-0.5">{language === 'sr' ? 'Zauvek besplatno' : 'Forever free'}</p>
              </div>
              <p className="text-xs text-green-500/80 mb-4">{t.mapHackFreeDesc}</p>
              <ul className="space-y-2 flex-1 mb-5">
                {t.mapHackFreeFeatures.map((f: string) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-green-200">
                    <Check className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/map-hack">
                <button
                  className="w-full rounded-md py-2 text-sm font-bold"
                  style={{ background: "rgba(82,183,136,0.15)", color: "#52B788", border: "1px solid rgba(82,183,136,0.35)" }}
                  data-testid="button-mh-free-cta"
                >
                  {t.mapHackCTA}
                </button>
              </Link>
            </div>
            {/* PREMIUM */}
            <div
              className="p-6 flex flex-col relative rounded-md"
              data-testid="card-mh-pricing-premium"
              style={{
                background: "linear-gradient(145deg, #B8860B 0%, #DAA520 45%, #FFD700 100%)",
                boxShadow: "0 4px 20px rgba(218,165,32,0.4)",
              }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-yellow-950 text-yellow-300 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide whitespace-nowrap">
                  {t.mapHackPremiumBadge}
                </span>
              </div>
              <div className="mb-4 mt-1">
                <span className="text-lg font-bold text-yellow-950">{t.mapHackPremiumLabel}</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold text-yellow-950">390</span>
                  <span className="text-sm text-yellow-800">RSD{t.mapHackPerMonth}</span>
                </div>
                <p className="text-xs text-yellow-900/70 mt-0.5">{language === 'sr' ? 'Automatska obnova · otkazati u bilo kom trenutku' : 'Auto-renews · cancel anytime'}</p>
                <p className="text-xs text-yellow-900/60 mt-0.5">+ <span style={{ color: "#a5b4fc", fontWeight: 700 }}>Stripe</span> naknada</p>
              </div>
              <p className="text-xs text-yellow-900/70 mb-4">{t.mapHackPremiumDesc}</p>
              <ul className="space-y-2 flex-1 mb-5">
                {t.mapHackPremiumFeatures.map((f: string) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-yellow-950">
                    <Check className="w-3 h-3 text-yellow-950 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className="w-full rounded-md py-2 text-sm font-bold bg-yellow-950 text-yellow-300 hover:bg-yellow-900 transition-colors"
                data-testid="button-mh-premium-cta"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                {t.mapHackCTA}
              </button>
            </div>

            {/* DAY PASS */}
            <div
              className="p-6 flex flex-col rounded-md"
              data-testid="card-mh-pricing-daypass"
              style={{
                background: "linear-gradient(145deg, #7f1d1d 0%, #dc2626 55%, #ef4444 100%)",
                boxShadow: "0 4px 20px rgba(220,38,38,0.35)",
              }}
            >
              <div className="mb-4">
                <span className="text-lg font-bold text-white">{t.mapHackDayPassLabel}</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold text-white">120</span>
                  <span className="text-sm text-red-200">RSD / {t.mapHackPerDay}</span>
                </div>
                <p className="text-xs text-red-200 mt-0.5">{language === 'sr' ? 'Jednokratno plaćanje' : 'One-time payment'}</p>
                <p className="text-xs text-red-200/80 mt-0.5">+ <span style={{ color: "#a5b4fc", fontWeight: 700 }}>Stripe</span> naknada</p>
              </div>
              <p className="text-xs text-red-200 mb-4">{t.mapHackDayPassDesc}</p>
              <ul className="space-y-2 flex-1 mb-5">
                {t.mapHackPremiumFeatures.map((f: string) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-white">
                    <Check className="w-3 h-3 text-white flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className="w-full rounded-md py-2 text-sm font-bold bg-white/15 text-white border border-white/30 hover:bg-white/25 transition-colors"
                data-testid="button-mh-daypass-cta"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                {t.mapHackCTA}
              </button>
            </div>

            {/* GODIŠNJI */}
            <div
              className="p-6 flex flex-col rounded-md"
              data-testid="card-mh-pricing-annual"
              style={{
                background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 60%, #3730a3 100%)",
                boxShadow: "0 4px 20px rgba(67,56,202,0.35)",
              }}
            >
              <div className="mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-bold text-white">{t.mapHackAnnualLabel}</span>
                  <span className="bg-green-400 text-green-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    {t.mapHackAnnualBadge}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold text-white">3.500</span>
                  <span className="text-sm text-indigo-300">RSD{t.mapHackPerYear}</span>
                </div>
                <p className="text-xs text-indigo-300 mt-0.5">{language === 'sr' ? 'Automatska obnova · otkazati u bilo kom trenutku' : 'Auto-renews · cancel anytime'}</p>
                <p className="text-xs text-indigo-300/80 mt-0.5">+ <span style={{ color: "#a5b4fc", fontWeight: 700 }}>Stripe</span> naknada</p>
              </div>
              <p className="text-xs text-indigo-300 mb-4">{t.mapHackAnnualDesc}</p>
              <ul className="space-y-2 flex-1 mb-5">
                {t.mapHackPremiumFeatures.map((f: string) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-white">
                    <Check className="w-3 h-3 text-indigo-300 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className="w-full rounded-md py-2 text-sm font-bold bg-white/15 text-white border border-white/30 hover:bg-white/25 transition-colors"
                data-testid="button-mh-annual-cta"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                {t.mapHackCTA}
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-8">
            {language === 'sr'
              ? 'Plaćanje karticom putem Stripe. Premium i Godišnji plan se automatski obnavljaju — otkazati u bilo kom trenutku.'
              : 'Card payments via Stripe. Premium and Annual plans auto-renew — cancel anytime.'}
          </p>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-20 md:py-24 px-6 max-w-7xl mx-auto bg-card/30">
        <h2 className="text-2xl md:text-4xl font-bold text-center mb-10 md:mb-12 text-foreground">
          {language === "sr" ? "Šta Kažu Naši Korisnici" : "What Our Users Say"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <Card className="p-6 hover-elevate">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={testimonialMarko}
                alt="Marko P."
                className="w-12 h-12 rounded-full object-cover"
                data-testid="img-testimonial-marko"
              />
              <div>
                <p className="font-semibold text-card-foreground">Marko P.</p>
                <p className="text-sm text-muted-foreground">Beograd</p>
              </div>
            </div>
            <p className="text-card-foreground/90 italic">
              {language === "sr" 
                ? "\"Moje parking mesto je stajalo prazno 10 sati dnevno dok sam na poslu. Sada zarađujem 15.000 dinara mesečno bez ikakve muke.\""
                : "\"My parking spot was empty 10 hours a day while I was at work. Now I earn 15,000 dinars a month without any effort.\""}
            </p>
          </Card>

          <Card className="p-6 hover-elevate">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={testimonialAna}
                alt="Ana S."
                className="w-12 h-12 rounded-full object-cover"
                data-testid="img-testimonial-ana"
              />
              <div>
                <p className="font-semibold text-card-foreground">Ana S.</p>
                <p className="text-sm text-muted-foreground">Novi Sad</p>
              </div>
            </div>
            <p className="text-card-foreground/90 italic">
              {language === "sr" 
                ? "\"Više ne gubim 30 minuta tražeći parking u centru. Rezervišem unapred i znam tačno gde ću da parkiram.\""
                : "\"I no longer waste 30 minutes looking for parking downtown. I book in advance and know exactly where to park.\""}
            </p>
          </Card>

          <Card className="p-6 hover-elevate">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={testimonialNenad}
                alt="Nenad K."
                className="w-12 h-12 rounded-full object-cover"
                data-testid="img-testimonial-nenad"
              />
              <div>
                <p className="font-semibold text-card-foreground">Nenad K.</p>
                <p className="text-sm text-muted-foreground">Niš</p>
              </div>
            </div>
            <p className="text-card-foreground/90 italic">
              {language === "sr" 
                ? "\"Imam garažu koju nisam koristio godinama. CarDrop mi je pomogao da je pretvorim u izvor prihoda. Odlična platforma!\""
                : "\"I had a garage I hadn't used in years. CarDrop helped me turn it into an income source. Great platform!\""}
            </p>
          </Card>
        </div>
      </div>
      {/* Featured Locations Section */}
      <div className="py-20 md:py-24 px-6 max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-4xl font-bold text-center mb-10 md:mb-12 text-foreground">
          {t.popularLocations}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { name: "Beograd", nameEn: "Belgrade", image: cityBeogradImg },
            { name: "Novi Sad", nameEn: "Novi Sad", image: cityNoviSadImg },
            { name: "Niš", nameEn: "Niš", image: cityNisImg },
            { name: "Kragujevac", nameEn: "Kragujevac", image: cityKragujevacImg }
          ].map((city) => (
            <Link key={city.name} href="/map-hack">
              <Card className="hover-elevate cursor-pointer overflow-hidden">
                <div className="relative h-32 md:h-40">
                  <img
                    src={city.image}
                    alt={city.name}
                    className="w-full h-full object-cover"
                    data-testid={`img-city-${city.name.toLowerCase().replace(/\s/g, '-')}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <h3 className="absolute bottom-3 left-0 right-0 text-center text-xl md:text-2xl font-semibold text-white drop-shadow-lg">
                    {language === "sr" ? city.name : city.nameEn}
                  </h3>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
      {/* Trust Section */}
      <div className="py-16 md:py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-3 gap-4 md:gap-8 text-center">
          <div>
            <div className="text-2xl md:text-4xl font-bold text-accent mb-2">150+</div>
            <p className="text-xs md:text-base text-muted-foreground">{t.parkingSpots}</p>
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-bold text-accent mb-2">500+</div>
            <p className="text-xs md:text-base text-muted-foreground">{t.users}</p>
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-bold text-accent mb-2">2000+</div>
            <p className="text-xs md:text-base text-muted-foreground">{t.successfulBookings}</p>
          </div>
        </div>
      </div>
      {/* CTA Section */}
      <div className="py-20 md:py-24 px-6 bg-primary/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-6 text-foreground">
            {t.ctaTitle}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground mb-8 leading-relaxed">
            {t.ctaSubtitle}
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-6"
            data-testid="button-list-spot-cta"
            onClick={handleListSpotClick}
          >
            <Zap className="w-5 h-5 mr-2" />
            {t.listSpotButton}
          </Button>
        </div>
      </div>
      {/* Contact Section */}
      <div id="kontakt" className="py-20 md:py-24 px-6 scroll-mt-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-4 text-foreground" data-testid="text-contact-title">
            {t.contactTitle}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            {t.contactSubtitle}
          </p>
          <Card className="p-8">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-5">
              <Mail className="w-8 h-8 text-accent" />
            </div>
            <h3 className="font-semibold text-card-foreground text-lg mb-3">{t.contactEmail}</h3>
            <a href="mailto:info@cardropp.app" className="text-accent text-xl font-semibold" data-testid="link-contact-email">
              info@cardropp.app
            </a>
            <div className="flex items-center justify-center gap-5 mt-5">
              <a href="https://www.instagram.com/cardrop.app/" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80" data-testid="link-instagram">
                <SiInstagram className="w-8 h-8 text-[#E4405F]" />
              </a>
              <a href="https://www.facebook.com/profile.php?id=61584352366124" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80" data-testid="link-facebook">
                <SiFacebook className="w-8 h-8 text-[#1877F2]" />
              </a>
              <a href="https://www.tiktok.com/@cardrop.app" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80" data-testid="link-tiktok">
                <SiTiktok className="w-8 h-8 text-foreground" />
              </a>
            </div>
            <div className="flex items-center justify-center gap-2 mt-4 text-primary">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{t.contactResponseTime}</span>
            </div>
            <p className="text-muted-foreground text-sm mt-4 max-w-md mx-auto">
              {t.contactEncouragement}
            </p>
          </Card>
        </div>
      </div>
      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
            <Link href="/terms">
              <Button variant="ghost" className="text-muted-foreground" data-testid="link-terms">
                {t.termsButton}
              </Button>
            </Link>
            <span className="text-muted-foreground/40">|</span>
            <Link href="/privacy-policy">
              <Button variant="ghost" className="text-muted-foreground" data-testid="link-privacy">
                {t.privacyButton}
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-3 mb-4" data-testid="stripe-trust-footer">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-4 h-4 text-[#635BFF]" />
              <span className="text-sm">Powered by</span>
              <span className="text-lg font-extrabold text-[#635BFF] leading-none tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Stripe</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t.footerText}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Ai Me IT LLC is a US-registered company operating globally.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Registered address: 1209 Mountain Road Pl NE, Suite N, Albuquerque, NM 87110, USA</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Email: <a href="mailto:info@cardropp.app" className="underline hover:text-muted-foreground" data-testid="link-footer-email">info@cardropp.app</a>
          </p>
        </div>
      </footer>
      <LoginRequiredDialog
        open={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        redirectPath={loginRedirectPath}
      />
      <Dialog open={showIosModal} onOpenChange={setShowIosModal}>
        <DialogContent className="max-w-sm" data-testid="modal-ios-install">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-accent" />
              {language === "sr" ? "Instalacija na iPhone" : "Install on iPhone"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {language === "sr"
                ? "iOS ne podržava automatsku instalaciju. Pratite ove korake u Safari-ju:"
                : "iOS doesn't support automatic install. Follow these steps in Safari:"}
            </p>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">1</span>
                <p className="text-sm text-foreground pt-0.5">
                  {language === "sr" ? "Otvori ovu stranicu u " : "Open this page in "}
                  <strong>Safari</strong>
                  {language === "sr" ? " (ne Chrome ili drugi pretraživač)" : " (not Chrome or another browser)"}
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">2</span>
                <p className="text-sm text-foreground pt-0.5">
                  {language === "sr" ? "Tapni dugme za deljenje " : "Tap the Share button "}
                  <Share className="inline w-4 h-4 align-text-bottom text-accent" />
                  {language === "sr" ? " (na dnu ekrana)" : " (at the bottom of the screen)"}
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">3</span>
                <p className="text-sm text-foreground pt-0.5">
                  {language === "sr" ? "Izaberi " : "Select "}
                  <strong>{language === "sr" ? "\"Dodaj na početni ekran\"" : "\"Add to Home Screen\""}</strong>
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">4</span>
                <p className="text-sm text-foreground pt-0.5">
                  {language === "sr" ? "Tapni " : "Tap "}
                  <strong>{language === "sr" ? "\"Dodaj\"" : "\"Add\""}</strong>
                  {language === "sr" ? " u gornjem desnom uglu" : " in the top right corner"}
                </p>
              </li>
            </ol>
            <Button
              className="w-full mt-2"
              onClick={() => setShowIosModal(false)}
              data-testid="button-ios-modal-close"
            >
              {language === "sr" ? "Razumeo/la sam" : "Got it"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
