import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, MapPin, Radio, Bell, MessageSquare, ThumbsUp, Zap, Star, Trophy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";

type MapHackStatus = {
  phase: "trial" | "trial_expired" | "active" | "plan_expired";
  trialStartedAt: string | null;
  trialExpiresAt: string | null;
  daysLeft: number;
  plan: string | null;
  planExpiresAt: string | null;
};

function FeatureItem({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
      <span className="text-sm text-foreground">{text}</span>
    </div>
  );
}

export default function MapHackSubscribe() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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

  function handleSubscribe(plan: "osnovna" | "premium") {
    toast({
      title: "Uskoro dostupno",
      description: `Plaćanje uskoro — kontaktiraj nas na info@cardrop.rs za rani pristup ${plan === "premium" ? "Premium" : "Osnovna"} planu.`,
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const isExpired = mapStatus?.phase === "trial_expired" || mapStatus?.phase === "plan_expired";
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

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">Izaberi plan</h1>
          {isExpired ? (
            <p className="text-sm text-destructive font-medium" data-testid="text-expired-notice">
              {mapStatus?.phase === "trial_expired"
                ? "Tvoj probni period je istekao. Izaberi plan da nastaviš."
                : "Tvoj plan je istekao. Obnovi ga da nastaviš."}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {mapStatus?.phase === "trial"
                ? `Probni period — ${mapStatus.daysLeft} dana preostalo`
                : currentPlan
                ? `Aktivan plan: ${currentPlan === "premium" ? "Premium" : "Osnovna"} — ${mapStatus?.daysLeft} dana preostalo`
                : "Odaberi plan koji ti odgovara."}
            </p>
          )}
        </div>

        {/* OSNOVNA plan */}
        <Card className="flex flex-col" data-testid="card-plan-osnovna">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">Osnovna</span>
                {currentPlan === "osnovna" && (
                  <Badge variant="secondary" data-testid="badge-current-osnovna">Aktivan</Badge>
                )}
              </div>
              <span className="text-2xl font-extrabold text-foreground">350 <span className="text-base font-semibold text-muted-foreground">RSD/mes</span></span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mapa</p>
              <FeatureItem icon={MapPin} text="Štek parking mesta" />
              <FeatureItem icon={MapPin} text="Crvene zone + garaže" />
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live info</p>
              <FeatureItem icon={Radio} text="Pauk, sudari, gužve" />
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lokacije i obaveštenja</p>
              <FeatureItem icon={MapPin} text="WC, pumpe, bankomati, voda" />
              <FeatureItem icon={Bell} text="Custom notifikacije" />
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chat</p>
              <FeatureItem icon={MessageSquare} text="Čitanje poruka" />
              <FeatureItem icon={ThumbsUp} text="Lajkovanje i ocenjivanje" />
            </div>
            <Button
              className="w-full mt-1"
              onClick={() => handleSubscribe("osnovna")}
              data-testid="button-subscribe-osnovna"
            >
              <Check className="w-4 h-4 mr-2" />
              Izaberi Osnovna
            </Button>
          </CardContent>
        </Card>

        {/* PREMIUM plan */}
        <Card className="flex flex-col" data-testid="card-plan-premium">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-foreground">Premium</span>
                <Badge variant="secondary" data-testid="badge-recommended">Preporučeno</Badge>
                {currentPlan === "premium" && (
                  <Badge variant="secondary" data-testid="badge-current-premium">Aktivan</Badge>
                )}
              </div>
              <span className="text-2xl font-extrabold text-foreground">490 <span className="text-base font-semibold text-muted-foreground">RSD/mes</span></span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-green-600 dark:text-green-500 shrink-0" />
              <span>Sve iz Osnovna, plus:</span>
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chat</p>
              <FeatureItem icon={MessageSquare} text="Pisanje poruka (1/min)" />
              <FeatureItem icon={MessageSquare} text="1 reply po poruci" />
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Brze akcije</p>
              <FeatureItem icon={Zap} text="Quick report dugmad — 1 klik" />
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Extras</p>
              <FeatureItem icon={Star} text="Praćenje omiljenih lokacija" />
              <FeatureItem icon={Trophy} text={`Badge / rank — "top tipser"`} />
            </div>
            <Button
              className="w-full mt-1"
              onClick={() => handleSubscribe("premium")}
              data-testid="button-subscribe-premium"
            >
              <Check className="w-4 h-4 mr-2" />
              Izaberi Premium
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center pb-2" data-testid="text-payment-note">
          Plaćanje se može izvršiti karticom ili virmanski. Za pomoć: info@cardrop.rs
        </p>
      </div>
    </div>
  );
}
