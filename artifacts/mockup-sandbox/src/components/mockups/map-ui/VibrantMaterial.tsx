import { MapPin, Bell, MessageCircle, AlertTriangle, Layers, Plus, ChevronLeft, Shield } from "lucide-react";
import { useState } from "react";

function MaterialMap() {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl" style={{ background: "#eef2ee" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="grid-mat" width="44" height="44" patternUnits="userSpaceOnUse">
            <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#d8e4d8" strokeWidth="1" />
          </pattern>
          <pattern id="streets-mat" width="88" height="88" patternUnits="userSpaceOnUse">
            <rect width="88" height="88" fill="url(#grid-mat)" />
            <path d="M 0 44 L 88 44" stroke="#c8d8c8" strokeWidth="2.5" />
            <path d="M 44 0 L 44 88" stroke="#c8d8c8" strokeWidth="2.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#streets-mat)" />
        {/* Pauk zona */}
        <rect x="12%" y="28%" width="32%" height="24%" fill="rgba(239,68,68,0.1)" rx="8" />
        <rect x="12%" y="28%" width="32%" height="24%" fill="none" stroke="rgba(239,68,68,0.4)" strokeWidth="2" rx="8" />
        {/* Štek */}
        <rect x="57%" y="48%" width="30%" height="22%" fill="rgba(21,128,61,0.1)" rx="8" />
        <rect x="57%" y="48%" width="30%" height="22%" fill="none" stroke="rgba(21,128,61,0.45)" strokeWidth="2" rx="8" />
        {/* Blokovi */}
        <rect x="5%" y="8%" width="22%" height="16%" fill="#dde8dd" rx="5" />
        <rect x="66%" y="10%" width="26%" height="14%" fill="#dde8dd" rx="5" />
        <rect x="35%" y="70%" width="18%" height="14%" fill="#dde8dd" rx="5" />
      </svg>

      {/* Štek marker */}
      <div className="absolute" style={{ top: "46%", left: "72%", transform: "translate(-50%,-100%)" }}>
        <div className="flex flex-col items-center drop-shadow-lg">
          <div className="bg-white border border-green-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-green-700 text-[11px] font-bold">ŠTEK</span>
            <span className="text-green-500 text-[10px]">5 mesta</span>
          </div>
          <div className="w-px h-3 bg-green-400 mx-auto" />
          <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow" />
        </div>
      </div>

      {/* Pauk marker */}
      <div className="absolute" style={{ top: "25%", left: "28%", transform: "translate(-50%,-100%)" }}>
        <div className="flex flex-col items-center drop-shadow-lg">
          <div className="bg-white border border-red-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-red-600 text-[11px] font-bold">PAUK</span>
          </div>
          <div className="w-px h-3 bg-red-400 mx-auto" />
          <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
        </div>
      </div>

      {/* User dot */}
      <div className="absolute" style={{ top: "50%", left: "45%", transform: "translate(-50%,-50%)" }}>
        <div className="relative">
          <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
          <div className="absolute inset-0 w-4 h-4 rounded-full bg-blue-400 animate-ping opacity-40" />
        </div>
      </div>
    </div>
  );
}

export function VibrantMaterial() {
  const [activeTab, setActiveTab] = useState<"map" | "chat" | "alarm">("map");

  return (
    <div
      className="w-full h-screen flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(160deg, #14532d 0%, #166534 45%, #15803d 100%)", fontFamily: "system-ui" }}
    >

      {/* HEADER — gradient */}
      <div className="px-4 pt-4 pb-5 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <button className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <p className="text-white font-bold text-base">Map Hack NS</p>
          <button className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center relative">
            <Bell className="w-4 h-4 text-white" />
            <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-400 border border-green-700" />
          </button>
        </div>

        {/* Avatar + info */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#F5EDD8] ring-2 ring-white/30 flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-green-800 font-bold text-base">PM</span>
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-base leading-tight">ParkMajstor</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="bg-yellow-400 text-yellow-950 text-[9px] font-extrabold px-2 py-0.5 rounded-full">PREMIUM</div>
              <span className="text-green-200 text-xs">Novi Sad</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-[10px]">Live</p>
            <div className="flex items-center gap-1 justify-end">
              <div className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
              <p className="text-green-300 text-xs font-semibold">aktivan</p>
            </div>
          </div>
        </div>
      </div>

      {/* MAP CARD — lebdi nad gradijentom */}
      <div className="flex-1 px-3 relative z-10" style={{ marginTop: "-8px" }}>
        <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ maxHeight: "380px" }}>
          <MaterialMap />
        </div>
      </div>

      {/* SIDE ICONS — floating */}
      <div className="absolute right-3 z-20" style={{ top: "52%" }}>
        <div
          className="flex flex-col gap-2 p-2 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.2)" }}
        >
          <button
            onClick={() => setActiveTab("map")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${activeTab === "map" ? "bg-white shadow-sm" : "bg-white/10"}`}
          >
            <Layers className={`w-4 h-4 ${activeTab === "map" ? "text-green-700" : "text-white"}`} />
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${activeTab === "chat" ? "bg-white shadow-sm" : "bg-white/10"}`}
          >
            <MessageCircle className={`w-4 h-4 ${activeTab === "chat" ? "text-green-700" : "text-white"}`} />
          </button>
          <button
            onClick={() => setActiveTab("alarm")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${activeTab === "alarm" ? "bg-white shadow-sm" : "bg-white/10"}`}
          >
            <Shield className={`w-4 h-4 ${activeTab === "alarm" ? "text-green-700" : "text-white"}`} />
          </button>
        </div>
      </div>

      {/* BOTTOM AREA */}
      <div className="px-4 pb-6 pt-3 relative z-10">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "Štek mesta", value: "5", color: "text-green-300" },
            { label: "Upozorenja", value: "2", color: "text-red-300" },
            { label: "U chatu", value: "14", color: "text-blue-300" },
          ].map((s) => (
            <div key={s.label}
              className="rounded-xl py-2.5 text-center"
              style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-white/50 text-[9px] leading-tight mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Action row */}
        <div className="flex items-center gap-3">
          <button className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/90 shadow-lg shadow-red-500/30">
            <AlertTriangle className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-bold">Prijavi Pauka</span>
          </button>

          {/* FAB */}
          <button className="w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", boxShadow: "0 6px 20px rgba(245,158,11,0.4)" }}>
            <Plus className="w-6 h-6 text-yellow-950" />
          </button>
        </div>
      </div>
    </div>
  );
}
