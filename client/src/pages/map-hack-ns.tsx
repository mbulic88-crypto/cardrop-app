import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, AlertTriangle, Check, X, ChevronRight, Building2, RefreshCw, Clock } from "lucide-react";
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

function FeatureRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      ) : (
        <div className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center flex-shrink-0">
          <X className="w-2.5 h-2.5 text-black/30" />
        </div>
      )}
      <span className={ok ? "text-white/90 text-sm" : "text-foreground/30 text-sm line-through"}>{text}</span>
    </div>
  );
}

function FreeFeatureRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <div className="w-4 h-4 rounded-full bg-slate-400/30 flex items-center justify-center flex-shrink-0">
          <Check className="w-2.5 h-2.5 text-slate-600 dark:text-slate-400" />
        </div>
      ) : (
        <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
          <X className="w-2.5 h-2.5 text-slate-400" />
        </div>
      )}
      <span className={ok ? "text-slate-700 dark:text-slate-300 text-sm" : "text-slate-400 dark:text-slate-600 text-sm line-through"}>{text}</span>
    </div>
  );
}

function PlanCards({ selectedPlan, onSelect }: { selectedPlan: PlanId | null; onSelect: (p: PlanId) => void }) {
  return (
    <div className="flex flex-col gap-3">

      {/* PREMIUM — zeleni gradijent hero */}
      <button
        type="button"
        data-testid="button-plan-premium"
        onClick={() => onSelect("premium")}
        className={[
          "w-full text-left rounded-md p-4 transition-all duration-200",
          selectedPlan === "premium" ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-background" : "",
        ].join(" ")}
        style={{
          background: "linear-gradient(145deg, #14532d 0%, #166534 50%, #15803d 100%)",
          boxShadow: selectedPlan === "premium" ? "0 6px 28px rgba(21,128,61,0.5)" : "0 2px 12px rgba(21,128,61,0.2)",
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-extrabold text-base tracking-wide">PREMIUM</span>
            <span className="bg-yellow-400 text-yellow-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Preporučeno
            </span>
          </div>
          <div className={[
            "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
            selectedPlan === "premium" ? "bg-yellow-400 border-yellow-400" : "border-white/40",
          ].join(" ")}>
            {selectedPlan === "premium" && <Check className="w-3 h-3 text-yellow-950" />}
          </div>
        </div>
        <div className="mb-3">
          <span className="text-white text-3xl font-extrabold leading-none">390</span>
          <span className="text-green-200 text-sm ml-1 font-medium">RSD / mes</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <FeatureRow ok text="Sve štek lokacije bez ograničenja" />
          <FeatureRow ok text="Live upozorenja o inspekciji" />
          <FeatureRow ok text="Zajednički chat vozača" />
          <FeatureRow ok text="Quick report jednim klikom" />
          <FeatureRow ok text="Prioritetna podrška" />
        </div>
      </button>

      {/* GODIŠNJI — indigo/tamnoplava (različita od green!) */}
      <button
        type="button"
        data-testid="button-plan-godisnji"
        onClick={() => onSelect("godisnji_premium")}
        className={[
          "w-full text-left rounded-md p-4 transition-all duration-200",
          selectedPlan === "godisnji_premium" ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-background" : "",
        ].join(" ")}
        style={{
          background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 60%, #3730a3 100%)",
          boxShadow: selectedPlan === "godisnji_premium" ? "0 6px 28px rgba(67,56,202,0.5)" : "0 2px 12px rgba(67,56,202,0.2)",
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-extrabold text-base tracking-wide">GODIŠNJI</span>
            <span className="bg-green-400 text-green-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              2 mes. gratis
            </span>
          </div>
          <div className={[
            "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
            selectedPlan === "godisnji_premium" ? "bg-indigo-400 border-indigo-400" : "border-white/40",
          ].join(" ")}>
            {selectedPlan === "godisnji_premium" && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-white text-3xl font-extrabold leading-none">3.500</span>
          <span className="text-indigo-300 text-sm font-medium">RSD / god</span>
        </div>
        <div className="bg-white/10 rounded-md px-3 py-1.5 mb-3">
          <p className="text-indigo-200 text-xs font-semibold">= 290 RSD/mes · ušteda 1.180 RSD</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <FeatureRow ok text="Sve Premium funkcije" />
          <FeatureRow ok text="365 dana pristupa" />
          <FeatureRow ok text="2 meseca GRATIS vs. mesečni" />
          <FeatureRow ok text="Prioritetna podrška" />
        </div>
      </button>

      {/* DAY PASS — puna narandžasta, bijeli tekst */}
      <button
        type="button"
        data-testid="button-plan-day-pass"
        onClick={() => onSelect("day_pass")}
        className={[
          "w-full text-left rounded-md p-4 transition-all duration-200",
          selectedPlan === "day_pass" ? "ring-2 ring-orange-300 ring-offset-2 ring-offset-background" : "",
        ].join(" ")}
        style={{
          background: "linear-gradient(145deg, #c2410c 0%, #ea580c 60%, #f97316 100%)",
          boxShadow: selectedPlan === "day_pass" ? "0 6px 28px rgba(234,88,12,0.5)" : "0 2px 12px rgba(234,88,12,0.2)",
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-200 flex-shrink-0" />
            <span className="text-white font-extrabold text-base tracking-wide">DAY PASS</span>
          </div>
          <div className={[
            "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
            selectedPlan === "day_pass" ? "bg-orange-200 border-orange-200" : "border-white/40",
          ].join(" ")}>
            {selectedPlan === "day_pass" && <Check className="w-3 h-3 text-orange-900" />}
          </div>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-white text-3xl font-extrabold leading-none">99</span>
          <span className="text-orange-200 text-sm font-medium">RSD · jednokratno</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <FeatureRow ok text="Sve Premium funkcije" />
          <FeatureRow ok text="Važi 24 sata" />
          <FeatureRow ok text="Bez pretplate" />
          <FeatureRow ok text="Idealno za goste NS i vikend" />
        </div>
      </button>

      {/* FREE — siva/slate, jasno inferiorna */}
      <button
        type="button"
        data-testid="button-plan-free"
        onClick={() => onSelect("free")}
        className={[
          "w-full text-left rounded-md p-4 transition-all duration-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
          selectedPlan === "free" ? "ring-2 ring-slate-400 ring-offset-1 ring-offset-background" : "",
        ].join(" ")}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="text-slate-700 dark:text-slate-200 font-extrabold text-base tracking-wide">FREE</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold">Besplatno</span>
            <div className={[
              "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
              selectedPlan === "free" ? "bg-slate-500 border-slate-500" : "border-slate-300 dark:border-slate-600",
            ].join(" ")}>
              {selectedPlan === "free" && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <FreeFeatureRow ok text="Osnovna mapa parking zona NS" />
          <FreeFeatureRow ok text="Pregled javnih informacija" />
          <FreeFeatureRow ok={false} text="Štek lokacije" />
          <FreeFeatureRow ok={false} text="Live upozorenja" />
          <FreeFeatureRow ok={false} text="Chat zajednice" />
        </div>
      </button>

      {/* ZA FIRME — info kartica */}
      <div
        className="border border-dashed border-border rounded-md p-4"
        data-testid="card-plan-firme"
      >
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-foreground font-bold text-base">ZA FIRME</span>
          </div>
          <span className="text-muted-foreground text-xs">Po dogovoru</span>
        </div>
        <p className="text-muted-foreground text-sm mb-2">
          Rešenja za flote, dostavljače i firme sa više vozila.
        </p>
        <a
          href="mailto:info@cardrop.app"
          className="text-sm font-semibold text-green-700 dark:text-green-400 underline underline-offset-2"
          data-testid="link-firma-email"
        >
          info@cardrop.app
        </a>
      </div>

    </div>
  );
}

function CompactHero({ title = "Map Hack NS" }: { title?: string }) {
  return (
    <div
      className="flex-shrink-0"
      style={{ background: "linear-gradient(160deg, #14532d 0%, #166534 55%, #15803d 100%)" }}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <Link href="/">
          <Button
            size="icon"
            variant="ghost"
            className="text-white/80"
            style={{ background: "transparent" }}
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <img src={parkInLogo} alt="CarDrop" className="w-6 h-6 rounded-md" />
          <span className="font-bold text-white text-base">{title}</span>
        </div>
        <div className="[&_button]:text-white/80 [&_svg]:text-white/70">
          <ThemeToggle />
        </div>
      </div>
      <p className="text-center text-green-200 text-xs pb-3 tracking-wide">
        NS · Štek parkinzi · Crvene zone · Live chat
      </p>
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
    const res = await fetch("/api/map-hack/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "free" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Greška pri aktivaciji plana");
    }
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
      if (!profileRes.ok) { setError(profileData.message || "Greška pri čuvanju profila"); return; }
      await savePlan(selectedPlan);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Greška. Pokušaj ponovo.";
      setError(msg);
      toast({ title: "Greška", description: msg, variant: "destructive" });
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Greška. Pokušaj ponovo.";
      setError(msg);
      toast({ title: "Greška", description: msg, variant: "destructive" });
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

  /* ─── ONBOARDING FULL ──────────────────────────────────────── */
  if (viewMode === "onboarding_full") {
    const nickOk = nickname.trim().length >= 3 && /^[a-zA-Z0-9_\-]+$/.test(nickname.trim());
    const canSubmit = nickOk && selectedAvatar !== null && selectedPlan !== null;
    let hint = "";
    if (!selectedAvatar) hint = "Izaberi avatar";
    else if (!nickOk) hint = "Unesi nadimak (min. 3 znaka)";
    else if (!selectedPlan) hint = "Izaberi paket";

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <CompactHero />

        <div className="flex-1 overflow-y-auto pb-24">
          <div className="max-w-md mx-auto px-4">

            {/* Avatar */}
            <div className="pt-5 pb-4">
              <p className="text-sm font-bold text-foreground mb-3">
                1. Izaberi avatar
              </p>
              <div className="grid grid-cols-5 gap-2 justify-items-center">
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
                        "w-[56px] h-[56px] p-0 transition-all duration-150 bg-[#F5EDD8] flex-shrink-0",
                        isSelected
                          ? "ring-2 ring-green-600 dark:ring-green-400 ring-offset-2 ring-offset-background rounded-full scale-105"
                          : "rounded-md ring-1 ring-border",
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

            {/* Nadimak */}
            <div className="py-4 border-t border-border">
              <p className="text-sm font-bold text-foreground mb-2">
                2. Tvoj nadimak
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
                className="border-2"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Vidljivo svima u chatu i na mapi. Slova, brojevi, _ i -.
              </p>
            </div>

            {/* Paket */}
            <div className="py-4 border-t border-border">
              <p className="text-sm font-bold text-foreground mb-1">
                3. Izaberi paket
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Ulaz je besplatan. Premium donosi sve štek lokacije i live zaštitu.
              </p>
              <PlanCards
                selectedPlan={selectedPlan}
                onSelect={(p) => { setSelectedPlan(p); setError(""); }}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium py-2" data-testid="text-error">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Sticky CTA */}
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
              {isSaving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Čuvamo...</>
                : <><ChevronRight className="w-4 h-4 mr-2" />Uđi na mapu</>
              }
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── ONBOARDING PLAN ONLY ─────────────────────────────────── */
  if (viewMode === "onboarding_plan_only") {
    const canSubmit = selectedPlan !== null;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <CompactHero />

        <div className="flex-1 overflow-y-auto pb-24">
          <div className="max-w-md mx-auto px-4">

            {/* Profil prikaz (read-only) */}
            <div className="flex items-center gap-3 py-4 border-b border-border">
              <div className="w-12 h-12 rounded-full bg-[#F5EDD8] overflow-hidden ring-2 ring-border flex-shrink-0">
                <img
                  src={`/avatars/avatar-${user.mapAvatarId ?? 1}.png`}
                  alt="avatar"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="font-bold text-foreground text-base" data-testid="text-map-nickname">
                  {user.mapNickname}
                </p>
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 text-amber-500" />
                  <p className="text-amber-600 dark:text-amber-400 text-xs">
                    {mapStatus?.phase === "trial_expired" ? "Probni period istekao" : "Plan istekao"} — obnovi pristup
                  </p>
                </div>
              </div>
            </div>

            <div className="py-4">
              <p className="text-sm font-bold text-foreground mb-1">Izaberi paket</p>
              <p className="text-xs text-muted-foreground mb-4">
                Izaberi plan i nastavi na mapu.
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
              {isSaving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Aktiviramo...</>
                : <><ChevronRight className="w-4 h-4 mr-2" />Nastavi na mapu</>
              }
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── MAP VIEW ─────────────────────────────────────────────── */
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
            Interaktivna mapa Novog Sada — štek parkinzi, crvene zone, live info.
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
