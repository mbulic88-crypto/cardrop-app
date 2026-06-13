import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, MapPin, Trash2, Plus, Home as HomeIcon, Bookmark } from "lucide-react";
import { Link } from "wouter";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { useLanguage } from "@/hooks/useLanguage";

const mbt = {
  sr: {
    pageTitle: "Moje Rezervacije",
    pageDesc: "Zabeležite vašu rezervaciju da je ne zaboravite! Ovde možete ručno upisati informacije o parking mestu koje ste rezervisali - naziv parkinga, vreme i cenu. Sve rezervacije ostaju sačuvane kao vaš lični podsetnik.",
    addNew: "Dodaj Novu Rezervaciju",
    parkingName: "Naziv Parkinga *",
    parkingNamePlaceholder: "npr. Parking kod Terazija",
    date: "Datum",
    time: "Vreme",
    price: "Cena (RSD)",
    pricePlaceholder: "npr. 500",
    save: "Sačuvaj Rezervaciju",
    yourBookings: "Vaše Rezervacije",
    noBookings: "Još nemate sačuvanih rezervacija. Dodajte svoju prvu rezervaciju iznad.",
    dateLabel: "Datum",
    timeLabel: "Vreme",
    priceLabel: "Cena",
    notEntered: "Nije uneto",
    home: "Početna",
  },
  en: {
    pageTitle: "My Bookings",
    pageDesc: "Keep a record of your booking so you don't forget! Manually enter information about the parking spot you reserved — name, time and price. All bookings are saved as your personal reminder.",
    addNew: "Add New Booking",
    parkingName: "Parking Name *",
    parkingNamePlaceholder: "e.g. Parking near city center",
    date: "Date",
    time: "Time",
    price: "Price (RSD)",
    pricePlaceholder: "e.g. 500",
    save: "Save Booking",
    yourBookings: "Your Bookings",
    noBookings: "You have no saved bookings yet. Add your first booking above.",
    dateLabel: "Date",
    timeLabel: "Time",
    priceLabel: "Price",
    notEntered: "Not entered",
    home: "Home",
  },
};

interface ManualBooking {
  id: string;
  parkingName: string;
  date: string;
  time: string;
  price: string;
  createdAt: string;
}

interface MyBookingsProps {
  embedded?: boolean;
  [key: string]: any;
}

export default function MyBookings({ embedded = false, ...rest }: MyBookingsProps) {
  const { language } = useLanguage();
  const t = mbt[language === "sr" ? "sr" : "en"];
  const [bookings, setBookings] = useState<ManualBooking[]>([]);
  const [parkingName, setParkingName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("parkin-manual-bookings");
    if (saved) {
      setBookings(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("parkin-manual-bookings", JSON.stringify(bookings));
  }, [bookings]);

  const handleAddBooking = () => {
    if (!parkingName.trim()) return;

    const newBooking: ManualBooking = {
      id: Date.now().toString(),
      parkingName: parkingName.trim(),
      date: date || "",
      time: time || "",
      price: price || "",
      createdAt: new Date().toISOString(),
    };

    setBookings([newBooking, ...bookings]);
    setParkingName("");
    setDate("");
    setTime("");
    setPrice("");
  };

  const handleDeleteBooking = (id: string) => {
    setBookings(bookings.filter((b) => b.id !== id));
  };

  const content = (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Bookmark className="w-8 h-8 text-accent" />
          <h1 className="text-3xl font-bold text-foreground">{t.pageTitle}</h1>
        </div>
        <Card className="p-4 bg-accent/10 border-accent/30">
          <p className="text-card-foreground">{t.pageDesc}</p>
        </Card>
      </div>

      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
          <Plus className="w-5 h-5" />
          {t.addNew}
        </h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="parkingName" className="text-foreground">{t.parkingName}</Label>
            <Input
              id="parkingName"
              placeholder={t.parkingNamePlaceholder}
              value={parkingName}
              onChange={(e) => setParkingName(e.target.value)}
              className="mt-1"
              data-testid="input-parking-name"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date" className="text-foreground">{t.date}</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
                data-testid="input-date"
              />
            </div>
            <div>
              <Label htmlFor="time" className="text-foreground">{t.time}</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1"
                data-testid="input-time"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="price" className="text-foreground">{t.price}</Label>
            <Input
              id="price"
              placeholder={t.pricePlaceholder}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1"
              data-testid="input-price"
            />
          </div>

          <Button 
            onClick={handleAddBooking}
            disabled={!parkingName.trim()}
            className="w-full"
            data-testid="button-add-booking"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t.save}
          </Button>
        </div>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4 text-foreground">
          {t.yourBookings} ({bookings.length})
        </h2>

        {bookings.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t.noBookings}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="p-4" data-testid={`card-booking-${booking.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-accent" />
                      {booking.parkingName}
                    </h3>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{t.dateLabel}: {booking.date || t.notEntered}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{t.timeLabel}: {booking.time || t.notEntered}</span>
                      </div>
                      <div className="text-accent font-medium">
                        {t.priceLabel}: {booking.price ? `${booking.price} RSD` : t.notEntered}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteBooking(booking.id)}
                    className="text-destructive"
                    data-testid={`button-delete-${booking.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (embedded) {
    return <div className="max-w-3xl mx-auto py-4">{content}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-1 xs:px-2 sm:px-4 py-2.5 xs:py-3 sm:py-4">
          <div className="flex items-center justify-between gap-1 xs:gap-2">
            <Link href="/map-hack" className="flex items-center gap-1.5 xs:gap-2">
              <img src={parkInLogo} alt="CarDrop" className="w-7 xs:w-8 h-7 xs:h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground hidden sm:inline">CarDrop</span>
            </Link>

            <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
              <Link href="/map-hack">
                <Button variant="outline" size="icon" data-testid="button-home">
                  <HomeIcon className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {content}
      </div>
    </div>
  );
}
