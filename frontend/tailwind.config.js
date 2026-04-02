/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        neon:    "#00FF66",
        crimson: "#FF0033",
      },
      dropShadow: {
        neon:    "0 0 15px rgba(0,255,102,0.6)",
        crimson: "0 0 15px rgba(255,0,51,0.6)",
      },
      boxShadow: {
        neon:    "0 0 20px rgba(0,255,102,0.3), 0 0 60px rgba(0,255,102,0.1)",
        crimson: "0 0 20px rgba(255,0,51,0.4)",
      },
      animation: {
        marquee:    "marquee 20s linear infinite",
        float:      "float 6s ease-in-out infinite",
        glow:       "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        marquee: {
          "0%":   { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-20px)" },
        },
        glow: {
          "0%":   { textShadow: "0 0 10px #00FF66, 0 0 20px #00FF66" },
          "100%": { textShadow: "0 0 20px #00FF66, 0 0 40px #00FF66, 0 0 80px #00FF66" },
        },
      },
    },
  },
  plugins: [],
};