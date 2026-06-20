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
import { useLanguage } from "@/hooks/useLanguage";

type AuthMode = "login" | "register";

const authTranslations = {
  sr: {
    back: "Nazad",
    loginSubtitle: "Prijavite se na vaš nalog",
    registerSubtitle: "Kreirajte novi nalog",
    firstName: "Ime",
    lastName: "Prezime",
    email: "Email",
    password: "Lozinka",
    passPlaceholderRegister: "Minimum 6 karaktera",
    passPlaceholderLogin: "Vaša lozinka",
    submitLogin: "Prijavite se",
    submitRegister: "Registrujte se",
    loading: "Molimo sačekajte...",
    or: "ili",
    noAccount: "Nemate nalog?",
    registerLink: "Registrujte se",
    hasAccount: "Već imate nalog?",
    loginLink: "Prijavite se",
    termsText: "Prijavom prihvatate naše",
    terms: "Uslove Korišćenja",
    and: "i",
    privacy: "Politiku Privatnosti",
    loginSuccess: "Prijava uspešna!",
    loginSuccessDesc: "Dobrodošli nazad",
    registerSuccess: "Registracija uspešna!",
    registerSuccessDesc: "Dobrodošli na CarDrop",
    loginError: "Greška pri prijavi",
    registerError: "Greška pri registraciji",
    googleError: "Google prijava nije uspela",
    googleErrorDesc: "Pokušajte ponovo ili koristite email",
    googleLoading: "Google prijava se učitava...",
    appleError: "Apple prijava nije uspela",
    appleErrorDesc: "Pokušajte ponovo ili koristite email",
    appleSignIn: "Prijava putem Apple-a",
  },
  en: {
    back: "Back",
    loginSubtitle: "Sign in to your account",
    registerSubtitle: "Create a new account",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    password: "Password",
    passPlaceholderRegister: "Minimum 6 characters",
    passPlaceholderLogin: "Your password",
    submitLogin: "Sign in",
    submitRegister: "Create account",
    loading: "Please wait...",
    or: "or",
    noAccount: "Don't have an account?",
    registerLink: "Sign up",
    hasAccount: "Already have an account?",
    loginLink: "Sign in",
    termsText: "By signing in you agree to our",
    terms: "Terms of Use",
    and: "and",
    privacy: "Privacy Policy",
    loginSuccess: "Login successful!",
    loginSuccessDesc: "Welcome back",
    registerSuccess: "Registration successful!",
    registerSuccessDesc: "Welcome to CarDrop",
    loginError: "Login error",
    registerError: "Registration error",
    googleError: "Google sign-in failed",
    googleErrorDesc: "Please try again or use email",
    googleLoading: "Google sign-in loading...",
    appleError: "Apple sign-in failed",
    appleErrorDesc: "Please try again or use email",
    appleSignIn: "Sign in with Apple",
  },
};

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { language } = useLanguage();
  const t = authTranslations[language === "sr" ? "sr" : "en"];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let userData;
      if (mode === "register") {
        userData = await apiRequest("POST", "/api/auth/register", {
          email,
          password,
          firstName,
          lastName,
        });
        toast({ title: t.registerSuccess, description: t.registerSuccessDesc });
      } else {
        userData = await apiRequest("POST", "/api/auth/login", {
          email,
          password,
        });
        toast({ title: t.loginSuccess, description: t.loginSuccessDesc });
      }

      queryClient.setQueryData(["/api/auth/user"], userData);
      const returnTo = localStorage.getItem("cardrop-returnTo");
      localStorage.removeItem("cardrop-returnTo");
      setLocation(returnTo || "/map-hack");
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
        title: mode === "login" ? t.loginError : t.registerError,
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
      const userData = await apiRequest("POST", "/api/auth/google", {
        credential: response.credential,
        clientId,
      });

      queryClient.setQueryData(["/api/auth/user"], userData);
      toast({ title: t.loginSuccess, description: t.registerSuccessDesc });
      const returnTo = localStorage.getItem("cardrop-returnTo");
      localStorage.removeItem("cardrop-returnTo");
      setLocation(returnTo || "/map-hack");
    } catch (error: any) {
      toast({
        title: t.googleError,
        description: t.googleErrorDesc,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async (response: any) => {
    setLoading(true);
    try {
      const idToken = response?.authorization?.id_token;
      const appleUser = response?.user ?? null;
      const userData = await apiRequest("POST", "/api/auth/apple", {
        id_token: idToken,
        user: appleUser,
      });
      queryClient.setQueryData(["/api/auth/user"], userData);
      toast({ title: t.loginSuccess, description: t.registerSuccessDesc });
      const returnTo = localStorage.getItem("cardrop-returnTo");
      localStorage.removeItem("cardrop-returnTo");
      setLocation(returnTo || "/map-hack");
    } catch (error: any) {
      toast({
        title: t.appleError,
        description: t.appleErrorDesc,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-start mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.back}
            </Button>
          </Link>
        </div>

        <Card className="p-6">
          <div className="flex flex-col items-center mb-6">
            <img src={parkInLogo} alt="CarDrop" className="w-16 h-16 rounded-xl mb-3" />
            <h1 className="text-2xl font-bold text-foreground">CarDrop</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === "login" ? t.loginSubtitle : t.registerSubtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">{t.firstName}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      placeholder={t.firstName}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-9"
                      required
                      data-testid="input-first-name"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">{t.lastName}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      placeholder={t.lastName}
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
              <Label htmlFor="email">{t.email}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={language === "sr" ? "vas@email.com" : "your@email.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t.password}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? t.passPlaceholderRegister : t.passPlaceholderLogin}
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
                ? t.loading
                : mode === "login"
                ? t.submitLogin
                : t.submitRegister}
            </Button>
          </form>

          {(googleClientId || appleClientId) && (
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t.or}</span>
              </div>
            </div>
          )}

          {googleClientId && (
            <div id="google-signin-container" data-testid="google-signin-container">
              <GoogleSignInButton onSuccess={handleGoogleLogin} clientId={googleClientId} loadingText={t.googleLoading} />
            </div>
          )}

          {appleClientId && (
            <div className={googleClientId ? "mt-3" : ""} data-testid="apple-signin-container">
              <AppleSignInButton
                onSuccess={handleAppleLogin}
                clientId={appleClientId}
                label={t.appleSignIn}
              />
            </div>
          )}

          <div className="mt-5 text-center text-sm">
            {mode === "login" ? (
              <p className="text-muted-foreground">
                {t.noAccount}{" "}
                <button
                  onClick={() => setMode("register")}
                  className="text-accent font-medium hover:underline"
                  data-testid="button-switch-to-register"
                >
                  {t.registerLink}
                </button>
              </p>
            ) : (
              <p className="text-muted-foreground">
                {t.hasAccount}{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-accent font-medium hover:underline"
                  data-testid="button-switch-to-login"
                >
                  {t.loginLink}
                </button>
              </p>
            )}
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {t.termsText}{" "}
          <Link href="/terms" className="text-accent hover:underline">
            {t.terms}
          </Link>{" "}
          {t.and}{" "}
          <Link href="/privacy-policy" className="text-accent hover:underline">
            {t.privacy}
          </Link>
        </p>
      </div>
    </div>
  );
}


function AppleSignInButton({
  onSuccess,
  clientId,
  label,
}: {
  onSuccess: (response: any) => void;
  clientId: string;
  label: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      if (!(window as any).AppleID) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Apple Sign-In SDK"));
          document.body.appendChild(script);
        });
      }

      const redirectURI = import.meta.env.VITE_APPLE_REDIRECT_URI || window.location.origin;

      (window as any).AppleID.auth.init({
        clientId,
        scope: "name email",
        redirectURI,
        usePopup: true,
      });

      const response = await (window as any).AppleID.auth.signIn();
      await onSuccess(response);
    } catch (error: any) {
      if (error?.error !== "popup_closed_by_user") {
        console.error("Apple sign-in error:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      data-testid="button-apple-signin"
      style={{ height: 40 }}
      className="w-full flex items-center justify-center gap-3 rounded-md bg-black text-white px-4 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
      </svg>
      {loading ? "..." : label}
    </button>
  );
}

function GoogleSignInButton({
  onSuccess,
  clientId,
  loadingText,
}: {
  onSuccess: (response: any) => void;
  clientId: string;
  loadingText: string;
}) {
  const { language } = useLanguage();
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
          locale: language === "sr" ? "sr" : "en",
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
          {loadingText}
        </Button>
      )}
    </div>
  );
}
