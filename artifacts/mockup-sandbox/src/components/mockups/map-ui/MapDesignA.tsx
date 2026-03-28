import { Bell, MessageCircle, AlertTriangle, Crosshair, Shield, Zap } from "lucide-react";
import { useState } from "react";

function DarkSimMap() {
  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "#0d1117" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="grid-a" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#1c2333" strokeWidth="1.5" />
          </pattern>
          <pattern id="streets-a" width="96" height="96" patternUnits="userSpaceOnUse">
            <rect width="96" height="96" fill="url(#grid-a)" />
            <path d="M 0 48 L 96 48" stroke="#252d3d" strokeWidth="3" />
            <path d="M 48 0 L 48 96" stroke="#252d3d" strokeWidth="3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#streets-a)" />
        <rect x="20%" y="30%" width="25%" height="20%" fill="rgba(239,68,68,0.12)" rx="4" />
        <rect x="20%" y="30%" width="25%" height="20%" fill="none" stroke="rgba(239,68,68,0.4)" strokeWidth="1.5" rx="4" strokeDasharray="4 3" />
        <rect x="58%" y="50%" width="22%" height="18%" fill="rgba(34,197,94,0.12)" rx="4" />
        <rect x="58%" y="50%" width="22%" height="18%" fill="none" stroke="rgba(34,197,94,0.4)" strokeWidth="1.5" rx="4" strokeDasharray="4 3" />
        <rect x="10%" y="15%" width="18%" height="12%" fill="#141b2d" rx="3" />
        <rect x="65%" y="18%" width="20%" height="10%" fill="#141b2d" rx="3" />
        <rect x="40%" y="60%" width="15%" height="10%" fill="#141b2d" rx="3" />
      </svg>

      <div className="absolute" style={{ top: "28%", left: "18%", transform: "translate(-50%,-100%)" }}>
        <div className="flex flex-col items-center">
          <div className="bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-red-500/40 border border-red-400/30">PAUK ZONA</div>
          <div className="w-0.5 h-2 bg-red-400/60 mx-auto" />
        </div>
      </div>
      <div className="absolute" style={{ top: "48%", left: "68%", transform: "translate(-50%,-100%)" }}>
        <div className="flex flex-col items-center">
          <div className="bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-green-500/40 border border-green-400/30">ŠTEK</div>
          <div className="w-0.5 h-2 bg-green-400/60 mx-auto" />
        </div>
      </div>

      <div className="absolute top-3 right-3">
        <div className="bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-full px-2.5 py-1 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span className="text-red-300 text-[10px] font-semibold">2 upozorenja</span>
        </div>
      </div>
    </div>
  );
}

export function MapDesignA() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden" style={{ background: "#080c14", fontFamily: "system-ui" }}>

      {/* TOP BAR — glass */}
      <div
        className="relative z-20 flex items-center justify-between px-4 py-3"
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-green-500/40 flex-shrink-0 flex items-center justify-center" style={{ background: "#1a2235" }}>
            <span className="text-green-400 text-xs font-bold">PM</span>
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">ParkMajstor</p>
            <p className="text-green-400 text-[10px] font-medium">PREMIUM · aktivan</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Bell className="w-3.5 h-3.5 text-green-400" />
          </button>
          <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <MessageCircle className="w-3.5 h-3.5 text-white/60" />
          </button>
        </div>
      </div>

      {/* MAP */}
      <div className="flex-1 relative">
        <DarkSimMap />
        <button
          className="absolute right-4 bottom-4 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <Crosshair className="w-4 h-4 text-white/70" />
        </button>
      </div>

      {/* BOTTOM GLASS PILL */}
      <div className="relative z-20 px-4 pb-6 pt-2">
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/70 text-xs">Live praćenje aktivno</span>
            </div>
            <span className="text-white/40 text-xs">Novi Sad centar</span>
          </div>

          {/* 3 akcije: Prijavi, Chat, Centar */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setActive("prijavi")}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
              style={{
                background: active === "prijavi" ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${active === "prijavi" ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.2)"}`,
              }}
            >
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-[10px] font-semibold">Prijavi</span>
              <span className="text-red-400/60 text-[9px]">Pauka</span>
            </button>

            <button
              onClick={() => setActive("chat")}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
              style={{
                background: active === "chat" ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.1)",
                border: `1px solid ${active === "chat" ? "rgba(139,92,246,0.5)" : "rgba(139,92,246,0.2)"}`,
              }}
            >
              <MessageCircle className="w-4 h-4 text-violet-400" />
              <span className="text-violet-300 text-[10px] font-semibold">Chat</span>
              <span className="text-violet-400/60 text-[9px]">Vozači</span>
            </button>

            <button
              onClick={() => setActive("centar")}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
              style={{
                background: active === "centar" ? "rgba(34,197,94,0.25)" : "rgba(34,197,94,0.1)",
                border: `1px solid ${active === "centar" ? "rgba(34,197,94,0.5)" : "rgba(34,197,94,0.2)"}`,
              }}
            >
              <Crosshair className="w-4 h-4 text-green-400" />
              <span className="text-green-300 text-[10px] font-semibold">Centar</span>
              <span className="text-green-400/60 text-[9px]">Mape</span>
            </button>
          </div>

          <div
            className="mt-2.5 rounded-xl px-3 py-2.5 flex items-center gap-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Zap className="w-3 h-3 text-yellow-400/70 flex-shrink-0" />
            <span className="text-white/30 text-[11px]">Videli ste pauka? Javite vozačima...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
