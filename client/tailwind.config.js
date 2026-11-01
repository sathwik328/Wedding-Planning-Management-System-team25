/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        loverly: {
          ivory: "#FAF7F4",
          paper: "#FFFDFB",
          sand: "#F5EFEB",
          blush: "#FDF2F4",
          "blush-border": "#F8D2DA",
          "blush-text": "#8C243B",
          wine: "#3D1420",
          "wine-hover": "#2B0D16",
          gold: "#BFA064",
          "gold-light": "#F7EEDC",
          charcoal: "#24201D",
          muted: "#78716A",
          border: "#EDE6DF",
          "border-light": "#F4EFEA"
        },
        royal: {
          ivory: "#FAF7F4",
          alabaster: "#F5EFEB",
          wine: "#3D1420",
          "wine-dark": "#2B0D16",
          gold: "#BFA064",
          "gold-light": "#F7EEDC",
          charcoal: "#24201D",
          slate: "#4A443E",
          border: "#EDE6DF"
        }
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Inter", "-apple-system", "sans-serif"]
      },
      boxShadow: {
        'loverly': '0 4px 20px rgba(0, 0, 0, 0.03)',
        'loverly-lg': '0 10px 30px rgba(0, 0, 0, 0.05)',
        'loverly-hover': '0 8px 25px rgba(61, 20, 32, 0.08)'
      }
    }
  },
  plugins: []
};
