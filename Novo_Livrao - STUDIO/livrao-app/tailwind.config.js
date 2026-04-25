export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'history-gold': '#C5A059',
                'history-green': '#2C4A3B',
                'parchment': '#FDFBF7',
                'gold-accent': '#D4AF37',
            },
            fontFamily: {
                sans: ['"Inter"', 'sans-serif'],
                serif: ['"Playfair Display"', 'serif'],
                display: ['"Cinzel"', 'serif'],
            },
        },
    },
    plugins: [],
}
