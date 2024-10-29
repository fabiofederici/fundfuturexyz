// app/manifest.js
export default function manifest() {
    return {
        name: "FundFuture",
        short_name: "FundFuture",
        description: "The latest in onchain funds & tokenization news.",
        start_url: "/",
        display: "standalone",
        background_color: "#fefefe",
        theme_color: "#010101",
        icons: [
            {
                src: "/img/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any maskable"
            },
            {
                src: "/img/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable"
            }
        ]
    }
}