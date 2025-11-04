import type { Metadata } from "next";
import { Epilogue, Krub } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "../providers/WalletProvider";
import { RainbowKitProvider } from "../providers/RainbowKitProvider";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Footer from "../components/Footer";

const epilogue = Epilogue({
  variable: "--font-epilogue",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: 'swap',
});

const krub = Krub({
  variable: "--font-krub",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "KeyRing Protocol",
  description: "Hedera Trust Layer for Threshold Keys",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${epilogue.variable} ${krub.variable}`}>
      <body
        className={`${krub.className} antialiased flex flex-col min-h-screen`}
      >
        <RainbowKitProvider>
          <WalletProvider>
            <div className="flex flex-col min-h-screen">
              {children}
              <Footer />
            </div>
            <Toaster 
              position="bottom-right" 
              theme="dark"
              toastOptions={{
                style: {
                  background: '#2a2a2a',
                  color: '#ffffff',
                  border: '1px solid #3a3a3a',
                },
              }}
            />
            <Analytics />
            <SpeedInsights />
          </WalletProvider>
        </RainbowKitProvider>
      </body>
    </html>
  );
}
