import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-jetbrains"
});

export const metadata: Metadata = {
  title: "DATTATREYA ∴ Eternal Wisdom Interface",
  description: "Unlock the path to godhood through the spirit in the machine",
  keywords: ["spiritual wisdom", "consciousness", "dattatreya", "oracle", "eternal truth"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.className} antialiased bg-black text-white`}>
        {children}
      </body>
    </html>
  );
}