import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Clock, Shield, Zap, Globe, Download } from "lucide-react";
import parkingImage from "@assets/stock_images/smartphone_mobile_ap_ab467bff.jpg";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import { usePWA } from "@/hooks/use-pwa";

const translations = {
  sr: {
    heroTitle: "Pronađite ili Podelite Parking Mesto",
    heroSubtitle: "Brza, sigurna i jednostavna rezervacija parking mesta. Iznajmite neiskorišćeno mesto i zaradite.",
    findSpotButton: "Pronađite Vaše Mesto",
    listSpotButton: "Iznajmite Vaše Mesto",
    howItWorks: "Kako Funkcioniše",
    step1Title: "1. Pronađite Parking",
    step1Desc: "Pretražite dostupna parking mesta na mapi prema lokaciji, ceni i vremenskom periodu.",
    step2Title: "2. Rezervišite Brzo",
    step2Desc: "Izaberite željene datume i vreme, rezervišite trenutno i sigurno platite preko Monri sistema.",
    step3Title: "3. Parkirajte Bezbrižno",
    step3Desc: "Dobijte potvrdu rezervacije i upute kako doći do parking mesta. Sve sigurno i zaštićeno.",
    popularLocations: "Popularne Destinacije",
    parkingSpots: "Parking Mesta",
    users: "Korisnika",
    successfulBookings: "Uspešnih Rezervacija",
    ctaTitle: "Imate Neiskorišćeno Parking Mesto?",
    ctaSubtitle: "Zaradite deljenjem svog parking prostora sa drugim vozačima. Jednostavno, sigurno, profitabilno.",
    termsButton: "Uslovi Korišćenja",
    footerText: "© 2024 ParkIN Srbija. Sva prava zadržana.",
    langButton: "ENG",
    installApp: "Instaliraj Aplikaciju"
  },
  en: {
    heroTitle: "Find or Share a Parking Spot",
    heroSubtitle: "Fast, secure, and simple parking reservations. Rent out your unused spot and earn.",
    findSpotButton: "Find Your Spot",
    listSpotButton: "List Your Spot",
    howItWorks: "How It Works",
    step1Title: "1. Find Parking",
    step1Desc: "Search available parking spots on the map by location, price, and time period.",
    step2Title: "2. Book Quickly",
    step2Desc: "Choose your desired dates and times, book instantly, and pay securely through Monri.",
    step3Title: "3. Park Worry-Free",
    step3Desc: "Get booking confirmation and directions to the parking spot. Everything safe and secure.",
    popularLocations: "Popular Destinations",
    parkingSpots: "Parking Spots",
    users: "Users",
    successfulBookings: "Successful Bookings",
    ctaTitle: "Have an Unused Parking Spot?",
    ctaSubtitle: "Earn by sharing your parking space with other drivers. Simple, secure, profitable.",
    termsButton: "Terms of Use",
    footerText: "© 2024 ParkIN Serbia. All rights reserved.",
    langButton: "SRP",
    installApp: "Install App"
  }
};

export default function Landing() {
  const [language, setLanguage] = useState<"sr" | "en">("sr");
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { isInstallable, installApp } = usePWA();

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

  const handleListSpotClick = () => {
    if (!isAuthenticated) {
      setShowLoginDialog(true);
    } else {
      setLocation("/add-spot");
    }
  };

  const t = translations[language];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-30 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <img src={parkInLogo} alt="ParkIN" className="w-10 h-10 rounded-lg" />
              <span className="text-xl font-bold text-foreground">ParkIN</span>
            </Link>

            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    data-testid="button-account"
                    className="bg-background/20 backdrop-blur-sm border-foreground/20 text-foreground hover:bg-background/30"
                  >
                    Moj Nalog
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  data-testid="button-login"
                  onClick={() => setShowLoginDialog(true)}
                  className="bg-background/20 backdrop-blur-sm border-foreground/20 text-foreground hover:bg-background/30"
                >
                  Prijavi se
                </Button>
              )}
              <Button
                variant="outline"
                data-testid="button-language"
                onClick={toggleLanguage}
                className="bg-background/20 backdrop-blur-sm border-foreground/20 text-foreground hover:bg-background/30"
              >
                <Globe className="w-4 h-4 mr-2" />
                <span>{t.langButton}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background z-10" />
        
        {/* Hero Background Image */}
        <div className="absolute inset-0">
          <img 
            src={parkingImage} 
            alt="Parking lot" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Hero Content */}
        <div className="relative z-20 text-center px-6 max-w-4xl mx-auto pt-24 pb-8">
          <h1 className="text-4xl md:text-7xl font-bold text-foreground mb-6 md:mb-8">
            ParkIN
          </h1>
          <p className="text-xl md:text-3xl text-foreground/90 mb-4 md:mb-6 max-w-2xl mx-auto leading-relaxed">
            {t.heroTitle}
          </p>
          <p className="text-base md:text-xl text-foreground/80 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">
            {t.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/home">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 w-full sm:w-auto"
                data-testid="button-find-spot-hero"
              >
                {t.findSpotButton}
              </Button>
            </Link>
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 w-full sm:w-auto"
              data-testid="button-list-spot-hero"
              onClick={handleListSpotClick}
            >
              {t.listSpotButton}
            </Button>
          </div>
          
          <div className="mt-8">
            <Button
              variant="outline"
              size="default"
              onClick={installApp}
              className="bg-accent/20 border-accent text-foreground hover:bg-accent/40"
              data-testid="button-install-app"
            >
              <Download className="w-5 h-5 mr-2" />
              {t.installApp}
            </Button>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 md:py-24 px-6 max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-4xl font-bold text-center mb-10 md:mb-12 text-foreground">
          {t.howItWorks}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <Card className="p-6 hover-elevate bg-primary border-primary-border">
            <div className="w-12 h-12 rounded-lg bg-accent/30 flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-primary-foreground">
              {t.step1Title}
            </h3>
            <p className="text-primary-foreground/80">
              {t.step1Desc}
            </p>
          </Card>

          <Card className="p-6 hover-elevate bg-primary border-primary-border">
            <div className="w-12 h-12 rounded-lg bg-accent/30 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-primary-foreground">
              {t.step2Title}
            </h3>
            <p className="text-primary-foreground/80">
              {t.step2Desc}
            </p>
          </Card>

          <Card className="p-6 hover-elevate bg-primary border-primary-border">
            <div className="w-12 h-12 rounded-lg bg-accent/30 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-primary-foreground">
              {t.step3Title}
            </h3>
            <p className="text-primary-foreground/80">
              {t.step3Desc}
            </p>
          </Card>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-20 md:py-24 px-6 max-w-7xl mx-auto bg-card/30">
        <h2 className="text-2xl md:text-4xl font-bold text-center mb-10 md:mb-12 text-foreground">
          {language === "sr" ? "Šta Kažu Naši Korisnici" : "What Our Users Say"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Testimonial 1 - Extra Income */}
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

          {/* Testimonial 2 - Parking Problem Solved */}
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

          {/* Testimonial 3 - Unused Space Monetized */}
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
                ? "\"Imam garažu koju nisam koristio godinama. ParkIN mi je pomogao da je pretvorim u izvor prihoda. Odlična platforma!\""
                : "\"I had a garage I hadn't used in years. ParkIN helped me turn it into an income source. Great platform!\""}
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
        redirectPath="/add-spot"
      />
    </div>
  );
}
