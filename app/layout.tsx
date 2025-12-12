import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import OnboardingGuard from "../components/OnboardingGuard";
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
  title: "SafeHER - Your Safety Companion",
  description: "Navigate the world with confidence. SafeHER provides safer routes, community insights, and emergency features for women's safety.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <OnboardingGuard>
          {children}
        </OnboardingGuard>
      </body>
    </html>
  );
}
