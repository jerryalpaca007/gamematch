import { Pixelify_Sans, Silkscreen } from "next/font/google";

// uiFont: body text, buttons and window titles. displayFont: the logo, big
// titles and numbers (all caps, blocky).
export const uiFont = Pixelify_Sans({ subsets: ["latin"] });
export const displayFont = Silkscreen({ subsets: ["latin"], weight: ["400", "700"] });
