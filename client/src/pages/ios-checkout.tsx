import { useState, useEffect } from "react";
import { Shield, Check } from "lucide-react";
import { calcStripeFee } from "@shared/stripeFee";

interface CheckoutInfo {
  type: "map_hack" | "spot";
  spotId?: string;
}

const MAP_HACK_PLANS = [
  {
    id: "premium",
    name: "PREMIUM",
    price: 390,
    period: "RSD/mes",
    description: "Safe Zone, Štek, Radar, Push notifikacije",
    gradient: "linear-gradient(145deg, #B8860B 0%, #DAA520 45%, #FFD700 100%)",
    shadow: "rgba(218,165,32,0.35)",
    textClass: "text-yellow-950",
    subClass: "text-yellow-800",
    badge: "Preporučeno",
    ctaDark: true,
    features: ["Štek lokacije", "Safe Zone alarm", "Pauk radar", "Push notifikacije", "Sve buduće funkcije"],
  },
  {
    id: "day_pass",
    name: "DAY PASS",
    price: 120,
    period: "RSD",
    description: "Sve Premium funkcije na 24 sata",
    gradient: "linear-gradient(145deg, #7f1d1d 0%, #dc2626 55%, #ef4444 100%)",
    shadow: "rgba(220,38,38,0.3)",
    textClass: "text-white",
    subClass: "text-red-200",
    badge: "",
    ctaDark: false,
    features: ["Štek lokacije", "Safe Zone alarm", "Pauk radar", "Važi 24 sata"],
  },
  {
    id: "godisnji_premium",
    name: "GODIŠNJI",
    price: 3500,
    period: "RSD/god",
    description: "365 dana pristupa svim Premium funkcijama",
    gradient: "linear-gradient(145deg, #1e1b4b 0%, #312e81 60%, #3730a3 100%)",
    shadow: "rgba(67,56,202,0.25)",
    textClass: "text-white",
    subClass: "text-indigo-300",
    badge: "2 mes. gratis",
    ctaDark: false,
    features: ["Štek lokacije", "Safe Zone alarm", "Pauk radar", "Push notifikacije", "365 dana pristupa"],
  },
];

const SPOT_PLANS = [
  {
    id: "gold",
    name: "GOLD",
    price: 1200,
    period: "RSD",
    description: "Vrh liste, zlatni pin, maksimalna vidljivost",
    gradient: "linear-gradient(145deg, #B8860B 0%, #DAA520 45%, #FFD700 100%)",
    shadow: "rgba(218,165,32,0.35)",
    textClass: "text-yellow-950",
    subClass: "text-yellow-800",
    badge: "",
    ctaDark: true,
    features: ["Zlatni pin na mapi", "Vrh liste rezultata", "180 dana Gold + 180 dana Standard"],
  },
  {
    id: "silver",
    name: "SILVER",
    price: 800,
    period: "RSD",
    description: "Poboljšana vidljivost, srebrni pin",
    gradient: "linear-gradient(145deg, #71717a 0%, #a1a1aa 55%, #d4d4d8 100%)",
    shadow: "rgba(113,113,122,0.3)",
    textClass: "text-zinc-900",
    subClass: "text-zinc-600",
    badge: "",
    ctaDark: true,
    features: ["Srebrni pin na mapi", "Poboljšana pozicija", "90 dana Silver + 90 dana Standard"],
  },
];

export default function IosCheckout() {
  const [info, setInfo] = useState<CheckoutInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    if (!token) {
      setError("Nevažeći link — vrati se u aplikaciju i pokušaj ponovo.");
      setLoading(false);
      return;
    }
    fetch(`/api/ios-checkout/info?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.message) {
          setError(data.message);
          setLoading(false);
          return;
        }
        setInfo(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Greška pri učitavanju. Pokušaj ponovo.");
        setLoading(false);
      });
  }, [token]);

  const handlePay = async (planId: string) => {
    if (!token || paying) return;
    setPaying(planId);
    setError(null);
    try {
      const res = await fetch("/api/ios-checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Greška");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška. Pokušaj ponovo.");
      setPaying(null);
    }
  };

  const plans = info?.type === "spot" ? SPOT_PLANS : MAP_HACK_PLANS;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1B4332" }}>
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm opacity-60">Učitava...</p>
        </div>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#1B4332" }}>
        <div className="text-center max-w-xs">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-2xl">!</span>
          </div>
          <p className="text-white font-bold mb-2">Greška</p>
          <p className="text-white/60 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#1B4332" }}>
      {/* Header */}
      <div className="px-5 pt-10 pb-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#52B788" }}>
            <span className="text-white font-black text-sm">C</span>
          </div>
          <span className="text-white font-extrabold text-2xl tracking-tight">CarDrop</span>
        </div>
        <p className="text-sm font-medium" style={{ color: "#74C69D" }}>
          {info?.type === "spot" ? "Aktiviraj Premium oglas" : "Map Hack NS — Odaberi plan"}
        </p>
      </div>

      {/* Stripe security badge */}
      <div className="mx-5 mb-5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg" style={{ background: "rgba(255,255,255,0.08)" }}>
        <Shield className="w-4 h-4 flex-shrink-0" style={{ color: "#635BFF" }} />
        <span className="text-white/75 text-xs font-medium">Sigurno plaćanje putem</span>
        <span className="text-sm font-extrabold tracking-tight" style={{ color: "#635BFF" }}>stripe</span>
      </div>

      {/* Plan cards */}
      <div className="px-5 flex flex-col gap-3 pb-4">
        {plans.map((plan) => {
          const fee = calcStripeFee(plan.price);
          const total = plan.price + fee;
          const isThisLoading = paying === plan.id;
          const isDisabled = !!paying;

          return (
            <button
              key={plan.id}
              type="button"
              data-testid={`button-ios-plan-${plan.id}`}
              onClick={() => handlePay(plan.id)}
              disabled={isDisabled}
              style={{
                background: plan.gradient,
                boxShadow: `0 3px 18px ${plan.shadow}`,
                opacity: isDisabled && !isThisLoading ? 0.55 : 1,
              }}
              className="w-full text-left rounded-xl p-4 transition-all duration-200"
            >
              {/* Plan header */}
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`${plan.textClass} font-extrabold text-base tracking-wide`}>
                      {plan.name}
                    </span>
                    {plan.badge ? (
                      <span className="bg-green-400 text-green-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                        {plan.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className={`${plan.subClass} text-xs mt-0.5`}>{plan.description}</p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <div className={`${plan.textClass} text-2xl font-extrabold leading-none`}>
                    {plan.price.toLocaleString("sr-RS")}
                  </div>
                  <div className={`${plan.subClass} text-xs`}>{plan.period}</div>
                </div>
              </div>

              {/* Fee breakdown */}
              <div className={`${plan.subClass} text-[11px] mb-3`}>
                + {fee} RSD Stripe naknada &middot; Ukupno:{" "}
                <strong className={plan.textClass}>{total.toLocaleString("sr-RS")} RSD</strong>
              </div>

              {/* Features */}
              <div className="flex flex-col gap-1 mb-3">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Check className={`w-3.5 h-3.5 ${plan.textClass} opacity-70 flex-shrink-0`} />
                    <span className={`${plan.textClass} text-xs opacity-75`}>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div
                className="py-2.5 px-4 rounded-lg text-center font-bold text-sm"
                style={{
                  background: "rgba(0,0,0,0.18)",
                  color: plan.ctaDark ? "#713f12" : "#ffffff",
                }}
              >
                {isThisLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: plan.ctaDark ? "rgba(113,63,18,0.3)" : "rgba(255,255,255,0.3)", borderTopColor: plan.ctaDark ? "#713f12" : "#ffffff" }} />
                    Preusmeravanje...
                  </span>
                ) : (
                  `Plati ${total.toLocaleString("sr-RS")} RSD →`
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-5 mb-4 p-3 rounded-lg text-sm text-center" style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 pb-10 text-center mt-2">
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          Otkaži bilo kada &middot; Bez skrivenih troškova &middot; RSD
        </p>
        <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.22)" }}>
          Stripe naknada: 3.9% + ~35 RSD (0.30&euro;)
        </p>
      </div>
    </div>
  );
}
