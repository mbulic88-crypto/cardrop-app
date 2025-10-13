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
import { ArrowLeft, MapPin, Upload } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link, useLocation } from "wouter";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

const formSchema = z.object({
  title: z.string().min(5, "Naslov mora imati najmanje 5 karaktera"),
  description: z.string().min(20, "Opis mora imati najmanje 20 karaktera"),
  address: z.string().min(5, "Adresa mora biti uneta"),
  latitude: z.string().min(1, "Geografska širina je obavezna"),
  longitude: z.string().min(1, "Geografska dužina je obavezna"),
  pricePerHour: z.string().min(1, "Cena je obavezna"),
  currency: z.string().default("RSD"),
  spotType: z.string().min(1, "Tip mesta je obavezan"),
  hasEvCharging: z.boolean().default(false),
  hasSecurityCamera: z.boolean().default(false),
  is24Hours: z.boolean().default(true),
});

export default function AddSpot() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [spotId, setSpotId] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      address: "",
      latitude: "45.2671",
      longitude: "19.8335",
      pricePerHour: "",
      currency: "RSD",
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
    mutation.mutate(values);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Nazad
            </Button>
          </Link>
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
                      <Input placeholder="Ulica i broj, Novi Sad" {...field} data-testid="input-address" />
                    </FormControl>
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
                  const uploadURL = result.successful[0]?.uploadURL;
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
                  setLocation("/");
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
    </div>
  );
}
