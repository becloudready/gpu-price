import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://freellm.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "GPU Cloud Pricing — Compare H100, A100 & L40S Across Neo Cloud Providers",
    template: "%s | GPU Cloud Pricing",
  },

  description:
    "Compare GPU rental prices in real-time across CoreWeave, RunPod, Lambda Labs, Nebius, Crusoe and more. Find the cheapest H100, A100, and L40S instances for AI training, ML inference, and GPU-intensive workloads. Updated nightly.",

  keywords: [
    // GPU models
    "H100 price per hour",
    "A100 rental cost",
    "L40S cloud pricing",
    "H200 GPU cloud",
    "B200 GPU price",
    "A10 GPU rental",
    "RTX 4090 cloud",
    // use-cases
    "GPU cloud pricing",
    "GPU rental comparison",
    "cheap GPU cloud",
    "GPU compute comparison",
    "GPU workload pricing",
    "cloud GPU per hour",
    "cheapest GPU rental",
    "AI training GPU cost",
    "ML inference pricing",
    "LLM training cost",
    "diffusion model GPU",
    "GPU for fine-tuning",
    // providers
    "CoreWeave GPU pricing",
    "RunPod pricing",
    "Lambda Labs GPU",
    "Nebius cloud GPU",
    "Crusoe energy GPU",
    "Denvr cloud pricing",
    // broad
    "neo cloud providers",
    "NVIDIA GPU cloud",
    "developer GPU resources",
    "compare cloud GPU providers",
  ],

  authors: [{ name: "GPU Cloud Pricing", url: siteUrl }],
  creator: "GPU Cloud Pricing",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "GPU Cloud Pricing",
    title: "GPU Cloud Pricing — Compare H100, A100 & L40S Across Neo Clouds",
    description:
      "Real-time GPU rental pricing across CoreWeave, RunPod, Lambda Labs, Nebius, Crusoe and more. Find the best GPU prices for AI training, ML inference, and GPU workloads. Updated nightly.",
  },

  twitter: {
    card: "summary_large_image",
    title: "GPU Cloud Pricing — Compare GPU Rentals Across Neo Clouds",
    description:
      "Real-time GPU pricing across CoreWeave, RunPod, Lambda Labs and more. Find the cheapest H100, A100 for your AI and ML workloads.",
  },

  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
