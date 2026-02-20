/** @type {import(''tailwindcss'').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["Sora", "sans-serif"],
      },
      boxShadow: {
        "panel-glow": "0 0 0 1px rgba(124, 58, 237, 0.35), 0 18px 40px rgba(37, 99, 235, 0.25)",
        "soft-xl": "0 24px 60px rgba(0, 0, 0, 0.45)",
      },
    },
  },
  plugins: [],
};

