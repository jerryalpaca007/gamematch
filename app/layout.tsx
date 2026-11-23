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
      <body className="retro-bg flex min-h-screen flex-col text-[#ece9ff] antialiased">
        <Navbar />
        {children}
        <Footer />
        <div className="retro-scanlines" aria-hidden />
      </body>
    </html>
  );
}
