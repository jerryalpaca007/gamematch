import Link from "next/link";
import { uiFont } from "./fonts";

const links = [{ href: "/about", label: "About" }];

// Styled like a window's status bar: sunken cells along the bottom edge
export default function Footer() {
  const cell = "retro-inset bg-[#3b3a44] px-3 py-1";
  return (
    <footer
      className={`${uiFont.className} shrink-0 border-t-2 border-[#d62fb8] bg-[#14122b] px-3 py-2 text-sm text-[#ece9ff]`}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-2">
        <span className={`${cell} flex-1`}>Done</span>
        <nav className={`${cell} flex gap-4`}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap font-bold hover:text-[#4fe3f0]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <span className={`${cell} hidden sm:block`}>GameMatch</span>
      </div>
    </footer>
  );
}
