import { Silkscreen } from "next/font/google";
import localFont from "next/font/local";

// uiFont: body text, buttons, window titles and all running text. Cairopixel is a
// pixel font (OFL licence) with readable digits (file in app/fonts).
export const uiFont = localFont({
  src: "../fonts/Cairopixel.ttf",
  display: "swap",
  // the font is drawn small (made for 16px), so enlarge it everywhere
  declarations: [{ prop: "size-adjust", value: "135%" }],
});
// displayFont: the logo and big all-caps headings (no long numbers).
export const displayFont = Silkscreen({ subsets: ["latin"], weight: ["400", "700"] });
