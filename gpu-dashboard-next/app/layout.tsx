import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GPU Price Intelligence | Compare Cloud GPU Pricing",
    template: "%s | GPU Price Intelligence",
  },
  description:
    "Compare real-time cloud GPU pricing across multiple providers. Analyze VRAM, vCPUs, RAM, and hourly costs to find the best GPU deals for AI and ML workloads.",
  keywords: [
    "GPU cloud pricing",
    "compare GPU prices",
    "AI GPU hosting",
    "cloud GPU providers",
    "GPU rental cost",
  ],
  authors: [{ name: "Jash Patel" }],
  creator: "Jash Patel",
  openGraph: {
    title: "GPU Price Intelligence",
    description:
      "Find and compare the best cloud GPU deals instantly.",
    siteName: "GPU Price Intelligence",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GPU Price Intelligence",
    description:
      "Compare cloud GPU pricing and find the best AI infrastructure deals.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        {children}
      </body>
    </html>
  );
}