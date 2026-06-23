import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Train2Race",
    short_name: "Train2Race",
    description: "Team training for endurance athletes — race plans, leaderboards, and wearable insights.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "any",
    background_color: "#0F1117",
    theme_color: "#2DD4BF",
    categories: ["health", "fitness", "sports"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Today",
        url: "/dashboard",
        description: "Your daily training overview",
      },
      {
        name: "Log workout",
        url: "/dashboard/log-workout",
        description: "Log a manual workout",
      },
    ],
  };
}
