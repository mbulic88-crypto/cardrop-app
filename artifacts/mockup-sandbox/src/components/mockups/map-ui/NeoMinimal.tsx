import { MapPin, Bell, MessageCircle, AlertTriangle, Navigation, Search, ChevronUp } from "lucide-react";
import { useState } from "react";

function LightMap() {
  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "#f0f4f0" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="grid-light" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8e2" strokeWidth="1" />
          </pattern>
          <pattern id="streets-light" width="80" height="80" patternUnits="userSpaceOnUse">
            <rect width="80" height="80" fill="url(#grid-light)" />
            <path d="M 0 40 L 80 40" stroke="#d4ddd4" strokeWidth="2.5" />
            <path d="M 40 0 L 40 80" stroke="#d4ddd4" strokeWidth="2.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#streets-light)" />
        {/* Zone: pauk zona */}
        <rect x="15%" y="35%" width="28%" height="22%" fill="rgba(239,68,68,0.08)" rx="6" />
        <rect x="15%" y="35%" width="28%" height="22%" fill="none" stroke="rgba(239,68,68,0.35)" strokeWidth="2" rx="6" />
        {/* Zone: štek */}
        <rect x="55%" y="52%" width="28%" height="20%" fill="rgba(22,163,74,0.1)" rx="6" />
        <rect x="55%" y="52%" width="28%" height="20%" fill="none" stroke="rgba(22,163,74,0.4)" strokeWidth="2" rx="6" />
        {/* Blokovi */}
        <rect x="8%" y="12%" width="20%" height="18%" fill="#e8ede8" rx="4" />
        <rect x="62%" y="15%" width="24%" height="15%" fill="#e8ede8" rx="4" />
        <rect x="35%" y="65%" width="16%" height="12%" fill="#e8ede8" rx="4" />
        <rect x="10%" y="62%" width="18%" height="14%" fill="#e8ede8" rx="4" />
      </svg>

      {/* Pin markeri */}
      <div className="absolute" style={{ top: "33%", left: "28%", transform: "translate(-50%, -100%)" }}>
        <div className="flex flex-col items-center">
          <div className="bg-white shadow-lg shadow-red-100 border border-red-100 rounded-full px-2.5 py-1 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-red-600 text-[10px] font-bold">Pauk zona</span>
          </div>
          <div className="w-px h-2 bg-red-300 mx-auto" />
          <div className="w-2 h-2 rounded-full bg-red-400" />
        </div>
      </div>

      <div className="absolute" style={{ top: "50%", left: "69%", transform: "translate(-50%, -100%)" }}>
        <div className="flex flex-col items-center">
          <div className="bg-white shadow-lg shadow-green-100 border border-green-100 rounded-full px-2.5 py-1 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-green-700 text-[10px] font-bold">Štek</span>
          </div>
          <div className="w-px h-2 bg-green-400 mx-auto" />
          <div className="w-2 h-2 rounded-full bg-green-500" />
        </div>
      </div>

      {/* User pin */}
      <div className="absolute" style={{ top: "47%", left: "42%", transform: "translate(-50%, -50%)" }}>
        <div className="relative">
          <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
          <div className="absolute inset-0 w-5 h-5 rounded-full bg-blue-400 animate-ping opacity-30" />
        </div>
      </div>
    </div>
  );
}

export function NeoMinimal() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-white" style={{ fontFamily: "system-ui" }}>

      {/* TOP CARD */}
      <div className="bg-white px-4 pt-4 pb-3 shadow-sm z-20 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F5EDD8] flex items-center justify-center ring-2 ring-green-100 flex-shrink-0">
              <span className="text-green-800 text-sm font-bold">PM</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base leading-tight">ParkMajstor</p>
              <div className="flex items-center gap-1.5">
                <div className="bg-amber-400 text-amber-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full">PREMIUM</div>
                <span className="text-gray-400 text-[10px]">aktivan</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Bell className="w-4 h-4 text-gray-500" />
            </button>
            <button className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
          <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-gray-400 text-sm">Pretraži ulice NS...</span>
        </div>
      </div>

      {/* MAP */}
      <div className="flex-1 relative">
        <LightMap />

        {/* Navigate btn */}
        <button className="absolute right-4 bottom-4 w-10 h-10 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center">
          <Navigation className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* BOTTOM CARD */}
      <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-5 z-20 relative shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />

        {/* 2 CTA dugmeta */}
        <div className="flex gap-2.5 mb-3">
          <button className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-50 border border-red-100">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-red-600 text-sm font-bold">Prijavi Pauka</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-50 border border-green-100">
            <MapPin className="w-4 h-4 text-green-600" />
            <span className="text-green-700 text-sm font-bold">Štek Mesta</span>
          </button>
        </div>

        {/* Live info strip */}
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-gray-600 text-xs font-medium">Live praćenje</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400 text-xs">3 parkinga slobodna</span>
          </div>
        </div>
      </div>
    </div>
  );
}
