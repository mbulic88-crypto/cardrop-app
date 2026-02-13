import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Search, Zap, Globe, Download, Sun, Moon, PlusCircle, Home, Building2, Truck, Users, Car, Clock, CalendarDays, Menu, X, LogIn, LayoutDashboard, FileText } from "lucide-react";
import heroImage from "@assets/hero-female-driver_2.jpg";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import { usePWA } from "@/hooks/use-pwa";
import { useTheme } from "next-themes";

const translations = {
  sr: {
    heroTitle: "Pronađite ili Podelite Parking Mesto ili Garažu",
    heroSubtitle: "Brza, sigurna i jednostavna rezervacija parking mesta. Iznajmite neiskorišćeno mesto i zaradite.",
    findSpotButton: "Pronađite Vaše Parking Mesto",
    listSpotButton: "Iznajmite Vaše Parking Mesto",
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
    footerText: "© 2024 CarDrop Srbija. Sva prava zadržana.",
    langButton: "ENG",
    installApp: "Instaliraj Aplikaciju",
    whoIsThisFor: "Za Koga Je Ovo",
    whoCanRent: "Ko Može Da Iznajmi Parking",
    whoCanReserve: "Ko Može Da Rezerviše Parking",
    everyoneWhoNeeds: "Svi Kojima Je Potreban Parking",
    reserveDescription: "Bilo da vam treba parking na sat vremena dok ste u restoranu, na dan dok obavljate poslove u gradu, ili na mesec dana - CarDrop vam omogućava fleksibilnu rezervaciju po vašoj meri.",
    shortTerm: "Kratkoročno",
    shortTermDesc: "Restoran, šoping, sastanak, poseta lekaru",
    longTerm: "Dugoročno", 
    longTermDesc: "Nedelja, mesec, sezona - po povoljnijim cenama",
    categoryPrivate: "Privatni Parkinzi i Garaže",
    categoryCompany: "Firme",
    categoryTruck: "Stajalista za Kamione",
    categoryResidential: "Stambene Zajednice",
    categoryCarLot: "Auto Placevi",
    menuFindParking: "Pronađi Parking",
    menuListParking: "Iznajmi Parking",
    menuMyAccount: "Moj Nalog",
    menuLogin: "Prijavi Se",
    menuTerms: "Uslovi Korišćenja",
  },
  en: {
    heroTitle: "Find or Share a Parking Spot or Garage",
    heroSubtitle: "Fast, secure, and simple parking reservations. Rent out your unused spot and earn.",
    findSpotButton: "Find Your Parking Spot",
    listSpotButton: "List Your Parking Spot",
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
    footerText: "© 2024 CarDrop Serbia. All rights reserved.",
    langButton: "SRP",
    installApp: "Install App",
    whoIsThisFor: "Who Is This For",
    whoCanRent: "Who Can Rent Out Parking",
    whoCanReserve: "Who Can Reserve Parking",
    everyoneWhoNeeds: "Everyone Who Needs Parking",
    reserveDescription: "Whether you need parking for an hour while dining, for a day while running errands, or for a month - CarDrop offers flexible reservations tailored to your needs.",
    shortTerm: "Short-Term",
    shortTermDesc: "Restaurant, shopping, meeting, doctor visit",
    longTerm: "Long-Term",
    longTermDesc: "Week, month, season - at better rates",
    categoryPrivate: "Private Parking & Garages",
    categoryCompany: "Companies",
    categoryTruck: "Truck Stops",
    categoryResidential: "Residential Communities",
    categoryCarLot: "Car Lots",
    menuFindParking: "Find Parking",
    menuListParking: "List Parking",
    menuMyAccount: "My Account",
    menuLogin: "Log In",
    menuTerms: "Terms of Use",
  }
};

export default function Landing() {
  const [language, setLanguage] = useState<"sr" | "en">("sr");
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { isInstallable, installApp } = usePWA();
  const { theme, setTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("parkin-language");
    if (savedLanguage === "en" || savedLanguage === "sr") {
      setLanguage(savedLanguage);
    }
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

  const toggleLanguage = () => {
    const newLanguage = language === "sr" ? "en" : "sr";
    setLanguage(newLanguage);
    localStorage.setItem("parkin-language", newLanguage);
  };

  const handleListSpotClick = () => {
    if (!isAuthenticated) {
      setShowLoginDialog(true);
    } else {
      setLocation("/select-category");
    }
  };

  const t = translations[language];

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Hamburger Left, Logo Center, Controls Right */}
      <header className="absolute top-0 left-0 right-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Hamburger Menu */}
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

              {/* Dropdown Menu */}
              {menuOpen && (
                <div className="absolute top-12 left-0 w-64 bg-card border border-border rounded-md shadow-lg z-50">
                  <nav className="py-2">
                    <Link href="/home" onClick={() => setMenuOpen(false)}>
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
                    <div className="h-px bg-border mx-4 my-1" />
                    {isAuthenticated ? (
                      <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                        <div className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer" data-testid="menu-my-account">
                          <LayoutDashboard className="w-5 h-5 text-accent" />
                          <span className="text-card-foreground font-medium">{t.menuMyAccount}</span>
                        </div>
                      </Link>
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
                    <Link href="/terms" onClick={() => setMenuOpen(false)}>
                      <div className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer" data-testid="menu-terms">
                        <FileText className="w-5 h-5 text-accent" />
                        <span className="text-card-foreground font-medium">{t.menuTerms}</span>
                      </div>
                    </Link>
                  </nav>
                </div>
              )}
            </div>

            {/* Center: Logo */}
            <Link href="/" className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
              <img src={parkInLogo} alt="CarDrop" className="w-10 h-10 rounded-lg" />
              <span className="text-xl font-bold text-white">CarDrop</span>
            </Link>

            {/* Right: Language + Theme */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                data-testid="button-language"
                onClick={toggleLanguage}
                className="bg-black/30 backdrop-blur-sm border-white/30 text-white text-xs sm:text-sm"
              >
                <Globe className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden sm:inline">{t.langButton}</span>
                <span className="sm:hidden">{language === "sr" ? "EN" : "SR"}</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="bg-black/30 backdrop-blur-sm border-white/30 text-white"
                data-testid="button-theme-toggle"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Full Screen */}
      <div className="relative h-[100vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Dark wash gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 z-10" />
        
        {/* Hero Background Image */}
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Woman driving a car" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Hero Content */}
        <div className="relative z-20 text-center px-6 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-8xl font-bold text-white mb-6 md:mb-8 drop-shadow-lg">
            CarDrop
          </h1>
          <p className="text-xl md:text-3xl text-white/90 mb-4 md:mb-6 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            {t.heroTitle}
          </p>
          <p className="text-base md:text-xl text-white/80 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            {t.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
            <Link href="/home">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 w-full sm:w-auto shadow-lg"
                data-testid="button-find-spot-hero"
              >
                <Search className="w-5 h-5 mr-2" />
                {t.findSpotButton}
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 w-full sm:w-auto bg-black/30 backdrop-blur-sm border-white/40 text-white shadow-lg"
              data-testid="button-list-spot-hero"
              onClick={handleListSpotClick}
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              {t.listSpotButton}
            </Button>
          </div>
          
          <div className="mt-8">
            <Button
              size="lg"
              onClick={installApp}
              variant="outline"
              className="bg-accent/90 backdrop-blur-sm border-accent text-white shadow-lg text-base px-8 py-5 font-semibold"
              data-testid="button-install-app"
            >
              <Download className="w-5 h-5 mr-2" />
              {t.installApp}
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/50 flex items-start justify-center p-1">
            <div className="w-1.5 h-3 bg-white/70 rounded-full" />
          </div>
        </div>
      </div>

      {/* Who Is This For Section */}
      <div className="py-20 md:py-24 px-6 bg-gradient-to-b from-card/30 to-background">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-16 md:mb-20 text-foreground">
            {t.whoIsThisFor}
          </h2>
          
          {/* Who Can Rent Out */}
          <div className="mb-20">
            <h3 className="text-xl md:text-2xl font-semibold mb-10 text-foreground text-center">
              {t.whoCanRent}
            </h3>
            <div className="flex flex-wrap justify-center gap-8 md:gap-12">
              {[
                { icon: Home, label: t.categoryPrivate },
                { icon: Building2, label: t.categoryCompany },
                { icon: Truck, label: t.categoryTruck },
                { icon: Users, label: t.categoryResidential },
                { icon: Car, label: t.categoryCarLot },
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center text-center group w-28 md:w-32">
                  <div className="relative mb-4">
                    <svg viewBox="0 0 48 64" className="w-14 h-[72px] md:w-16 md:h-20 drop-shadow-lg group-hover:scale-105 transition-transform">
                      <defs>
                        <linearGradient id={`pinGradient${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="hsl(var(--primary))" />
                          <stop offset="100%" stopColor="hsl(var(--primary) / 0.8)" />
                        </linearGradient>
                      </defs>
                      <path 
                        d="M24 0C10.745 0 0 10.745 0 24c0 18 24 40 24 40s24-22 24-40C48 10.745 37.255 0 24 0z" 
                        fill={`url(#pinGradient${index})`}
                        stroke="hsl(var(--primary-foreground) / 0.3)"
                        strokeWidth="1"
                      />
                      <circle cx="24" cy="22" r="14" fill="white" />
                    </svg>
                    <div className="absolute top-2 md:top-2.5 left-1/2 -translate-x-1/2 flex items-center justify-center w-7 h-7 md:w-8 md:h-8">
                      <item.icon className="w-5 h-5 md:w-6 md:h-6 text-[hsl(var(--primary))]" />
                    </div>
                  </div>
                  <span className="text-sm md:text-base font-medium text-foreground leading-tight">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-border mb-20" />

          {/* Who Can Reserve */}
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
            
            <div className="flex flex-col md:flex-row justify-center gap-6 md:gap-12 max-w-4xl mx-auto">
              <Card className="flex-1 p-6 md:p-8 border-2 border-border hover-elevate">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="text-lg md:text-xl font-semibold text-foreground">{t.shortTerm}</h4>
                </div>
                <p className="text-muted-foreground">{t.shortTermDesc}</p>
              </Card>
              
              <Card className="flex-1 p-6 md:p-8 border-2 border-border hover-elevate">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                    <CalendarDays className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="text-lg md:text-xl font-semibold text-foreground">{t.longTerm}</h4>
                </div>
                <p className="text-muted-foreground">{t.longTermDesc}</p>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 md:py-24 px-6 max-w-7xl mx-auto">
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

          <Link href="/home">
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

      {/* Testimonials Section */}
      <div className="py-20 md:py-24 px-6 max-w-7xl mx-auto bg-card/30">
        <h2 className="text-2xl md:text-4xl font-bold text-center mb-10 md:mb-12 text-foreground">
          {language === "sr" ? "Šta Kažu Naši Korisnici" : "What Our Users Say"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <Card className="p-6 hover-elevate">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-xl font-bold text-accent">M</span>
              </div>
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
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-xl font-bold text-accent">A</span>
              </div>
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
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-xl font-bold text-accent">N</span>
              </div>
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
            { name: "Beograd", nameEn: "Belgrade" },
            { name: "Novi Sad", nameEn: "Novi Sad" },
            { name: "Niš", nameEn: "Niš" },
            { name: "Kragujevac", nameEn: "Kragujevac" }
          ].map((city) => (
            <Link key={city.name} href={`/home?search=${city.name}`}>
              <Card className="p-6 hover-elevate cursor-pointer text-center">
                <h3 className="text-2xl font-semibold text-card-foreground">
                  {language === "sr" ? city.name : city.nameEn}
                </h3>
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

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-4">
            <Link href="/terms">
              <Button variant="ghost" className="text-muted-foreground" data-testid="link-terms">
                {t.termsButton}
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground">{t.footerText}</p>
        </div>
      </footer>

      <LoginRequiredDialog
        open={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        redirectPath="/select-category"
      />
    </div>
  );
}
