import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import OnboardingGuard from "../components/OnboardingGuard";
import { AuthProvider } from "@/contexts/AuthContext";
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
  description:
    "Navigate the world with confidence. SafeHER provides safer routes, community insights, and emergency features.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <OnboardingGuard>{children}</OnboardingGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
