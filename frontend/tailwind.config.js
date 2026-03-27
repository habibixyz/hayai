/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}", "./hooks/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      colors: {
        bg:       "#0a0e13",
        surface:  "#111720",
        "surface-2": "#161d28",
        border:   "#1e2a38",
        muted:    "#243040",
        accent:   "#00e8c6",
        "accent-2": "#00b8a0",
        green:    "#0cd98a",
        red:      "#f0444b",
        blue:     "#3b8ef0",
        gold:     "#f0b429",
      },
      animation: {
        "slide-up": "slideUp 0.3s ease both",
        "fade-in":  "fadeIn 0.25s ease both",
      },
      keyframes: {
        slideUp: { from:{opacity:0,transform:"translateY(10px)"}, to:{opacity:1,transform:"none"} },
        fadeIn:  { from:{opacity:0}, to:{opacity:1} },
      },
    },
  },
  plugins: [],
};
