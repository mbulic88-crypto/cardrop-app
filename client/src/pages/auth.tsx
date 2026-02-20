import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

type AuthMode = "login" | "register";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        await apiRequest("POST", "/api/auth/register", {
          email,
          password,
          firstName,
          lastName,
        });
        toast({ title: "Registracija uspešna!", description: "Dobrodošli na CarDrop" });
      } else {
        await apiRequest("POST", "/api/auth/login", {
          email,
          password,
        });
        toast({ title: "Prijava uspešna!", description: "Dobrodošli nazad" });
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/home");
    } catch (error: any) {
      const msg = error.message?.includes(":")
        ? error.message.split(": ").slice(1).join(": ")
        : error.message;

      let parsed = msg;
      try {
        const obj = JSON.parse(msg);
        parsed = obj.message || msg;
      } catch {
        parsed = msg;
      }

      toast({
        title: mode === "login" ? "Greška pri prijavi" : "Greška pri registraciji",
        description: parsed,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (response: any) => {
    setLoading(true);
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      await apiRequest("POST", "/api/auth/google", {
        credential: response.credential,
        clientId,
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Prijava uspešna!", description: "Dobrodošli na CarDrop" });
      setLocation("/home");
    } catch (error: any) {
      toast({
        title: "Google prijava nije uspela",
        description: "Pokušajte ponovo ili koristite email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-start mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Nazad
            </Button>
          </Link>
        </div>

        <Card className="p-6">
          <div className="flex flex-col items-center mb-6">
            <img src={parkInLogo} alt="CarDrop" className="w-16 h-16 rounded-xl mb-3" />
            <h1 className="text-2xl font-bold text-foreground">CarDrop</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === "login" ? "Prijavite se na vaš nalog" : "Kreirajte novi nalog"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">Ime</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      placeholder="Ime"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-9"
                      required
                      data-testid="input-first-name"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Prezime</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      placeholder="Prezime"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="pl-9"
                      required
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="vas@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Lozinka</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? "Minimum 6 karaktera" : "Vaša lozinka"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  required
                  minLength={mode === "register" ? 6 : 1}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90"
              disabled={loading}
              data-testid="button-submit-auth"
            >
              {loading
                ? "Molimo sačekajte..."
                : mode === "login"
                ? "Prijavite se"
                : "Registrujte se"}
            </Button>
          </form>

          {googleClientId && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ili</span>
                </div>
              </div>

              <div id="google-signin-container" data-testid="google-signin-container">
                <GoogleSignInButton onSuccess={handleGoogleLogin} clientId={googleClientId} />
              </div>
            </>
          )}


          <div className="mt-5 text-center text-sm">
            {mode === "login" ? (
              <p className="text-muted-foreground">
                Nemate nalog?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="text-accent font-medium hover:underline"
                  data-testid="button-switch-to-register"
                >
                  Registrujte se
                </button>
              </p>
            ) : (
              <p className="text-muted-foreground">
                Već imate nalog?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-accent font-medium hover:underline"
                  data-testid="button-switch-to-login"
                >
                  Prijavite se
                </button>
              </p>
            )}
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Prijavom prihvatate naše{" "}
          <Link href="/terms" className="text-accent hover:underline">
            Uslove Korišćenja
          </Link>{" "}
          i{" "}
          <Link href="/privacy-policy" className="text-accent hover:underline">
            Politiku Privatnosti
          </Link>
        </p>
      </div>
    </div>
  );
}


function GoogleSignInButton({
  onSuccess,
  clientId,
}: {
  onSuccess: (response: any) => void;
  clientId: string;
}) {
  const [loaded, setLoaded] = useState(false);

  useState(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      (window as any).google?.accounts?.id?.initialize({
        client_id: clientId,
        callback: onSuccess,
      });
      (window as any).google?.accounts?.id?.renderButton(
        document.getElementById("google-btn-render"),
        {
          theme: "outline",
          size: "large",
          width: "100%",
          text: "signin_with",
          locale: "sr",
        }
      );
      setLoaded(true);
    };
    document.body.appendChild(script);
  });

  return (
    <div className="flex justify-center">
      <div id="google-btn-render" data-testid="button-google-signin" />
      {!loaded && (
        <Button variant="outline" className="w-full" disabled>
          Google prijava se učitava...
        </Button>
      )}
    </div>
  );
}
