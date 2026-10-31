/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        royal: {
          ivory: "#FDFBF7",
          alabaster: "#F7F4EE",
          wine: "#5B1424",
          "wine-dark": "#430C18",
          gold: "#C5A059",
          "gold-light": "#E8D8B0",
          charcoal: "#1E2229",
          slate: "#334155",
          border: "#E7E2D8"
        }
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Inter", "-apple-system", "sans-serif"]
      }
    }
  },
  plugins: []
};
