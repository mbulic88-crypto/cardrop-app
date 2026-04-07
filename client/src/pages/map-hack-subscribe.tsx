import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
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
              Idealno za goste grada ili subotnji izlazak u centar.
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

        <p className="text-xs text-muted-foreground text-center pb-4" data-testid="text-payment-note">
          Plaćanje karticom putem Stripe. Pitanja: info@cardrop.app
        </p>
      </div>
    </div>
  );
}
