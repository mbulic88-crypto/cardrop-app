import { useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const planLabels: Record<string, string> = {
  map_hack: "Map Hack",
  day_pass: "Map Hack Day Pass",
  premium: "Map Hack Premium",
  godisnji_premium: "Map Hack Godišnji Premium",
  spot: "Parking oglas",
  silver: "Silver plan",
  gold: "Gold plan",
};

export default function IosDone() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type") || "";
  const plan = params.get("plan") || "";

  const label = planLabels[plan] || planLabels[type] || "Plan";

  useEffect(() => {
    // Try to close the Safari tab — works only if opened via window.open()
    const t = setTimeout(() => {
      try { window.close(); } catch {}
    }, 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1e1e1e] px-6 text-center">
      <CheckCircle className="w-20 h-20 text-[#52B788] mb-6" strokeWidth={1.5} />

      <h1 className="text-2xl font-bold text-white mb-2">Plaćanje uspešno!</h1>
      <p className="text-gray-400 mb-1 text-base">
        <span className="text-[#52B788] font-semibold">{label}</span> je aktiviran.
      </p>
      <p className="text-gray-500 text-sm mb-10">
        Vrati se u CarDrop aplikaciju — plan je već aktivan.
      </p>

      <Button
        className="w-full max-w-xs text-base"
        onClick={() => {
          // Try deep link first (works if Universal Links configured)
          window.location.href = "https://cardrop.app/map-hack";
        }}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Otvori CarDrop
      </Button>
    </div>
  );
}
