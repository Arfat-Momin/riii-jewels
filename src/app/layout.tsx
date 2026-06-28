import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { PopupProvider } from "@/lib/popup-context";
import IntroAnimation from "@/components/IntroAnimation";

export const metadata: Metadata = {
  title: "Riii Jewels by Areesha | Premium Anti-Tarnish Jewelry",
  description: "Founded by two sisters from Bhiwandi, Thane. Hand-picked, premium anti-tarnish jewelry for the modern woman. Explore our carefully curated collections.",
  keywords: ["jewelry", "anti-tarnish", "premium", "rings", "necklaces", "earrings", "bracelets", "anklets"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-cream text-charcoal antialiased font-sans">
        <IntroAnimation />
        <PopupProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </PopupProvider>
      </body>
    </html>
  );
}
