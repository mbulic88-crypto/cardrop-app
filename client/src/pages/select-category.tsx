import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Globe } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";

const translations = {
  sr: {
    pageTitle: "Izaberite Kategoriju",
    pageSubtitle: "Odaberite tip parking mesta koje želite da iznajmite",
    homeButton: "Početna",
    langButton: "ENG",
    categoryPrivate: "Privatni Parkinzi i Garaže",
    categoryCompany: "Firme i Agencije",
    categoryTruck: "Stajališta za Kamione",
    categoryResidential: "Stambene Zajednice",
    categoryCarLot: "Auto Placevi",
    descPrivate: "Ako ste vlasnik privatnog parking mesta, garaže ili mesta za parkiranje, ovo je za vas!",
    descCompany: "Za kompanije, hotele, restorane i poslovne objekte koji imaju višak parking mesta - dodatna zarada!",
    descTruck: "Oglasite svoje stajalište i popunite prazna mesta!",
    descResidential: "Veliki parkinzi i garaže stambenih zajednica - iskoristite vaše mogućnosti maksimalno!",
    descCarLot: "Ako se nađe neko prazno mesto, pretvorite ga u pare - oglasite se na našoj platformi!",
    loginRequired: "Za dodavanje parking mesta potrebna je prijava na nalog.",
  },
  en: {
    pageTitle: "Select Category",
    pageSubtitle: "Choose the type of parking spot you want to rent out",
    homeButton: "Home",
    langButton: "SRP",
    categoryPrivate: "Private Parking & Garages",
    categoryCompany: "Companies & Agencies",
    categoryTruck: "Truck Stops",
    categoryResidential: "Residential Communities",
    categoryCarLot: "Car Lots",
    descPrivate: "If you own a private parking spot, garage or parking space, this is for you!",
    descCompany: "For companies, hotels, restaurants and businesses with extra parking spaces - extra income!",
    descTruck: "Advertise your truck stop and fill empty spots!",
    descResidential: "Large parking lots and garages of residential communities - maximize your potential!",
    descCarLot: "If you have an empty spot, turn it into cash - advertise on our platform!",
    loginRequired: "Login is required to add a parking spot.",
  }
};

const categories = [
  { id: "private", emoji: "🏠", labelKey: "categoryPrivate" as const, descKey: "descPrivate" as const },
  { id: "company", emoji: "🏢", labelKey: "categoryCompany" as const, descKey: "descCompany" as const },
  { id: "truck_stop", emoji: "🚚", labelKey: "categoryTruck" as const, descKey: "descTruck" as const },
  { id: "residential", emoji: "👥", labelKey: "categoryResidential" as const, descKey: "descResidential" as const },
  { id: "car_lot", emoji: "🚗", labelKey: "categoryCarLot" as const, descKey: "descCarLot" as const },
];

export default function SelectCategory() {
  const [language, setLanguage] = useState<"sr" | "en">("sr");
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const savedLanguage = localStorage.getItem("parkin-language");
    if (savedLanguage === "en" || savedLanguage === "sr") {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShowLoginDialog(true);
    }
  }, [isLoading, isAuthenticated]);

  const toggleLanguage = () => {
    const newLanguage = language === "sr" ? "en" : "sr";
    setLanguage(newLanguage);
    localStorage.setItem("parkin-language", newLanguage);
  };

  const handleCategoryClick = (categoryId: string) => {
    setLocation(`/add-spot?category=${categoryId}`);
  };

  const t = translations[language];

  return (
    <div className="min-h-screen bg-background">
      <LoginRequiredDialog 
        open={showLoginDialog} 
        onClose={() => setShowLoginDialog(false)}
        message={t.loginRequired}
        redirectPath="/select-category"
      />
      
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <img src={parkInLogo} alt="CarDrop" className="h-8 w-auto" />
              <span className="font-bold text-lg text-foreground hidden sm:inline">CarDrop</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="flex items-center gap-1"
              data-testid="button-language"
            >
              <Globe className="w-4 h-4" />
              {t.langButton}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {t.pageTitle}
          </h1>
          <p className="text-muted-foreground">
            {t.pageSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="p-6 cursor-pointer transition-all hover-elevate hover:ring-2 hover:ring-primary"
              onClick={() => handleCategoryClick(category.id)}
              data-testid={`card-category-${category.id}`}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="relative">
                  <svg viewBox="0 0 48 64" className="w-16 h-20 drop-shadow-lg">
                    <defs>
                      <linearGradient id={`catGradient${category.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                        <stop offset="100%" stopColor="hsl(var(--primary) / 0.8)" />
                      </linearGradient>
                    </defs>
                    <path 
                      d="M24 0C10.745 0 0 10.745 0 24c0 18 24 40 24 40s24-22 24-40C48 10.745 37.255 0 24 0z" 
                      fill={`url(#catGradient${category.id})`}
                      stroke="hsl(var(--primary-foreground) / 0.3)"
                      strokeWidth="1"
                    />
                    <circle cx="24" cy="22" r="14" fill="white" />
                  </svg>
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2">
                    <span className="text-2xl">{category.emoji}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="font-semibold text-foreground block">
                    {t[category.labelKey]}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {t[category.descKey]}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
