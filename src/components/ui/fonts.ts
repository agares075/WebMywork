import { Noto_Sans_Thai, Permanent_Marker } from "next/font/google";

export const bodyFont = Noto_Sans_Thai({ subsets: ["thai", "latin"], variable: "--font-thai", display: "swap" });
export const displayFont = Permanent_Marker({ weight: "400", subsets: ["latin"], variable: "--font-marker", display: "swap" });
