import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Snappy Atelier — Choice-Driven Global Corporate Gifting & Logistics",
  description:
    "Curated luxury gift collections, AI studio merchandising, multi-checkpoint carrier logistics, and recipient choice across NA, EMEA, APAC & LATAM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[#FAF8F5] text-[#141210] antialiased selection:bg-[#D95D39]/20 selection:text-[#141210]">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}

