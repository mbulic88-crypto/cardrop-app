import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Clock, Shield, Zap, Globe } from "lucide-react";
import parkingImage from "@assets/stock_images/smartphone_mobile_ap_ab467bff.jpg";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";

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
    langButton: "ENG"
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
    langButton: "SRP"
  }
};

export default function Landing() {
  const [language, setLanguage] = useState<"sr" | "en">("sr");
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

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
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-8">
            ParkIN
          </h1>
          <p className="text-2xl md:text-3xl text-foreground/90 mb-4 max-w-2xl mx-auto">
            {t.heroTitle}
          </p>
          <p className="text-lg md:text-xl text-foreground/80 mb-8 max-w-2xl mx-auto">
            {t.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16 px-4 max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
          {t.howItWorks}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

      {/* Featured Locations Section */}
      <div className="py-16 px-4 max-w-7xl mx-auto bg-card/30">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
          {t.popularLocations}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
      <div className="py-16 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-accent mb-2">150+</div>
            <p className="text-muted-foreground">{t.parkingSpots}</p>
          </div>
          <div>
            <div className="text-4xl font-bold text-accent mb-2">500+</div>
            <p className="text-muted-foreground">{t.users}</p>
          </div>
          <div>
            <div className="text-4xl font-bold text-accent mb-2">2000+</div>
            <p className="text-muted-foreground">{t.successfulBookings}</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 px-4 bg-primary/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
            {t.ctaTitle}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
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
      />
    </div>
  );
}
