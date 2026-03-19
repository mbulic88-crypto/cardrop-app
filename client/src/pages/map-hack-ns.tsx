import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { MapPin, ArrowLeft, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import avatarSprite from "@assets/ChatGPT_Image_Mar_19,_2026,_11_40_13_AM_1773917009111.png";

const AVATAR_NAMES = [
  "Agentka", "Kapetan", "Operaterka", "Navigatorka", "Taktičarka",
  "Agent", "Izviđač", "Komunikator", "Strateg", "Komandant",
];

function AvatarSprite({ index, size = 64 }: { index: number; size?: number }) {
  const col = index % 5;
  const row = Math.floor(index / 5);
  const xPct = col === 0 ? 0 : (col / 4) * 100;
  const yPct = row === 0 ? 0 : 100;

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${avatarSprite})`,
        backgroundSize: "500% 200%",
        backgroundPosition: `${xPct}% ${yPct}%`,
        backgroundRepeat: "no-repeat",
        borderRadius: "50%",
        flexShrink: 0,
      }}
    />
  );
}

export default function MapHackNS() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      localStorage.setItem("cardrop-returnTo", "/map-hack");
      setLocation("/auth");
    }
  }, [isLoading, isAuthenticated, setLocation]);

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

  const hasProfile = !!user.mapNickname && user.mapAvatarId != null;

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

            <div className="grid grid-cols-5 gap-2">
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
                      "flex flex-col items-center gap-1 p-1.5 rounded-md transition-colors",
                      "bg-card",
                      isSelected
                        ? "ring-2 ring-green-600 dark:ring-green-500"
                        : "ring-1 ring-border",
                    ].join(" ")}
                    aria-label={AVATAR_NAMES[i]}
                    aria-pressed={isSelected}
                  >
                    <AvatarSprite index={i} size={48} />
                    <span className="text-[10px] text-muted-foreground leading-none text-center w-full truncate">
                      {AVATAR_NAMES[i]}
                    </span>
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

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="ring-2 ring-green-600 dark:ring-green-500 rounded-full p-0.5 bg-card">
            <AvatarSprite index={(user.mapAvatarId ?? 1) - 1} size={72} />
          </div>
          <div>
            <p className="font-bold text-foreground text-lg">{user.mapNickname}</p>
            <p className="text-xs text-muted-foreground">tvoj profil na mapi</p>
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
            Prvi mesec besplatno za sve korisnike.
          </p>
        </div>

        <Link href="/">
          <Button variant="outline" data-testid="button-back-landing">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Nazad na početnu
          </Button>
        </Link>
      </div>
    </div>
  );
}
