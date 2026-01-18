/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: We are using a 'src' directory for all our code now (FSD structure)
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {},
    },
    plugins: [],
}
