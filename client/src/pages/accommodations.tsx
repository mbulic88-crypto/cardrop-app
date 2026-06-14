import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { SiInstagram } from "react-icons/si";
import { useLanguage } from "@/hooks/useLanguage";
import type { PartnerAccommodation } from "@shared/schema";

const CITY_LABELS: Record<string, { sr: string; en: string }> = {
  novi_sad: { sr: "Novi Sad", en: "Novi Sad" },
  beograd:  { sr: "Beograd", en: "Belgrade" },
  nis:      { sr: "Niš", en: "Niš" },
};

const ALL_CITIES = ["novi_sad", "beograd", "nis"];

function ImageCarousel({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const imgs = images.slice(0, 5);
  if (imgs.length === 0) {
    return (
      <div className="w-full h-48 bg-muted flex items-center justify-center rounded-t-md">
        <MapPin className="w-8 h-8 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="relative w-full h-52 bg-muted rounded-t-md overflow-hidden">
      <img
        src={imgs[idx]}
        alt={name}
        className="w-full h-full object-cover"
      />
      {imgs.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); setIdx((idx - 1 + imgs.length) % imgs.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 rounded-full p-1 text-white"
            data-testid="button-prev-image"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); setIdx((idx + 1) % imgs.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 rounded-full p-1 text-white"
            data-testid="button-next-image"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {imgs.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); setIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-white" : "bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AccommodationCard({ acc }: { acc: PartnerAccommodation }) {
  return (
    <Card className="overflow-hidden flex flex-col" data-testid={`card-accommodation-${acc.id}`}>
      <ImageCarousel images={acc.images} name={acc.name} />
      <div className="p-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground text-base leading-tight">{acc.name}</h3>
        {acc.instagramUrl && (
          <a
            href={acc.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-pink-500 hover:text-pink-400 transition-colors"
            data-testid={`link-instagram-${acc.id}`}
          >
            <SiInstagram className="w-5 h-5" />
          </a>
        )}
      </div>
    </Card>
  );
}

export default function Accommodations() {
  const { language } = useLanguage();
  const params = useParams<{ city?: string }>();
  const citySlug = params?.city;

  const cityKey = citySlug === "novi-sad" ? "novi_sad"
    : citySlug === "beograd" ? "beograd"
    : citySlug === "nis" ? "nis"
    : undefined;

  const { data: allAccommodations = [], isLoading } = useQuery<PartnerAccommodation[]>({
    queryKey: ["/api/accommodations"],
  });

  const filtered = cityKey
    ? allAccommodations.filter(a => a.city === cityKey && a.isActive)
    : allAccommodations.filter(a => a.isActive);

  const pageTitle = cityKey
    ? (language === "sr" ? `Smeštaji — ${CITY_LABELS[cityKey]?.sr}` : `Stays — ${CITY_LABELS[cityKey]?.en}`)
    : (language === "sr" ? "Preporučeni smeštaji" : "Recommended Stays");

  const t = {
    back: language === "sr" ? "Nazad" : "Back",
    noAccommodations: language === "sr"
      ? "Nema preporučenih smeštaja za ovaj grad."
      : "No recommended stays for this city yet.",
    allCities: language === "sr" ? "Svi gradovi" : "All cities",
    loading: language === "sr" ? "Učitavanje..." : "Loading...",
    partnersNote: language === "sr"
      ? "Ovi smeštaji su naši partneri — preporučujemo ih CarDrop korisnicima."
      : "These accommodations are our partners — recommended to CarDrop users.",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 h-14 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="font-semibold text-foreground text-base">{pageTitle}</h1>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* City filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link href="/smestaji">
            <Badge
              variant={!cityKey ? "default" : "outline"}
              className="cursor-pointer text-sm px-3 py-1"
              data-testid="tab-all-cities"
            >
              {t.allCities}
            </Badge>
          </Link>
          {ALL_CITIES.map(c => (
            <Link key={c} href={`/smestaji/${c === "novi_sad" ? "novi-sad" : c}`}>
              <Badge
                variant={cityKey === c ? "default" : "outline"}
                className="cursor-pointer text-sm px-3 py-1"
                data-testid={`tab-city-${c}`}
              >
                {language === "sr" ? CITY_LABELS[c].sr : CITY_LABELS[c].en}
              </Badge>
            </Link>
          ))}
        </div>

        <p className="text-sm text-muted-foreground mb-6">{t.partnersNote}</p>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">{t.loading}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t.noAccommodations}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map(acc => (
              <AccommodationCard key={acc.id} acc={acc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
