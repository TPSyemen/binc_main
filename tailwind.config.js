
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./styles/**/*.css"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#252B42",
        secondary: "#23A6F0",
        "light-gray": "#FAFAFA",
        success: "#2DC071",
        danger: "#E74040",
      },

      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
}
