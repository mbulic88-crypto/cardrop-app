import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, MapPin, Trash2, Plus, Home as HomeIcon, Bookmark } from "lucide-react";
import { Link } from "wouter";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";

interface ManualBooking {
  id: string;
  parkingName: string;
  date: string;
  time: string;
  price: string;
  createdAt: string;
}

export default function MyBookings() {
  const [bookings, setBookings] = useState<ManualBooking[]>([]);
  const [parkingName, setParkingName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");

  // Load bookings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("parkin-manual-bookings");
    if (saved) {
      setBookings(JSON.parse(saved));
    }
  }, []);

  // Save bookings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("parkin-manual-bookings", JSON.stringify(bookings));
  }, [bookings]);

  const handleAddBooking = () => {
    if (!parkingName.trim()) return;

    const newBooking: ManualBooking = {
      id: Date.now().toString(),
      parkingName: parkingName.trim(),
      date: date || "Nije uneto",
      time: time || "Nije uneto",
      price: price || "Nije uneto",
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-1 xs:px-2 sm:px-4 py-2.5 xs:py-3 sm:py-4">
          <div className="flex items-center justify-between gap-1 xs:gap-2">
            <Link href="/home" className="flex items-center gap-1.5 xs:gap-2">
              <img src={parkInLogo} alt="Parkin" className="w-7 xs:w-8 h-7 xs:h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground hidden sm:inline">Parkin</span>
            </Link>

            <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
              <Link href="/home">
                <Button variant="outline" size="icon" className="h-8 w-8 xs:h-9 xs:w-9 sm:w-auto sm:px-3" data-testid="button-home">
                  <HomeIcon className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Početna</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Title and Instructions */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Bookmark className="w-8 h-8 text-accent" />
            <h1 className="text-3xl font-bold text-foreground">Moje Rezervacije</h1>
          </div>
          <Card className="p-4 bg-accent/10 border-accent/30">
            <p className="text-card-foreground">
              Zabeležite vašu rezervaciju da je ne zaboravite! Ovde možete ručno upisati informacije o parking mestu koje ste rezervisali - naziv parkinga, vreme i cenu. Sve rezervacije ostaju sačuvane kao vaš lični podsetnik.
            </p>
          </Card>
        </div>

        {/* Add Booking Form */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-card-foreground flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Dodaj Novu Rezervaciju
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="parkingName" className="text-foreground">Naziv Parkinga *</Label>
              <Input
                id="parkingName"
                placeholder="npr. Parking kod Terazija"
                value={parkingName}
                onChange={(e) => setParkingName(e.target.value)}
                className="mt-1"
                data-testid="input-parking-name"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date" className="text-foreground">Datum</Label>
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
                <Label htmlFor="time" className="text-foreground">Vreme</Label>
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
              <Label htmlFor="price" className="text-foreground">Cena (RSD)</Label>
              <Input
                id="price"
                placeholder="npr. 500"
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
              Sačuvaj Rezervaciju
            </Button>
          </div>
        </Card>

        {/* Bookings List */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Vaše Rezervacije ({bookings.length})
          </h2>

          {bookings.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Još nemate sačuvanih rezervacija. Dodajte svoju prvu rezervaciju iznad.
              </p>
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
                          <span>Datum: {booking.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Vreme: {booking.time}</span>
                        </div>
                        <div className="text-accent font-medium">
                          Cena: {booking.price} {booking.price !== "Nije uneto" ? "RSD" : ""}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteBooking(booking.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
      </div>
    </div>
  );
}
