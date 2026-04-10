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

  const { data: mapStatus } = useQuery<MapHackStatus>({
    queryKey: ["/api/map-hack/status"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      localStorage.setItem("cardrop-returnTo", "/map-hack/subscribe");
      setLocation("/auth");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  const freePlanMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/map-hack/plan", { plan: "free" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/map-hack/status"] });
      toast({
        title: "Free plan aktiviran!",
        description: "Dobrodošao u Map Hack NS zajednicu.",
      });
      setLocation("/map-hack");
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Pokušaj ponovo.",
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
          title: "Greška",
          description: data.message || "Pokušaj ponovo.",
          variant: "destructive",
        });
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Greška",
          description: "Nije moguće otvoriti stranicu za plaćanje. Pokušaj ponovo.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Greška",
        description: "Nema konekcije. Pokušaj ponovo.",
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
    <div className="min-h-screen bg-background flex flex-col relative">
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
        <span className="font-bold text-foreground text-lg">Map Hack NS</span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-4">
        <div className="flex flex-col gap-1 mb-2">
          <h1 className="text-xl font-bold text-foreground">Izaberi plan</h1>
          <p className="text-sm text-muted-foreground">
            {currentPlan
              ? `Aktivan plan: ${
                  currentPlan === "free" ? "Free" :
                  currentPlan === "premium" ? "Premium" :
                  currentPlan === "day_pass" ? "Day Pass" :
                  currentPlan === "godisnji_premium" ? "Godišnji Premium" :
                  currentPlan
                }`
              : "Odaberi plan koji ti odgovara."}
          </p>
        </div>

        {/* FREE */}
        <Card data-testid="card-plan-free">
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-foreground">FREE</span>
                {currentPlan === "free" && (
                  <Badge variant="secondary" data-testid="badge-current-free">Aktivan</Badge>
                )}
              </div>
              <span className="text-2xl font-extrabold text-foreground">
                0 <span className="text-base font-semibold text-muted-foreground">RSD</span>
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Osnovni pristup zajednici i mapi Novog Sada.
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {[
                "Mapa NS sa parking zonama i ulicama",
                "Zlatni Minut i Pauk markeri",
                "Smart SMS plaćanje javnih zona (1 klik)",
                "Privatni parkinzi za najam",
                "Live Chat sa zajednicom",
              ].map(f => (
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
              {freePlanMutation.isPending ? "Aktivacija..." : currentPlan === "free" ? "Aktivan" : "Aktiviraj besplatno"}
            </Button>
          </CardContent>
        </Card>

        {/* PREMIUM */}
        <Card data-testid="card-plan-premium">
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-foreground">PREMIUM</span>
                <Badge variant="secondary" data-testid="badge-recommended">Preporučeno</Badge>
                {currentPlan === "premium" && (
                  <Badge variant="secondary" data-testid="badge-current-premium">Aktivan</Badge>
                )}
              </div>
              <span className="text-2xl font-extrabold text-foreground">
                390 <span className="text-base font-semibold text-muted-foreground">RSD / mes</span>
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Potpuna zaštita i najbrži parking u gradu.
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {[
                "Sve Free funkcije +",
                "Safe Zone alarm — push za svaki marker u 300m krugu",
                "Štek parking lokacije (skrivena baza)",
                "Radar markeri (policija i patrola)",
                "Push notifikacije — ne moraš gledati u mapu",
                "Pauk heatmap analitika",
              ].map(f => (
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
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Preusmjeravanje...</span>
              ) : currentPlan === "premium" ? "Aktivan" : "Izaberi Premium"}
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
                  <Badge variant="secondary" data-testid="badge-current-day-pass">Aktivan</Badge>
                )}
              </div>
              <span className="text-2xl font-extrabold text-foreground">
                120 <span className="text-base font-semibold text-muted-foreground">RSD</span>
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Sve iz PREMIUM paketa na 24h.
            </p>
            <p className="text-xs text-muted-foreground">
              Safe Zone alarm, Štek, Radar — idealno za subotnji izlazak u centar.
            </p>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handlePaidPlan("day_pass")}
              disabled={currentPlan === "day_pass" || checkoutPending !== null}
              data-testid="button-subscribe-day-pass"
            >
              {checkoutPending === "day_pass" ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Preusmjeravanje...</span>
              ) : currentPlan === "day_pass" ? "Aktivan" : "Kupi Day Pass"}
            </Button>
          </CardContent>
        </Card>

        {/* GODIŠNJI PREMIUM */}
        <Card data-testid="card-plan-godisnji">
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-foreground">GODIŠNJI PREMIUM</span>
                <Badge variant="secondary" data-testid="badge-usteda">Ušteda</Badge>
                {currentPlan === "godisnji_premium" && (
                  <Badge variant="secondary" data-testid="badge-current-godisnji">Aktivan</Badge>
                )}
              </div>
              <span className="text-2xl font-extrabold text-foreground">
                3.500 <span className="text-base font-semibold text-muted-foreground">RSD</span>
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Sve iz PREMIUM paketa na godinu dana.
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {[
                "Sve Free funkcije +",
                "Safe Zone alarm — push za svaki marker u 300m krugu",
                "Štek parking lokacije (skrivena baza)",
                "Radar markeri (policija i patrola)",
                "Push notifikacije — ne moraš gledati u mapu",
                "365 dana · ušteda preko 1.000 RSD",
              ].map(f => (
                <li key={f} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Ušteda preko 1.000 RSD (2 meseca gratis).
            </p>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handlePaidPlan("godisnji_premium")}
              disabled={currentPlan === "godisnji_premium" || checkoutPending !== null}
              data-testid="button-subscribe-godisnji"
            >
              {checkoutPending === "godisnji_premium" ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Preusmjeravanje...</span>
              ) : currentPlan === "godisnji_premium" ? "Aktivan" : "Izaberi Godišnji"}
            </Button>
          </CardContent>
        </Card>

        {/* ZA FIRME */}
        <Card data-testid="card-plan-firme">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-bold text-foreground">ZA FIRME</span>
              <span className="text-sm text-muted-foreground font-medium">Po dogovoru</span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Rešenja za flote i poslovne korisnike.
            </p>
            <p className="text-xs text-muted-foreground">
              Kontakt:{" "}
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
              Kontaktiraj nas
            </Button>
          </CardContent>
        </Card>

        {/* ── Legenda funkcija ── */}
        <LegendSection />

        <p className="text-xs text-muted-foreground text-center pb-4" data-testid="text-payment-note">
          Plaćanje karticom putem Stripe. Pitanja: info@cardrop.app
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

  const items: Array<{ icon: ReactNode; color: string; label: string; desc: string; badge: "Free" | "Premium" }> = [
    {
      icon: <Clock size={14} />,
      color: "#f97316",
      label: "Zlatni Minut",
      desc: "Slobodno parking mesto ili dojava da neko izlazi — ističe za 45 min",
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
      label: "Pauk Radar",
      desc: "Pauk primećen u blizini — upozorenje!",
      badge: "Free",
    },
    {
      icon: <Home size={14} />,
      color: "#22c55e",
      label: "Štek Parking",
      desc: "Tajno, skriveni ili povoljno parking mesto",
      badge: "Premium",
    },
    {
      icon: <Shield size={14} />,
      color: "#3b82f6",
      label: "Safe Zone",
      desc: "Dobijas notifikaciju šta god da se desi u tvojoj Safe Zoni (pauk, radar, zlatni minut, štek)",
      badge: "Premium",
    },
    {
      icon: <Smartphone size={14} />,
      color: "#6366f1",
      label: "SMS Plaćanje javnih",
      desc: "Plati javni parking putem SMS-a — 1 klik",
      badge: "Free",
    },
    {
      icon: <RadioTower size={14} />,
      color: "#8b5cf6",
      label: "Radar",
      desc: "Policijski radar ili patrola na putu",
      badge: "Premium",
    },
    {
      icon: <Car size={14} />,
      color: "#14b8a6",
      label: "Privatni Parkinzi",
      desc: "Pregled privatnih parkinga za iznajmljivanje u NS",
      badge: "Free",
    },
  ];

  return (
    <Card data-testid="card-legend">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <span className="text-sm font-bold text-foreground">Legenda funkcija mape</span>
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
          <p className="text-xs text-muted-foreground">Svaka funkcija na mapi — šta je Free a šta Premium.</p>
          <div className="space-y-3">
            {items.map(item => (
              <FeatureRow key={item.label} {...item} />
            ))}
          </div>
          <div className="rounded-md px-3 py-2.5 border border-border bg-muted/40">
            <p className="text-xs font-semibold text-foreground mb-1">Push notifikacije (Premium)</p>
            <p className="text-xs text-muted-foreground">
              Kada neko prijavi Pauka, Zlatni Minut, Radar ili Štek u tvojoj Safe Zoni (300m krug) dobijaš push odmah — ne moraš stalno gledati u mapu.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
