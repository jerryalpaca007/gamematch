import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "GameMatch",
  description: "Swipe for your next PC game based on your current mood",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-amber-50 text-amber-950 dark:bg-stone-950 dark:text-amber-50 antialiased">
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
