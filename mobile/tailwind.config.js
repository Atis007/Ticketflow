/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx}",
    "./index.{js,jsx}",
    "./api/**/*.{js,jsx}",
    "./auth/**/*.{js,jsx}",
    "./checkin/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./guards/**/*.{js,jsx}",
    "./hooks/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
    "./notifications/**/*.{js,jsx}",
    "./pages/**/*.{js,jsx}",
    "./query/**/*.{js,jsx}",
    "./validation/**/*.{js,jsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {},
  plugins: [],
};
