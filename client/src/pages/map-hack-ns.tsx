import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";

type MapHackStatus = {
  phase: "trial" | "trial_expired" | "active" | "plan_expired";
  trialStartedAt: string | null;
  trialExpiresAt: string | null;
  daysLeft: number;
  plan: string | null;
  planExpiresAt: string | null;
};

export default function MapHackNS() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
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

  useEffect(() => {
    if (mapStatus && (mapStatus.phase === "trial_expired" || mapStatus.phase === "plan_expired")) {
      setLocation("/map-hack/subscribe");
    }
  }, [mapStatus, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  async function handleSave() {
    setError("");
    if (!nickname.trim()) {
      setError("Upiši nadimak");
      return;
    }
    if (nickname.trim().length < 3) {
      setError("Nadimak mora imati najmanje 3 znaka");
      return;
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(nickname.trim())) {
      setError("Samo slova, brojevi, crtica i donja crta");
      return;
    }
    if (selectedAvatar === null) {
      setError("Izaberi avatar");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/map-hack/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim(), avatarId: selectedAvatar }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Greška pri čuvanju");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/map-hack/status"] });
    } catch {
      setError("Greška pri čuvanju");
    } finally {
      setIsSaving(false);
    }
  }

  if (!hasProfile) {
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

        <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-7 max-w-md mx-auto w-full">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-foreground">Postavi profil</h1>
            <p className="text-muted-foreground text-sm">Jednom postavljeno, viđeće te drugi korisnici na mapi.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground" htmlFor="nickname-input">
              Tvoj nadimak
            </label>
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
            <p className="text-xs text-muted-foreground">
              Ovako ćeš se pojavljivati na Map Hack NS — vidljivo svim korisnicima u chatu i na mapi.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Izaberi avatar</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ovako ćeš izgledati u chatu i na mapi.
              </p>
            </div>

            <div className="grid grid-cols-5 gap-3 justify-items-center w-full">
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
                      "w-16 h-16 p-0 transition-all bg-[#F5EDD8]",
                      isSelected
                        ? "ring-2 ring-green-600 dark:ring-green-500 rounded-full"
                        : "rounded-sm",
                    ].join(" ")}
                    aria-label={`Avatar ${avatarId}`}
                    aria-pressed={isSelected}
                  >
                    <img
                      src={`/avatars/avatar-${avatarId}.png`}
                      alt={`Avatar ${avatarId}`}
                      className="w-16 h-16 object-contain"
                      draggable={false}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium" data-testid="text-error">
              {error}
            </p>
          )}

          <Button
            data-testid="button-save-profile"
            className="w-full"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-2" />
            )}
            Nastavi na mapu
          </Button>
        </div>
      </div>
    );
  }

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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
            Probni period ističe za <strong>{mapStatus?.daysLeft}</strong> {mapStatus?.daysLeft === 1 ? "dan" : "dana"} —{" "}
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
            <p className="font-bold text-foreground text-lg" data-testid="text-map-nickname">{user.mapNickname}</p>
            <p className="text-xs text-muted-foreground">
              {mapStatus?.plan === "admin" ? "Admin"
                : mapStatus?.plan === "premium" ? "Premium"
                : mapStatus?.plan === "day_pass" ? "Day Pass"
                : mapStatus?.plan === "godisnji_premium" ? "Godišnji Premium"
                : mapStatus?.plan === "free" ? "Free plan"
                : "Probni period"}
            </p>
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
              : mapStatus?.plan
              ? `Plan aktivan — ${mapStatus.daysLeft} dana preostalo`
              : "Prvi mesec besplatno za sve korisnike."}
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/map-hack/subscribe">
            <Button variant="outline" className="w-full" data-testid="button-view-plans">
              Pogledaj planove
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
