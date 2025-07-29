import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dattatreya - Spiritual Wisdom Chat",
  description: "Converse with the timeless wisdom of spiritual teachings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}