import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, Loader2, AlertTriangle, Check, MapPin,
  Clock, ChevronRight, Building2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
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

type PlanId = "free" | "premium" | "day_pass" | "godisnji_premium";
type ViewMode = "loading" | "onboarding_full" | "onboarding_plan_only" | "map_view";

function planLabel(plan: string | null): string {
  if (plan === "admin") return "Admin";
  if (plan === "premium") return "Premium";
  if (plan === "day_pass") return "Day Pass";
  if (plan === "godisnji_premium") return "Godišnji Premium";
  if (plan === "free") return "Free plan";
  if (plan === "firma") return "Za Firme";
  return "Probni period";
}

function PlanCards({
  selectedPlan,
  onSelect,
}: {
  selectedPlan: PlanId | null;
  onSelect: (p: PlanId) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        data-testid="button-plan-premium"
        onClick={() => onSelect("premium")}
        className={[
          "w-full text-left rounded-md p-5 transition-all duration-200 relative",
          selectedPlan === "premium"
            ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-background scale-[1.01]"
            : "",
        ].join(" ")}
        style={{
          background: "linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)",
          boxShadow: selectedPlan === "premium"
            ? "0 8px 32px rgba(21,128,61,0.45)"
            : "0 4px 16px rgba(21,128,61,0.25)",
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-extrabold text-lg tracking-wide">PREMIUM</span>
            <span className="bg-yellow-400 text-yellow-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Preporučeno
            </span>
          </div>
          <div className={[
            "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
            selectedPlan === "premium" ? "bg-yellow-400 border-yellow-400" : "border-white/40",
          ].join(" ")}>
            {selectedPlan === "premium" && <Check className="w-3.5 h-3.5 text-yellow-950" />}
          </div>
        </div>
        <div className="mb-3">
          <span className="text-white text-4xl font-extrabold leading-none">390</span>
          <span className="text-green-200 text-base ml-1.5 font-medium">RSD / mes</span>
        </div>
        <p className="text-green-100 text-sm mb-4 leading-relaxed">
          Potpuna zaštita i najbrži parking u gradu.
        </p>
        <div className="flex flex-col gap-2">
          {[
            "Sve štek lokacije bez ograničenja",
            "Live upozorenja i zajednički chat",
            "Quick report jednim klikom",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-400/30 flex items-center justify-center flex-shrink-0">
                <Check className="w-2.5 h-2.5 text-green-300" />
              </div>
              <span className="text-green-100 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </button>

      <button
        type="button"
        data-testid="button-plan-godisnji"
        onClick={() => onSelect("godisnji_premium")}
        className={[
          "w-full text-left rounded-md p-5 transition-all duration-200 bg-green-950",
          selectedPlan === "godisnji_premium"
            ? "ring-2 ring-green-400 ring-offset-2 ring-offset-background scale-[1.01]"
            : "",
        ].join(" ")}
        style={{
          boxShadow: selectedPlan === "godisnji_premium" ? "0 6px 24px rgba(0,0,0,0.3)" : "none",
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-extrabold text-base tracking-wide">GODIŠNJI PREMIUM</span>
            <span className="bg-green-400 text-green-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Ušteda
            </span>
          </div>
          <div className={[
            "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
            selectedPlan === "godisnji_premium" ? "bg-green-400 border-green-400" : "border-white/30",
          ].join(" ")}>
            {selectedPlan === "godisnji_premium" && <Check className="w-3.5 h-3.5 text-green-950" />}
          </div>
        </div>
        <div className="mb-3">
          <span className="text-white text-3xl font-extrabold leading-none">3.500</span>
          <span className="text-green-400 text-base ml-1.5 font-medium">RSD / god</span>
        </div>
        <div className="bg-green-900/70 rounded-md px-3 py-2 mb-2">
          <p className="text-green-300 text-xs font-semibold">
            = 290 RSD / mes &nbsp;·&nbsp; 2 meseca GRATIS
          </p>
        </div>
        <p className="text-green-400 text-sm">Sve Premium funkcije čitavu godinu.</p>
      </button>

      <button
        type="button"
        data-testid="button-plan-day-pass"
        onClick={() => onSelect("day_pass")}
        className={[
          "w-full text-left rounded-md p-4 transition-all duration-200 border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30",
          selectedPlan === "day_pass"
            ? "ring-2 ring-amber-500 ring-offset-1 ring-offset-background scale-[1.01]"
            : "",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="text-amber-900 dark:text-amber-200 font-extrabold text-base tracking-wide">
                DAY PASS
              </span>
            </div>
            <p className="text-amber-700 dark:text-amber-400 text-sm">Sve Premium funkcije na 24h.</p>
            <p className="text-amber-600 dark:text-amber-500 text-xs">Idealno za goste i vikend izlaske.</p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="text-right">
              <span className="text-amber-800 dark:text-amber-300 text-2xl font-extrabold leading-none">99</span>
              <span className="text-amber-600 dark:text-amber-500 text-sm ml-0.5">RSD</span>
            </div>
            <div className={[
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
              selectedPlan === "day_pass" ? "bg-amber-500 border-amber-500" : "border-amber-300 dark:border-amber-700",
            ].join(" ")}>
              {selectedPlan === "day_pass" && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
        </div>
      </button>

      <button
        type="button"
        data-testid="button-plan-free"
        onClick={() => onSelect("free")}
        className={[
          "w-full text-left rounded-md p-4 transition-all duration-200 border border-border bg-card",
          selectedPlan === "free"
            ? "ring-2 ring-green-600 ring-offset-1 ring-offset-background"
            : "opacity-60",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-foreground font-bold text-base">FREE</span>
            <p className="text-muted-foreground text-sm mt-0.5">Osnovni pristup zajednici i mapi.</p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className="text-muted-foreground text-sm font-semibold">Besplatno</span>
            <div className={[
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
              selectedPlan === "free" ? "bg-green-600 border-green-600" : "border-border",
            ].join(" ")}>
              {selectedPlan === "free" && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
        </div>
      </button>

      <div className="border border-dashed border-border rounded-md p-4 opacity-70">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-foreground font-bold text-base">ZA FIRME</span>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">Flote i poslovni korisnici.</p>
          </div>
          <span className="text-muted-foreground text-xs flex-shrink-0">Po dogovoru</span>
        </div>
        <a
          href="mailto:info@cardrop.app"
          className="inline-block text-xs text-green-700 dark:text-green-400 underline underline-offset-2 mt-2"
          data-testid="link-firma-email"
        >
          info@cardrop.app
        </a>
      </div>
    </div>
  );
}

export default function MapHackNS() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const hasProfile = !!user?.mapNickname && user?.mapAvatarId != null;

  const { data: mapStatus, isLoading: statusLoading } = useQuery<MapHackStatus>({
    queryKey: ["/api/map-hack/status"],
    enabled: isAuthenticated && hasProfile,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      localStorage.setItem("cardrop-returnTo", "/map-hack");
      setLocation("/auth");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  let viewMode: ViewMode = "loading";
  if (!isLoading && isAuthenticated && user) {
    if (!hasProfile) {
      viewMode = "onboarding_full";
    } else if (statusLoading || !mapStatus) {
      viewMode = "loading";
    } else if (mapStatus.phase === "trial_expired" || mapStatus.phase === "plan_expired") {
      viewMode = "onboarding_plan_only";
    } else {
      viewMode = "map_view";
    }
  }

  async function savePlan(planId: PlanId) {
    if (planId !== "free") {
      toast({
        title: "Uskoro dostupno",
        description: `Plaćanje za ${planId === "premium" ? "Premium" : planId === "day_pass" ? "Day Pass" : "Godišnji Premium"} — info@cardrop.app`,
      });
    }
    await fetch("/api/map-hack/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "free" }),
    });
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/map-hack/status"] });
  }

  async function handleEnterMap() {
    setError("");
    const nick = nickname.trim();
    if (nick.length < 3) { setError("Nadimak mora imati najmanje 3 znaka"); return; }
    if (!/^[a-zA-Z0-9_\-]+$/.test(nick)) { setError("Samo slova, brojevi, crtica i donja crta"); return; }
    if (selectedAvatar === null) { setError("Izaberi avatar"); return; }
    if (selectedPlan === null) { setError("Izaberi paket"); return; }

    setIsSaving(true);
    try {
      const profileRes = await fetch("/api/map-hack/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nick, avatarId: selectedAvatar }),
      });
      const profileData = await profileRes.json();
      if (!profileRes.ok) {
        setError(profileData.message || "Greška pri čuvanju profila");
        return;
      }
      await savePlan(selectedPlan);
    } catch {
      setError("Greška. Pokušaj ponovo.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleChoosePlan() {
    setError("");
    if (selectedPlan === null) { setError("Izaberi paket"); return; }
    setIsSaving(true);
    try {
      await savePlan(selectedPlan);
    } catch {
      setError("Greška. Pokušaj ponovo.");
    } finally {
      setIsSaving(false);
    }
  }

  if (viewMode === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  if (viewMode === "onboarding_full") {
    const nickOk = nickname.trim().length >= 3 && /^[a-zA-Z0-9_\-]+$/.test(nickname.trim());
    const canSubmit = nickOk && selectedAvatar !== null && selectedPlan !== null;

    let hint = "";
    if (!selectedAvatar) hint = "Izaberi avatar";
    else if (!nickOk) hint = "Unesi nadimak (min. 3 znaka)";
    else if (!selectedPlan) hint = "Izaberi paket";

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div
          className="relative flex-shrink-0"
          style={{ background: "linear-gradient(160deg, #14532d 0%, #166534 55%, #15803d 100%)" }}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-0">
            <Link href="/">
              <Button
                size="icon"
                variant="ghost"
                className="text-white/80 hover:text-white"
                style={{ background: "transparent" }}
                data-testid="button-back-home"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
              <img src={parkInLogo} alt="CarDrop" className="w-7 h-7 rounded-md" />
              <span className="font-bold text-white text-base">Map Hack NS</span>
            </div>
            <div className="[&_button]:text-white/80 [&_button:hover]:text-white [&_svg]:text-white/80">
              <ThemeToggle />
            </div>
          </div>
          <div className="px-5 pt-5 pb-8 text-center">
            <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1.5">Uđi u zajednicu</h1>
            <p className="text-green-100 text-sm leading-relaxed">
              Štek parkinzi · Crvene zone · Live info · NS vozači
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-28">
          <div className="max-w-md mx-auto px-4">

            <div className="pt-6 pb-5">
              <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground mb-3">
                1 — Izaberi avatar
              </p>
              <div className="grid grid-cols-5 gap-2.5 justify-items-center">
                {Array.from({ length: 10 }, (_, i) => {
                  const avatarId = i + 1;
                  const isSelected = selectedAvatar === avatarId;
                  return (
                    <button
                      key={avatarId}
                      type="button"
                      data-testid={`button-avatar-${avatarId}`}
                      onClick={() => { setSelectedAvatar(avatarId); setError(""); }}
                      className={[
                        "w-[58px] h-[58px] p-0 transition-all duration-200 bg-[#F5EDD8] flex-shrink-0",
                        isSelected
                          ? "ring-2 ring-green-600 dark:ring-green-500 ring-offset-2 ring-offset-background rounded-full scale-110"
                          : "rounded-md opacity-60 hover-elevate",
                      ].join(" ")}
                      aria-label={`Avatar ${avatarId}`}
                      aria-pressed={isSelected}
                    >
                      <img
                        src={`/avatars/avatar-${avatarId}.png`}
                        alt={`Avatar ${avatarId}`}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="py-4 border-t border-border">
              <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground mb-3">
                2 — Tvoj nadimak
              </p>
              <Input
                id="nickname-input"
                data-testid="input-nickname"
                placeholder="npr. ParkMajstor"
                value={nickname}
                onChange={(e) => { setNickname(e.target.value); setError(""); }}
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                className="border-2 border-border"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Vidljivo svim korisnicima u chatu i na mapi. Slova, brojevi, _ i -.
              </p>
            </div>

            <div className="py-4 border-t border-border">
              <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground mb-1">
                3 — Izaberi paket
              </p>
              <p className="text-sm text-muted-foreground mb-5">
                Ulaz je besplatan. Premium donosi punu brzinu i zaštitu.
              </p>
              <PlanCards selectedPlan={selectedPlan} onSelect={(p) => { setSelectedPlan(p); setError(""); }} />
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium py-2" data-testid="text-error">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t px-4 py-3">
          <div className="max-w-md mx-auto">
            {hint && !isSaving && (
              <p className="text-xs text-muted-foreground text-center mb-2">{hint}</p>
            )}
            <Button
              className="w-full"
              onClick={handleEnterMap}
              disabled={!canSubmit || isSaving}
              data-testid="button-enter-map"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Čuvamo...</>
              ) : (
                <><ChevronRight className="w-4 h-4 mr-2" />Uđi na mapu</>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "onboarding_plan_only") {
    const canSubmit = selectedPlan !== null;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div
          className="relative flex-shrink-0"
          style={{ background: "linear-gradient(160deg, #14532d 0%, #166534 55%, #15803d 100%)" }}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-0">
            <Link href="/">
              <Button
                size="icon"
                variant="ghost"
                className="text-white/80 hover:text-white"
                style={{ background: "transparent" }}
                data-testid="button-back-home"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
              <img src={parkInLogo} alt="CarDrop" className="w-7 h-7 rounded-md" />
              <span className="font-bold text-white text-base">Map Hack NS</span>
            </div>
            <div className="[&_button]:text-white/80 [&_button:hover]:text-white [&_svg]:text-white/80">
              <ThemeToggle />
            </div>
          </div>

          <div className="px-5 pt-5 pb-7 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#F5EDD8] overflow-hidden ring-2 ring-white/40 flex-shrink-0">
              <img
                src={`/avatars/avatar-${user.mapAvatarId ?? 1}.png`}
                alt="Tvoj avatar"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="font-bold text-white text-base" data-testid="text-map-nickname">
                {user.mapNickname}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <RefreshCw className="w-3 h-3 text-amber-300" />
                <p className="text-amber-200 text-xs">
                  {mapStatus?.phase === "trial_expired" ? "Probni period je istekao" : "Plan je istekao"} — obnovi pristup
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-28">
          <div className="max-w-md mx-auto px-4">
            <div className="py-5">
              <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground mb-1">
                Izaberi paket
              </p>
              <p className="text-sm text-muted-foreground mb-5">
                Izaberi plan koji ti odgovara i nastavi na mapu.
              </p>
              <PlanCards
                selectedPlan={selectedPlan}
                onSelect={(p) => { setSelectedPlan(p); setError(""); }}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium py-2" data-testid="text-error-plan">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t px-4 py-3">
          <div className="max-w-md mx-auto">
            {!canSubmit && !isSaving && (
              <p className="text-xs text-muted-foreground text-center mb-2">Izaberi paket</p>
            )}
            <Button
              className="w-full"
              onClick={handleChoosePlan}
              disabled={!canSubmit || isSaving}
              data-testid="button-choose-plan"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Aktiviramo...</>
              ) : (
                <><ChevronRight className="w-4 h-4 mr-2" />Nastavi na mapu</>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const showTrialBanner = mapStatus?.phase === "trial" && (mapStatus?.daysLeft ?? 30) <= 7;

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <header className="flex items-center gap-3 px-4 py-4 border-b">
        <Link href="/">
          <Button size="icon" variant="ghost" data-testid="button-back-home">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <img src={parkInLogo} alt="CarDrop" className="w-8 h-8 rounded-md" />
        <span className="font-bold text-foreground text-lg">Map Hack NS</span>
      </header>

      {showTrialBanner && (
        <div
          className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800"
          data-testid="banner-trial-expiry"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">
            Probni period ističe za <strong>{mapStatus?.daysLeft}</strong>{" "}
            {mapStatus?.daysLeft === 1 ? "dan" : "dana"} —{" "}
            <Link href="/map-hack/subscribe">
              <span className="underline font-medium cursor-pointer" data-testid="link-subscribe-from-banner">
                izaberi plan
              </span>
            </Link>
          </p>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-[#F5EDD8] overflow-hidden ring-2 ring-green-600 dark:ring-green-500 ring-offset-2 ring-offset-background">
            <img
              src={`/avatars/avatar-${user.mapAvatarId ?? 1}.png`}
              alt="Tvoj avatar"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <p className="font-bold text-foreground text-lg" data-testid="text-map-nickname">
              {user.mapNickname}
            </p>
            <p className="text-xs text-muted-foreground">{planLabel(mapStatus?.plan ?? null)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 max-w-xs">
          <h1 className="text-2xl font-bold text-foreground">Map Hack NS</h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Interaktivna mapa Novog Sada sa štek parking mestima, crvenim zonama, live info i još mnogo toga.
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md px-5 py-4 max-w-xs w-full">
          <p className="text-green-700 dark:text-green-400 font-semibold text-sm">Uskoro dostupno</p>
          <p className="text-green-600 dark:text-green-500 text-sm mt-1">
            {mapStatus?.phase === "trial"
              ? `Probni period — ${mapStatus.daysLeft} dana preostalo`
              : mapStatus?.plan && mapStatus.daysLeft < 9999
              ? `Plan aktivan — ${mapStatus.daysLeft} dana preostalo`
              : "Aktivan plan."}
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/map-hack/subscribe">
            <Button variant="outline" className="w-full" data-testid="button-view-plans">
              Promeni plan
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="w-full" data-testid="button-back-landing">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Nazad na početnu
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
