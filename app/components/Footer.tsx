import Link from "next/link";
import { jersey } from "./fonts";

const links = [{ href: "/about", label: "ABOUT" }];

export default function Footer() {
  return (
    <footer className="shrink-0 bg-[#101012] px-6 py-5">
      <nav className="flex justify-center gap-6">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`${jersey.className} whitespace-nowrap text-xl text-white hover:text-[#ffc400]`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
