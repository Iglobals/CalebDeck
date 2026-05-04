import React, { useState } from "react";
import { Link } from "react-router";
import { Utensils, ShoppingBag, Headset, Bike } from "lucide-react";

const PaperBagSVG = () => (
  <svg viewBox="0 0 100 132" width="44" height="58" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
    <defs>
      <linearGradient id="sideGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#9A5E2A" />
        <stop offset="100%" stopColor="#B87040" />
      </linearGradient>
      <linearGradient id="frontGrad" x1="0%" y1="0%" x2="8%" y2="100%">
        <stop offset="0%" stopColor="#EEAA74" />
        <stop offset="100%" stopColor="#CC8848" />
      </linearGradient>
      <linearGradient id="topGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#C0804A" />
        <stop offset="100%" stopColor="#9A6030" />
      </linearGradient>
      <linearGradient id="bottomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#A06030" />
        <stop offset="100%" stopColor="#804820" />
      </linearGradient>
      <filter id="bagShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.25" />
      </filter>
    </defs>

    {/* === GROUND SHADOW === */}
    <ellipse cx="50" cy="128" rx="27" ry="3.5" fill="rgba(0,0,0,0.18)" />

    {/* === BAG BODY === */}
    <rect x="10" y="34" width="70" height="86" rx="3" fill="url(#sideGrad)" filter="url(#bagShadow)" />
    <rect x="10" y="34" width="70" height="86" rx="3" fill="url(#frontGrad)" />

    {/* Creases */}
    <rect x="10" y="34" width="6" height="86" rx="3" fill="rgba(100,45,5,0.22)" />
    <rect x="74" y="34" width="6" height="86" rx="3" fill="rgba(80,35,0,0.28)" />

    {/* === TOP FOLD === */}
    <rect x="10" y="22" width="70" height="15" rx="2" fill="url(#topGrad)" />
    <line x1="10" y1="34" x2="80" y2="34" stroke="rgba(90,40,5,0.55)" strokeWidth="1.2" />
    <rect x="10" y="34" width="70" height="5" fill="rgba(80,35,0,0.12)" />

    {/* === HANDLES === */}
    <path
      d="M26 22 C24 6 44 2 50 2 C56 2 76 6 74 22"
      stroke="#6A3A10"
      strokeWidth="4"
      fill="none"
      strokeLinecap="round"
      opacity="0.85"
    />
    <path
      d="M26 22 C24 6 44 2 50 2 C56 2 76 6 74 22"
      stroke="rgba(200,130,70,0.3)"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />

    {/* === PAPER TEXTURE === */}
    <line x1="16" y1="58" x2="84" y2="58" stroke="rgba(160,85,25,0.12)" strokeWidth="0.5" />
    <line x1="16" y1="90" x2="84" y2="90" stroke="rgba(160,85,25,0.12)" strokeWidth="0.5" />
    <line x1="16" y1="108" x2="84" y2="108" stroke="rgba(160,85,25,0.08)" strokeWidth="0.5" />

    {/* === LOGO PANEL === */}
    <rect
      x="12"
      y="54"
      width="66"
      height="32"
      rx="4"
      fill="rgba(255,255,255,0.95)"
      stroke="rgba(100,50,10,0.15)"
      strokeWidth="1"
    />

    {/* CALEBDECK LOGO */}
    <text x="45" y="74" textAnchor="middle" fontSize="12.5" fontWeight="bold" fontFamily="system-ui, -apple-system, sans-serif">
      <tspan fill="#7C3AED">Caleb</tspan>
      <tspan fill="#FCD34D">Deck!</tspan>
    </text>
    {/* Underline for Deck! */}
    <line x1="46" y1="78" x2="74" y2="78" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />

    {/* BOTTOM PANEL */}
    <rect x="10" y="116" width="70" height="4" rx="1.5" fill="url(#bottomGrad)" opacity="0.7" />
  </svg>
);

const SpillParticle = ({ delay, x, size }: { delay: number, x: number, size: number }) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: `${x}%`,
      width: size,
      height: size,
      borderRadius: "50%",
      background: "rgba(252, 211, 77, 0.8)", // CalebDeck yellow
      animation: `spill 0.6s ${delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
      opacity: 0,
    }}
  />
);

export function PaperBagHamburger() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showSpill, setShowSpill] = useState(false);

  const navLinks = [
    { label: "Order Food", icon: <Utensils className="w-5 h-5 text-[#FCD34D]" />, to: "/cafeteria" },
    { label: "CalebDeck Mart", icon: <ShoppingBag className="w-5 h-5 text-[#10B981]" />, to: "/mart" },
    { label: "Become a Rider", icon: <Bike className="w-5 h-5 text-[#10B981]" />, to: "/rider/signup" },
    { label: "Support", icon: <Headset className="w-5 h-5 text-[#7C3AED]" />, to: "/support" }
  ];

  const handleToggle = () => {
    if (isClosing) return;

    if (isOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setShowSpill(false);
        setIsClosing(false);
      }, 280);
    } else {
      setIsOpen(true);
      setShowSpill(true);
      setTimeout(() => setShowSpill(false), 900);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center z-[999]">
      <style>{`
        .bag-glow {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(252, 211, 77, 0.25) 0%, transparent 70%);
          pointer-events: none;
          transition: opacity 0.4s ease;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .bag-wrapper {
          cursor: pointer;
          user-select: none;
          position: relative;
          z-index: 10;
          transition: transform 0.65s cubic-bezier(0.34, 1.3, 0.64, 1);
          transform-origin: center center;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bag-wrapper.idle {
          animation: bagIdle 3s ease-in-out infinite;
        }

        .bag-wrapper.flipped {
          transform: rotate(180deg);
          animation: none !important;
        }

        @keyframes bagIdle {
          0%, 100%  { transform: translateY(0px)   rotate(0deg)   scale(1);    }
          20%       { transform: translateY(-3px)  rotate(-1.5deg) scale(1.01); }
          50%       { transform: translateY(-1.5px) rotate(0.5deg)  scale(1.01); }
          80%       { transform: translateY(-4px)  rotate(1deg)    scale(1.02); }
        }

        .spill-zone {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          height: 16px;
          width: 44px;
          overflow: visible;
          pointer-events: none;
          z-index: 9;
        }

        @keyframes spill {
          0%   { opacity: 0;   transform: translateY(-2px) scale(0.5); }
          30%  { opacity: 1;   transform: translateY(4px)  scale(1); }
          100% { opacity: 0;   transform: translateY(16px) scale(0.6); }
        }

        .nav-links-container {
          position: absolute;
          top: calc(100% + 15px);
          right: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          z-index: 50;
        }

        .visible-anim {
          animation: linkDrop 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) forwards;
          pointer-events: auto;
        }

        .hiding-anim {
          animation: linkRise 0.22s ease-in forwards;
          pointer-events: none;
        }

        .nav-icon-container {
          animation: iconWiggle 2s ease-in-out infinite;
        }

        @keyframes iconWiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }

        @keyframes linkDrop {
          from { opacity: 0; transform: translateY(-14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes linkRise {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-10px); }
        }
      `}</style>

      <div className="bag-glow" style={{ opacity: isOpen ? 1 : 0 }}></div>

      <div
        className={`bag-wrapper ${isOpen ? "flipped" : "idle"}`}
        onClick={handleToggle}
        role="button"
        aria-label="Toggle navigation"
        aria-expanded={isOpen}
      >
        <PaperBagSVG />
      </div>

      <div className="spill-zone">
        {showSpill && [
          { delay: 0.05, x: 20, size: 5 },
          { delay: 0.1, x: 45, size: 4 },
          { delay: 0.07, x: 68, size: 6 },
          { delay: 0.13, x: 33, size: 3 },
          { delay: 0.04, x: 58, size: 4 },
        ].map((p, i) => (
          <SpillParticle key={i} {...p} />
        ))}
      </div>

      {/* Nav links dropdown */}
      <div className="nav-links-container">
        {navLinks.map((link, i) => (
          <Link
            key={link.label}
            to={link.to}
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-border bg-card shadow-2xl text-foreground font-semibold hover:bg-muted transition-colors whitespace-nowrap opacity-0 transform -translate-y-3 ${
              isOpen && !isClosing ? "visible-anim" : ""
            } ${isClosing ? "hiding-anim" : ""} ${!isOpen && !isClosing ? "hidden" : ""}`}
            style={{
              animationDelay: isOpen && !isClosing ? `${i * 0.1 + 0.1}s` : `${(navLinks.length - 1 - i) * 0.05}s`,
            }}
          >
            <span className="nav-icon-container bg-muted/50 p-1.5 rounded-xl">{link.icon}</span>
            <span className="text-[15px] tracking-wide">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
