import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ArrowLeft, MapPin, Upload, Home as HomeIcon, Globe } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

const SERBIAN_CITIES = [
  "Beograd", "Novi Sad", "Niš", "Kragujevac", "Subotica", "Zrenjanin",
  "Pančevo", "Čačak", "Kraljevo", "Smederevo", "Leskovac", "Užice",
  "Valjevo", "Šabac", "Sombor", "Kruševac"
];

const formSchema = z.object({
  title: z.string().min(5, "Naslov mora imati najmanje 5 karaktera"),
  description: z.string().min(1, "Opis je obavezan"),
  address: z.string().min(5, "Adresa mora biti uneta"),
  city: z.preprocess((val) => val === "" ? undefined : val, z.string().optional()),
  phone: z.string().min(5, "Telefon mora imati najmanje 5 karaktera").max(50, "Telefon može imati maksimalno 50 karaktera"),
  latitude: z.string().min(1, "Geografska širina je obavezna"),
  longitude: z.string().min(1, "Geografska dužina je obavezna"),
  pricePerHour: z.string().min(1, "Cena je obavezna"),
  currency: z.string().default("RSD"),
  paymentType: z.enum(['cash', 'bank_transfer', 'card_monri'], {
    errorMap: () => ({ message: "Tip plaćanja mora biti izabran" })
  }),
  spotType: z.string().min(1, "Tip mesta je obavezan"),
  hasEvCharging: z.boolean().default(false),
  hasSecurityCamera: z.boolean().default(false),
  is24Hours: z.boolean().default(true),
});

export default function AddSpot() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [spotId, setSpotId] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      address: "",
      city: "",
      phone: "",
      latitude: "45.2671",
      longitude: "19.8335",
      pricePerHour: "",
      currency: "RSD",
      paymentType: "cash",
      spotType: "uncovered",
      hasEvCharging: false,
      hasSecurityCamera: false,
      is24Hours: true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return await apiRequest("POST", "/api/parking-spots", data);
    },
    onSuccess: (data) => {
      setSpotId(data.id);
      toast({
        title: "Uspešno Dodato",
        description: "Sada možete dodati slike parking mesta ili kliknite Završi.",
      });
      // Scroll to the image upload section
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
          window.location.href = "/api/login";
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

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Check if user is authenticated before submitting
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
    
    mutation.mutate(values);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link href="/home" className="flex items-center gap-2">
              <img src={parkInLogo} alt="ParkIN" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground hidden sm:inline">ParkIN</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link href="/home">
                <Button variant="outline" data-testid="button-home">
                  <HomeIcon className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Početna</span>
                </Button>
              </Link>

              <Button variant="outline" data-testid="button-language">
                <Globe className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">ENG</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            Dodajte Parking Mesto
          </h1>
          <p className="text-muted-foreground">
            Popunite informacije o vašem parking mestu i počnite da zarađujete
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
                    <FormLabel>Naslov</FormLabel>
                    <FormControl>
                      <Input placeholder="npr. Parking u centru grada" {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opis</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Opišite parking mesto, pristup, okolinu..."
                        className="min-h-32"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresa</FormLabel>
                    <FormControl>
                      <AddressAutocomplete
                        value={field.value}
                        onChange={field.onChange}
                        onLocationSelect={(data) => {
                          // Automatically populate latitude, longitude, and city
                          form.setValue('latitude', data.latitude.toString());
                          form.setValue('longitude', data.longitude.toString());
                          if (data.city) {
                            form.setValue('city', data.city);
                          }
                        }}
                        placeholder="Počnite da kucate adresu u Srbiji..."
                      />
                    </FormControl>
                    <FormDescription>
                      Izaberite adresu iz ponuđenih opcija - koordinate će biti automatski popunjene
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
                    <FormLabel>Grad (Opciono)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-city">
                          <SelectValue placeholder="Izaberite grad" />
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
                      Grad će biti automatski popunjen iz adrese, ali možete ga promeniti
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
                    <FormLabel>Kontakt Telefon</FormLabel>
                    <FormControl>
                      <Input placeholder="+381 64 123 4567" {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormDescription>
                      Telefon za kontakt sa iznajmljivačima
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Geografska Širina</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.0001" {...field} data-testid="input-latitude" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Geografska Dužina</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.0001" {...field} data-testid="input-longitude" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pricePerHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cena po Satu</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="150" {...field} data-testid="input-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valuta</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="RSD">RSD (Dinar)</SelectItem>
                          <SelectItem value="BAM">BAM (Konvertibilna Marka)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tip Plaćanja</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Keš</SelectItem>
                        <SelectItem value="bank_transfer">Preko računa - kontaktirajte vlasnika</SelectItem>
                        <SelectItem value="card_monri">Kartično (Monri)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Izaberite način plaćanja koji prihvatate
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="spotType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tip Parking Mesta</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-spot-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="uncovered">Nepokriveno</SelectItem>
                        <SelectItem value="covered">Pokriveno</SelectItem>
                        <SelectItem value="garage">Garaža</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground">Dodatne Opcije</h3>
                
                <FormField
                  control={form.control}
                  name="hasEvCharging"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>EV Punjač</FormLabel>
                        <FormDescription>Ima li punjač za električna vozila?</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-ev-charging"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasSecurityCamera"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>Sigurnosna Kamera</FormLabel>
                        <FormDescription>Ima li video nadzor?</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-security-camera"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is24Hours"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>Dostupno 24/7</FormLabel>
                        <FormDescription>Da li je dostupno non-stop?</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-24-hours"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={mutation.isPending}
                data-testid="button-submit"
              >
                {mutation.isPending ? "Dodavanje..." : "Dodaj Parking Mesto"}
              </Button>
            </form>
          </Form>
        </Card>

        {spotId && (
          <Card className="p-6 mt-6">
            <h3 className="text-xl font-semibold mb-4 text-foreground">
              Dodajte Slike Parking Mesta
            </h3>
            <p className="text-muted-foreground mb-4">
              Dodajte do 5 slika vašeg parking mesta kako bi privukli više korisnika.
            </p>
            
            {uploadedImages.length > 0 && (
              <div className="mb-4 grid grid-cols-3 gap-4">
                {uploadedImages.map((img, index) => (
                  <img 
                    key={index} 
                    src={img} 
                    alt={`Uploaded ${index + 1}`} 
                    className="rounded-md object-cover h-32 w-full"
                  />
                ))}
              </div>
            )}

            <div className="flex gap-4">
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
                  if (uploadURL && spotId) {
                    const response = await apiRequest("PUT", `/api/parking-spots/${spotId}/images`, {
                      imageURL: uploadURL,
                    });
                    setUploadedImages(response.imageUrls);
                    toast({
                      title: "Slika Dodata",
                      description: "Vaša slika je uspešno dodata parking mestu.",
                    });
                  }
                }}
                buttonClassName="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Dodaj Sliku
              </ObjectUploader>

              <Button 
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/parking-spots"] });
                  setLocation("/home");
                }}
                className="flex-1"
                data-testid="button-finish"
              >
                Završi
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Login Required Dialog */}
      <LoginRequiredDialog
        open={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        message="Za dodavanje parking mesta potrebna je prijava na nalog."
        redirectPath="/add-spot"
      />
    </div>
  );
}
