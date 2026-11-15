import Link from "next/link";
import { Jersey_25, Press_Start_2P } from "next/font/google";
import styles from "./Navbar.module.css";

const jersey = Jersey_25({ subsets: ["latin"], weight: "400" });
const pressStart = Press_Start_2P({ subsets: ["latin"], weight: "400" });

const leftLinks = [
  { href: "/signup", label: "SIGN UP" },
  { href: "/login", label: "LOGIN" },
];

const rightLinks = [
  { href: "/library", label: "LIBRARY" },
  { href: "/browse", label: "BROWSE" },
];

const linkClass = `${jersey.className} text-xl text-white whitespace-nowrap hover:text-[#5b7eff]`;

export default function Navbar() {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center bg-[#031273] px-6 py-4">
      <nav className="flex gap-6 justify-end">
        {leftLinks.map((link) => (
          <Link key={link.href} href={link.href} className={linkClass}>
            {link.label}
          </Link>
        ))}
      </nav>

      <Link
        href="/"
        className={`${pressStart.className} text-[28px] tracking-[-1px] text-[#5b7eff] whitespace-nowrap [text-shadow:3px_4px_0_rgba(0,0,0,0.25)]`}
      >
        GAMEMATCH
      </Link>
      <nav className="flex gap-6 justify-start">
        {rightLinks.map((link) => (
          <Link key={link.href} href={link.href} className={linkClass}>
            {link.label}
          </Link>
        ))}
      </nav>
      <Link
        href="/about"
        className={`${linkClass} fixed bottom-6 right-8 z-50`}
      >
        ABOUT
      </Link>
    </header>
  );
}
