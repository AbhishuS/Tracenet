// frontend/src/components/Navbar.jsx

import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { to: "/",             label: "Home"         },
    { to: "/fraud",        label: "Surveillance" },
    { to: "/transactions", label: "Ledger"       },
  ];

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-black/80 backdrop-blur-md border-b border-[#00FF66]/20" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <Activity className="text-[#00FF66] drop-shadow-neon" size={22} />
          <span className="text-white font-bold text-xl tracking-tight font-mono">
            Trace<span className="text-[#00FF66] text-shadow-neon">Net</span>
          </span>
        </div>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end>
              {({ isActive }) => (
                <span className={`px-4 py-1.5 rounded-md text-xs font-mono tracking-wide transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "text-[#00FF66] bg-[#00FF66]/10 border border-[#00FF66]/30 drop-shadow-neon"
                    : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}>
                  {l.label}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="neon-btn !py-1.5 !px-4 !text-xs !font-mono"
          >
            [ INIT SYSTEM ]
          </button>
        </div>
      </div>
    </motion.nav>
  );
}