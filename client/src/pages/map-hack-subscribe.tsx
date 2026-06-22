import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, Check, ChevronDown, ChevronUp, Clock, Home, Shield, Smartphone, RadioTower, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { useLanguage } from "@/hooks/useLanguage";

const mhst = {
  sr: {
    choosePlan: "Izaberi plan",
    activePlan: "Aktivan plan",
    chooseSuitable: "Odaberi plan koji ti odgovara.",
    active: "Aktivan",
    activating: "Aktivacija...",
    activateFree: "Aktiviraj besplatno",
    recommended: "Preporučeno",
    redirecting: "Preusmjeravanje...",
    choosePremium: "Izaberi Premium",
    buyDayPass: "Kupi Day Pass",
    savings: "Ušteda",
    chooseAnnual: "Izaberi Godišnji",
    contactUs: "Kontaktiraj nas",
    byAgreement: "Po dogovoru",
    legend: "Legenda funkcija mape",
    legendDesc: "Svaka funkcija na mapi — šta je Free a šta Premium.",
    freeDesc: "Osnovni pristup parking zajednici Srbije.",
    premiumDesc: "Potpuna zaštita i najbrži parking u gradu.",
    dayPassDesc: "Sve iz PREMIUM paketa na 24h.",
    dayPassNote: "Safe Zone alarm, Štek, Radar — idealno za subotnji izlazak u centar.",
    annualDesc: "Sve iz PREMIUM paketa na godinu dana.",
    annualNote: "Ušteda preko 1.000 RSD (2 meseca gratis).",
    firmDesc: "Rešenja za flote i poslovne korisnike.",
    paymentNote: "Plaćanje karticom putem Stripe. Pitanja: info@cardrop.app",
    pushNotifTitle: "Push notifikacije (Premium)",
    pushNotifDesc: "Kada neko prijavi Pauka, Zlatni Minut, Radar ili Štek u tvojoj Safe Zoni (300m krug) dobijaš push odmah — ne moraš stalno gledati u mapu.",
    freePlanToast: "Free plan aktiviran!",
    freePlanToastDesc: "Dobrodošao u Map Hack RS zajednicu.",
    errorTitle: "Greška",
    errorRetry: "Pokušaj ponovo.",
    errorPayment: "Nije moguće otvoriti stranicu za plaćanje. Pokušaj ponovo.",
    errorNoConn: "Nema konekcije. Pokušaj ponovo.",
    forCompanies: "ZA FIRME",
    contact: "Kontakt",
    freePlanFeatures: [
      "Parking mapa Srbije sa zonama i ulicama",
      "Zlatni Minut i Pauk markeri",
      "Smart SMS plaćanje javnih zona (1 klik)",
      "Privatni parkinzi za najam",
      "Live Chat sa zajednicom",
    ],
    premiumFeatures: [
      "Sve Free funkcije +",
      "Safe Zone alarm — push za svaki marker u 300m krugu",
      "Javni skriveni parkinzi – Štek lokacije",
      "Radar markeri (policija i patrola)",
      "Push notifikacije — ne moraš gledati u mapu",
      "Pauk heatmap analitika",
    ],
    annualFeatures: [
      "Sve Free funkcije +",
      "Safe Zone alarm — push za svaki marker u 300m krugu",
      "Javni skriveni parkinzi – Štek lokacije",
      "Radar markeri (policija i patrola)",
      "Push notifikacije — ne moraš gledati u mapu",
      "365 dana · ušteda preko 1.000 RSD",
    ],
    annualPlanLabel: "GODIŠNJI PREMIUM",
    legendZlatniMinutLabel: "Zlatni Minut",
    legendZlatniMinutDesc: "Slobodno mesto — 10 minuta gratis. Požuri!",
    legendPaukLabel: "Pauk Radar",
    legendPaukDesc: "Pauk primećen u blizini — upozorenje!",
    legendStekLabel: "Javni skriveni parkinzi – Štek",
    legendStekDesc: "Skriveno ali trajno slobodno mesto. Samo za Premium.",
    legendSafeZoneLabel: "Safe Zone",
    legendSafeZoneDesc: "Dobijas notifikaciju šta god da se desi u tvojoj Safe Zoni (pauk, radar, zlatni minut, štek)",
  },
  en: {
    choosePlan: "Choose plan",
    activePlan: "Active plan",
    chooseSuitable: "Choose a plan that suits you.",
    active: "Active",
    activating: "Activating...",
    activateFree: "Activate for free",
    recommended: "Recommended",
    redirecting: "Redirecting...",
    choosePremium: "Choose Premium",
    buyDayPass: "Buy Day Pass",
    savings: "Savings",
    chooseAnnual: "Choose Annual",
    contactUs: "Contact us",
    byAgreement: "On request",
    legend: "Map feature legend",
    legendDesc: "Every map feature — what's Free and what's Premium.",
    freeDesc: "Basic access to Serbia's parking community.",
    premiumDesc: "Full protection and fastest parking in the city.",
    dayPassDesc: "Everything in PREMIUM for 24h.",
    dayPassNote: "Safe Zone alarm, Štek, Radar — ideal for a Saturday night out.",
    annualDesc: "Everything in PREMIUM for a full year.",
    annualNote: "Save over 1,000 RSD (2 months free).",
    firmDesc: "Solutions for fleets and business users.",
    paymentNote: "Card payment via Stripe. Questions: info@cardrop.app",
    pushNotifTitle: "Push notifications (Premium)",
    pushNotifDesc: "When someone reports a tow truck, Golden Minute, Radar or Štek in your Safe Zone (300m radius), you get a push immediately — no need to keep watching the map.",
    freePlanToast: "Free plan activated!",
    freePlanToastDesc: "Welcome to the Map Hack RS community.",
    errorTitle: "Error",
    errorRetry: "Please try again.",
    errorPayment: "Unable to open payment page. Please try again.",
    errorNoConn: "No connection. Please try again.",
    forCompanies: "FOR COMPANIES",
    contact: "Contact",
    freePlanFeatures: [
      "Serbia parking map with zones & streets",
      "Golden Minute & Tow Truck markers",
      "Smart SMS payment for public zones (1 tap)",
      "Private parking spots for rent",
      "Live community chat",
    ],
    premiumFeatures: [
      "All Free features +",
      "Safe Zone alarm — push for every marker in 300m radius",
      "Javni skriveni parkinzi – Štek (hidden spots)",
      "Radar markers (police & patrol)",
      "Push notifications — no need to watch the map",
      "Tow truck heatmap analytics",
    ],
    annualFeatures: [
      "All Free features +",
      "Safe Zone alarm — push for every marker in 300m radius",
      "Javni skriveni parkinzi – Štek (hidden spots)",
      "Radar markers (police & patrol)",
      "Push notifications — no need to watch the map",
      "365 days · save over 1,000 RSD",
    ],
    annualPlanLabel: "ANNUAL PREMIUM",
    legendZlatniMinutLabel: "Golden Minute",
    legendZlatniMinutDesc: "Free spot — 10 minutes free. Hurry!",
    legendPaukLabel: "Tow Truck Radar",
    legendPaukDesc: "Tow truck spotted nearby — warning!",
    legendStekLabel: "Javni skriveni parkinzi – Štek",
    legendStekDesc: "Hidden but permanently free spot. Premium only.",
    legendSafeZoneLabel: "Safe Zone",
    legendSafeZoneDesc: "Get notified about anything that happens in your Safe Zone (tow truck, radar, golden minute, štek)",
  },
};

type MapHackStatus = {
  phase: "trial" | "trial_expired" | "active" | "plan_expired";
  trialStartedAt: string | null;
  trialExpiresAt: string | null;
  daysLeft: number;
  plan: string | null;
  planExpiresAt: string | null;
};

export default function MapHackSubscribe() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [checkoutPending, setCheckoutPending] = useState<string | null>(null);
  const { language } = useLanguage();
  const t = mhst[language === "sr" ? "sr" : "en"];

  const { data: mapStatus } = useQuery<MapHackStatus>({
    queryKey: ["/api/map-hack/status"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      localStorage.setItem("cardrop-returnTo", "/map-hack");
      setLocation("/auth");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  const freePlanMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/map-hack/plan", { plan: "free" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-hack/status"] });
      toast({
        title: t.freePlanToast,
        description: t.freePlanToastDesc,
      });
      setLocation("/map-hack");
    },
    onError: () => {
      toast({
        title: t.errorTitle,
        description: t.errorRetry,
        variant: "destructive",
      });
    },
  });

  async function handlePaidPlan(planId: string) {
    setCheckoutPending(planId);
    try {
      const res = await fetch("/api/map-hack/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json() as { url?: string; message?: string };
      if (!res.ok) {
        toast({
          title: t.errorTitle,
          description: data.message || t.errorRetry,
          variant: "destructive",
        });
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: t.errorTitle,
          description: t.errorPayment,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: t.errorTitle,
        description: t.errorNoConn,
        variant: "destructive",
      });
    } finally {
      setCheckoutPending(null);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const currentPlan = mapStatus?.plan;

  return (
    <div className="bg-background flex flex-col relative" style={{ height: '100dvh', overflow: 'hidden' }}>
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <header className="flex items-center gap-3 px-4 py-4 border-b">
        <Link href="/map-hack">
          <Button size="icon" variant="ghost" data-testid="button-back-map">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <img src={parkInLogo} alt="CarDrop" className="w-8 h-8 rounded-md" />
        <span className="font-bold text-foreground text-lg">Map Hack RS</span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-4">
        <div className="flex flex-col gap-1 mb-2">
          <h1 className="text-xl font-bold text-foreground">{t.choosePlan}</h1>
          <p className="text-sm text-muted-foreground">
            {currentPlan
              ? `${t.activePlan}: ${
                  currentPlan === "free" ? "Free" :
                  currentPlan === "premium" ? "Premium" :
                  currentPlan === "day_pass" ? "Day Pass" :
                  currentPlan === "godisnji_premium" ? (language === "sr" ? "Godišnji Premium" : "Annual Premium") :
                  currentPlan
                }`
              : t.chooseSuitable}
          </p>
        </div>

        {/* FREE */}
        <Card data-testid="card-plan-free">
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-foreground">FREE</span>
                {currentPlan === "free" && (
                  <Badge variant="secondary" data-testid="badge-current-free">{t.active}</Badge>
                )}
              </div>
              <span className="text-2xl font-extrabold text-foreground">
                0 <span className="text-base font-semibold text-muted-foreground">RSD</span>
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t.freeDesc}</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {t.freePlanFeatures.map((f: string) => (
                <li key={f} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => freePlanMutation.mutate()}
              disabled={freePlanMutation.isPending || currentPlan === "free"}
              data-testid="button-subscribe-free"
            >
              {freePlanMutation.isPending ? t.activating : currentPlan === "free" ? t.active : t.activateFree}
            </Button>
          </CardContent>
        </Card>

        {/* PREMIUM */}
        <Card data-testid="card-plan-premium">
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-foreground">PREMIUM</span>
                <Badge variant="secondary" data-testid="badge-recommended">{t.recommended}</Badge>
                {currentPlan === "premium" && (
                  <Badge variant="secondary" data-testid="badge-current-premium">{t.active}</Badge>
                )}
              </div>
              <span className="text-2xl font-extrabold text-foreground">
                390 <span className="text-base font-semibold text-muted-foreground">RSD / {language === "sr" ? "mes" : "mo"}</span>
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-fee-premium">
                + <span style={{ color: "#635bff", fontWeight: 700 }}>Stripe</span> naknada
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t.premiumDesc}</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {t.premiumFeatures.map((f: string) => (
                <li key={f} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              onClick={() => handlePaidPlan("premium")}
              disabled={currentPlan === "premium" || checkoutPending !== null}
              data-testid="button-subscribe-premium"
            >
              {checkoutPending === "premium" ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t.redirecting}</span>
              ) : currentPlan === "premium" ? t.active : t.choosePremium}
            </Button>
          </CardContent>
        </Card>

        {/* DAY PASS */}
        <Card data-testid="card-plan-day-pass">
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-foreground">DAY PASS</span>
                {currentPlan === "day_pass" && (
                  <Badge variant="secondary" data-testid="badge-current-day-pass">{t.active}</Badge>
                )}
              </div>
              <span className="text-2xl font-extrabold text-foreground">
                120 <span className="text-base font-semibold text-muted-foreground">RSD</span>
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-fee-day-pass">
                + <span style={{ color: "#635bff", fontWeight: 700 }}>Stripe</span> naknada
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t.dayPassDesc}</p>
            <p className="text-xs text-muted-foreground">{t.dayPassNote}</p>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handlePaidPlan("day_pass")}
              disabled={currentPlan === "day_pass" || checkoutPending !== null}
              data-testid="button-subscribe-day-pass"
            >
              {checkoutPending === "day_pass" ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t.redirecting}</span>
              ) : currentPlan === "day_pass" ? t.active : t.buyDayPass}
            </Button>
          </CardContent>
        </Card>

        {/* GODIŠNJI PREMIUM */}
        <Card data-testid="card-plan-godisnji">
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-foreground">{t.annualPlanLabel}</span>
                <Badge variant="secondary" data-testid="badge-usteda">{t.savings}</Badge>
                {currentPlan === "godisnji_premium" && (
                  <Badge variant="secondary" data-testid="badge-current-godisnji">{t.active}</Badge>
                )}
              </div>
              <span className="text-2xl font-extrabold text-foreground">
                3.500 <span className="text-base font-semibold text-muted-foreground">RSD</span>
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-fee-godisnji">
                + <span style={{ color: "#635bff", fontWeight: 700 }}>Stripe</span> naknada
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t.annualDesc}</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {t.annualFeatures.map((f: string) => (
                <li key={f} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">{t.annualNote}</p>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handlePaidPlan("godisnji_premium")}
              disabled={currentPlan === "godisnji_premium" || checkoutPending !== null}
              data-testid="button-subscribe-godisnji"
            >
              {checkoutPending === "godisnji_premium" ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t.redirecting}</span>
              ) : currentPlan === "godisnji_premium" ? t.active : t.chooseAnnual}
            </Button>
          </CardContent>
        </Card>

        {/* ZA FIRME */}
        <Card data-testid="card-plan-firme">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-bold text-foreground">{t.forCompanies}</span>
              <span className="text-sm text-muted-foreground font-medium">{t.byAgreement}</span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t.firmDesc}</p>
            <p className="text-xs text-muted-foreground">
              {t.contact}:{" "}
              <a
                href="mailto:info@cardrop.app"
                className="underline underline-offset-2"
                data-testid="link-firma-email"
              >
                info@cardrop.app
              </a>
            </p>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => window.location.href = "mailto:info@cardrop.app"}
              data-testid="button-subscribe-firme"
            >
              {t.contactUs}
            </Button>
          </CardContent>
        </Card>

        {/* ── Legenda funkcija ── */}
        <LegendSection />

        <p className="text-xs text-muted-foreground text-center pb-4" data-testid="text-payment-note">
          {t.paymentNote}
        </p>
      </div>
    </div>
  );
}

function FeatureRow({ icon, color, label, desc, badge }: {
  icon: ReactNode;
  color: string;
  label: string;
  desc: string;
  badge: "Free" | "Premium";
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
        style={{ background: color + "22", border: `1px solid ${color}44` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground text-sm">{label}</span>
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0"
            style={badge === "Premium" ? { background: "rgba(218,165,32,0.15)", color: "#DAA520" } : undefined}
          >
            {badge}
          </Badge>
        </div>
        <p className="text-xs mt-0.5 text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function LegendSection() {
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();
  const tl = mhst[language === "sr" ? "sr" : "en"];

  const smsPay = tl === mhst.sr ? "SMS Plaćanje javnih" : "SMS Public Parking";
  const smsDesc = tl === mhst.sr ? "Plati javni parking putem SMS-a — 1 klik" : "Pay public parking via SMS — 1 tap";
  const radarLabel = tl === mhst.sr ? "Radar" : "Radar";
  const radarDesc = tl === mhst.sr ? "Policijski radar ili patrola na putu" : "Police radar or patrol on the road";
  const privateLabel = tl === mhst.sr ? "Privatni Parkinzi" : "Private Parking";
  const privateDesc = tl === mhst.sr ? "Pregled privatnih parkinga za iznajmljivanje" : "Browse private parking spots for rent";

  const items: Array<{ icon: ReactNode; color: string; label: string; desc: string; badge: "Free" | "Premium" }> = [
    {
      icon: <Clock size={14} />,
      color: "#f97316",
      label: tl.legendZlatniMinutLabel,
      desc: tl.legendZlatniMinutDesc,
      badge: "Free",
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="10" r="3"/><circle cx="12" cy="16" r="4"/>
          <line x1="12" y1="7" x2="8" y2="3"/><line x1="12" y1="7" x2="16" y2="3"/>
          <line x1="9" y1="9" x2="4" y2="7"/><line x1="15" y1="9" x2="20" y2="7"/>
          <line x1="8" y1="14" x2="3" y2="13"/><line x1="16" y1="14" x2="21" y2="13"/>
          <line x1="8" y1="18" x2="3" y2="21"/><line x1="16" y1="18" x2="21" y2="21"/>
        </svg>
      ),
      color: "#ef4444",
      label: tl.legendPaukLabel,
      desc: tl.legendPaukDesc,
      badge: "Free",
    },
    {
      icon: <Home size={14} />,
      color: "#22c55e",
      label: tl.legendStekLabel,
      desc: tl.legendStekDesc,
      badge: "Premium",
    },
    {
      icon: <Shield size={14} />,
      color: "#3b82f6",
      label: tl.legendSafeZoneLabel,
      desc: tl.legendSafeZoneDesc,
      badge: "Premium",
    },
    {
      icon: <Smartphone size={14} />,
      color: "#6366f1",
      label: smsPay,
      desc: smsDesc,
      badge: "Free",
    },
    {
      icon: <RadioTower size={14} />,
      color: "#8b5cf6",
      label: radarLabel,
      desc: radarDesc,
      badge: "Premium",
    },
    {
      icon: <Car size={14} />,
      color: "#14b8a6",
      label: privateLabel,
      desc: privateDesc,
      badge: "Free",
    },
  ];

  return (
    <Card data-testid="card-legend">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <span className="text-sm font-bold text-foreground">{tl.legend}</span>
        <Button
          size="icon"
          variant="ghost"
          data-testid="button-legend-toggle"
          onClick={() => setOpen(o => !o)}
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">{tl.legendDesc}</p>
          <div className="space-y-3">
            {items.map(item => (
              <FeatureRow key={item.label} {...item} />
            ))}
          </div>
          <div className="rounded-md px-3 py-2.5 border border-border bg-muted/40">
            <p className="text-xs font-semibold text-foreground mb-1">{tl.pushNotifTitle}</p>
            <p className="text-xs text-muted-foreground">{tl.pushNotifDesc}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
