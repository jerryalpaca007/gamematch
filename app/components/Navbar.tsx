import Link from "next/link";
import { displayFont } from "./fonts";
import NavMenu from "./NavMenu";

export default function Navbar() {
  return (
    <header className="relative z-40 grid grid-cols-[1fr_auto_1fr] items-center gap-3 overflow-x-clip border-b-2 border-[#d62fb8] bg-[#14122b] px-3 py-3 shadow-[0_2px_18px_rgba(214,47,184,0.45)] md:px-6 md:py-3">
      <NavMenu />

      <Link
        href="/"
        className={`${displayFont.className} retro-glitch whitespace-nowrap text-[22px] font-bold tracking-wider text-white md:text-[28px]`}
      >
        GAMEMATCH
      </Link>

      {/* Empty right column keeps the logo centered */}
      <div />
    </header>
  );
}
