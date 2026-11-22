import Link from "next/link";
import { Press_Start_2P } from "next/font/google";
import NavMenu from "./NavMenu";

const pressStart = Press_Start_2P({ subsets: ["latin"], weight: "400" });

export default function Navbar() {
  return (
    <header className="relative z-40 grid grid-cols-[1fr_auto_1fr] items-center gap-3 overflow-x-clip border-b-4 border-[#e0201b] bg-[#262629] px-3 py-3 md:px-6 md:py-4">
      <NavMenu />

      <Link
        href="/"
        className={`${pressStart.className} text-[24px] tracking-[-1px] text-[#e0201b] whitespace-nowrap [text-shadow:3px_3px_0_#7a0e0b] md:text-[28px]`}
      >
        GAMEMATCH
      </Link>

      {/* Empty right column keeps the logo centered */}
      <div />
    </header>
  );
}
