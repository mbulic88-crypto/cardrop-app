import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { MapPin, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";

export default function MapHackNS() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      localStorage.setItem("cardrop-returnTo", "/map-hack");
      setLocation("/auth");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-3 px-4 py-4 border-b">
        <Link href="/">
          <Button size="icon" variant="ghost" data-testid="button-back-home">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <img src={parkInLogo} alt="CarDrop" className="w-8 h-8 rounded-md" />
        <span className="font-bold text-foreground text-lg">Map Hack NS</span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <MapPin className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>

        <div className="flex flex-col gap-2 max-w-xs">
          <h1 className="text-2xl font-bold text-foreground">Map Hack NS</h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Interaktivna mapa Novog Sada sa štek parking mestima, crvenim zonama, live info i još mnogo toga.
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md px-5 py-4 max-w-xs w-full">
          <p className="text-green-700 dark:text-green-400 font-semibold text-sm">Uskoro dostupno</p>
          <p className="text-green-600 dark:text-green-500 text-sm mt-1">
            Prvi mesec besplatno za sve korisnike.
          </p>
        </div>

        <Link href="/">
          <Button variant="outline" data-testid="button-back-landing">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Nazad na početnu
          </Button>
        </Link>
      </div>
    </div>
  );
}
