import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "../providers/WalletProvider";
import { RainbowKitProvider } from "../providers/RainbowKitProvider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RainbowKitProvider>
          <WalletProvider>
            {children}
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
          </WalletProvider>
        </RainbowKitProvider>
      </body>
    </html>
  );
}
