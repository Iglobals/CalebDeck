import React, { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../../context/AuthContext";

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
      x="18"
      y="48"
      width="54"
      height="58"
      rx="2.5"
      fill="rgba(255,255,255,0.08)"
      stroke="rgba(100,50,10,0.25)"
      strokeWidth="0.7"
    />

    {/* LOGO MARK */}
    <circle cx="45" cy="60" r="7" fill="rgba(80,35,5,0.12)" />
    <circle cx="45" cy="60" r="6" fill="none" stroke="rgba(80,35,5,0.25)" strokeWidth="0.6" />
    <line x1="43" y1="57" x2="43" y2="63" stroke="#5C2808" strokeWidth="0.9" opacity="0.6" />
    <line x1="45" y1="57" x2="45" y2="63" stroke="#5C2808" strokeWidth="0.9" opacity="0.6" />
    <line x1="47" y1="57" x2="47" y2="63" stroke="#5C2808" strokeWidth="0.9" opacity="0.6" />
    <path d="M43 57 Q43 55 45 55 Q47 55 47 57" fill="none" stroke="#5C2808" strokeWidth="0.8" opacity="0.6" />

    {/* CALEB */}
    <text x="45" y="82" textAnchor="middle" fill="#4A2208" fontSize="9.5" fontWeight="bold" fontFamily="Georgia, 'Times New Roman', serif" letterSpacing="1">
      CALEB
    </text>

    {/* Divider */}
    <line x1="24" y1="86" x2="66" y2="86" stroke="rgba(74,34,8,0.35)" strokeWidth="0.6" />

    {/* DECK */}
    <text x="45" y="97" textAnchor="middle" fill="#4A2208" fontSize="5.5" fontFamily="Georgia, 'Times New Roman', serif" letterSpacing="4.5" opacity="0.85">
      DECK
    </text>

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
      background: "rgba(226,168,80,0.6)",
      animation: `spill 0.6s ${delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
      opacity: 0,
    }}
  />
);

export function PaperBagHamburger() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showSpill, setShowSpill] = useState(false);

  const navLinks = [
    { label: "Order Food", emoji: "🍔", to: "/cafeteria", external: false },
    { label: "CalebDeck Fashion", emoji: "👕", to: "/fashion", external: false },
    user?.icaSub 
        ? { label: "i-CON Profile", emoji: "👤", to: "/profile", external: false }
        : { label: "Become an i-CON", emoji: "🌟", to: `/api/auth/login?return_to=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`, external: true },
    { label: "My Orders", emoji: "🧾", to: "/my-orders", external: false },
    { label: "Support", emoji: "💬", to: "/support", external: false }
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
    <div className="relative font-serif flex flex-col items-center justify-center z-[999]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&display=swap');

        .bag-glow {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(200, 130, 60, 0.15) 0%, transparent 70%);
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
          top: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          z-index: 50;
        }

        .paper-nav-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #E2A86A;
          text-decoration: none;
          font-size: 14px;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 10px 24px;
          border: 1px solid rgba(226, 168, 106, 0.22);
          border-radius: 6px;
          background: rgba(20, 15, 10, 0.95);
          backdrop-filter: blur(8px);
          white-space: nowrap;
          opacity: 0;
          transform: translateY(-12px);
          transition: background 0.2s, color 0.2s, border-color 0.2s;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .paper-nav-link.visible {
          animation: linkDrop 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) forwards;
          pointer-events: auto;
        }

        .paper-nav-link.hiding {
          animation: linkRise 0.22s ease-in forwards;
          pointer-events: none;
        }

        .paper-nav-link.hidden {
          display: none;
        }

        .paper-nav-link:hover {
          background: rgba(40, 25, 10, 0.95);
          color: #F0C070;
          border-color: rgba(226, 168, 106, 0.5);
        }

        .nav-emoji {
          font-size: 16px;
          display: inline-block;
          animation: emojiWiggle 1.5s ease-in-out infinite;
        }

        @keyframes emojiWiggle {
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

      <div className="bag-glow" style={{ opacity: isOpen ? 0.8 : 0 }}></div>

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
          { delay: 0.05, x: 20, size: 4 },
          { delay: 0.1, x: 45, size: 3 },
          { delay: 0.07, x: 68, size: 5 },
          { delay: 0.13, x: 33, size: 2 },
          { delay: 0.04, x: 58, size: 3 },
        ].map((p, i) => (
          <SpillParticle key={i} {...p} />
        ))}
      </div>

      <div className="nav-links-container">
        {navLinks.map((link, i) => {
          if (link.external) {
            return (
              <a
                key={link.label}
                href={link.to}
                className={`paper-nav-link ${
                  isOpen && !isClosing ? "visible" : ""
                } ${isClosing ? "hiding" : ""} ${!isOpen && !isClosing ? "hidden" : ""}`}
                style={{
                  animationDelay: isOpen && !isClosing ? `${i * 0.1 + 0.1}s` : `${(navLinks.length - 1 - i) * 0.05}s`,
                }}
              >
                <span className="nav-emoji">{link.emoji}</span>
                {link.label}
              </a>
            );
          }
          return (
            <Link
              key={link.label}
              to={link.to}
              onClick={() => setIsOpen(false)}
              className={`paper-nav-link ${
                isOpen && !isClosing ? "visible" : ""
              } ${isClosing ? "hiding" : ""} ${!isOpen && !isClosing ? "hidden" : ""}`}
              style={{
                animationDelay: isOpen && !isClosing ? `${i * 0.1 + 0.1}s` : `${(navLinks.length - 1 - i) * 0.05}s`,
              }}
            >
              <span className="nav-emoji">{link.emoji}</span>
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
