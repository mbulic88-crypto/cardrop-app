import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Clock, Shield, Zap } from "lucide-react";
import parkingImage from "@assets/stock_images/smartphone_mobile_ap_ab467bff.jpg";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
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
            ParkShare
          </h1>
          <p className="text-2xl md:text-3xl text-foreground/90 mb-4 max-w-2xl mx-auto">
            Pronađite ili Podelite Parking u Novom Sadu
          </p>
          <p className="text-lg md:text-xl text-foreground/80 mb-8 max-w-2xl mx-auto">
            Brza, sigurna i jednostavna rezervacija parking mesta. Iznajmite neiskorišćeno mesto i zaradite.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/home">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6"
                data-testid="button-login-hero"
              >
                Pronađite Vaše Mesto
              </Button>
            </Link>
            <Link href="/add-spot">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6"
                data-testid="button-list-spot-hero"
              >
                Iznajmite Vaše Mesto
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16 px-4 max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
          Kako Funkcioniše
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-6 hover-elevate bg-primary border-primary-border">
            <div className="w-12 h-12 rounded-lg bg-accent/30 flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-primary-foreground">
              1. Pronađite Parking
            </h3>
            <p className="text-primary-foreground/80">
              Pretražite dostupna parking mesta na mapi prema lokaciji, ceni i vremenskom periodu.
            </p>
          </Card>

          <Card className="p-6 hover-elevate bg-primary border-primary-border">
            <div className="w-12 h-12 rounded-lg bg-accent/30 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-primary-foreground">
              2. Rezervišite Brzo
            </h3>
            <p className="text-primary-foreground/80">
              Izaberite željene datume i vreme, rezervišite trenutno i sigurno platite preko Monri sistema.
            </p>
          </Card>

          <Card className="p-6 hover-elevate bg-primary border-primary-border">
            <div className="w-12 h-12 rounded-lg bg-accent/30 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-primary-foreground">
              3. Parkirajte Bezbrižno
            </h3>
            <p className="text-primary-foreground/80">
              Dobijte potvrdu rezervacije i upute kako doći do parking mesta. Sve sigurno i zaštićeno.
            </p>
          </Card>
        </div>
      </div>

      {/* Featured Locations Section */}
      <div className="py-16 px-4 max-w-7xl mx-auto bg-card/30">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
          Popularne Lokacije
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: "Centar", spots: "45+", avgPrice: "150" },
            { name: "Liman", spots: "32+", avgPrice: "120" },
            { name: "Grbavica", spots: "28+", avgPrice: "100" }
          ].map((location) => (
            <Card key={location.name} className="p-6 hover-elevate cursor-pointer">
              <h3 className="text-2xl font-semibold mb-2 text-card-foreground">
                {location.name}
              </h3>
              <p className="text-muted-foreground mb-4">
                {location.spots} dostupnih mesta
              </p>
              <p className="text-accent font-semibold text-lg">
                od {location.avgPrice} RSD/sat
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Trust Section */}
      <div className="py-16 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-accent mb-2">150+</div>
            <p className="text-muted-foreground">Parking Mesta</p>
          </div>
          <div>
            <div className="text-4xl font-bold text-accent mb-2">500+</div>
            <p className="text-muted-foreground">Korisnika</p>
          </div>
          <div>
            <div className="text-4xl font-bold text-accent mb-2">2000+</div>
            <p className="text-muted-foreground">Uspešnih Rezervacija</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 px-4 bg-primary/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
            Imate Neiskorišćeno Parking Mesto?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Zaradite deljenjem svog parking prostora sa drugim vozačima. Jednostavno, sigurno, profitabilno.
          </p>
          <Link href="/add-spot">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6"
              data-testid="button-list-spot-cta"
            >
              <Zap className="w-5 h-5 mr-2" />
              Iznajmite Vaše Mesto
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 ParkShare Novi Sad. Sva prava zadržana.</p>
        </div>
      </footer>
    </div>
  );
}
