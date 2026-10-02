import type { Metadata } from "next";
import { Assistant, Fraunces, Suez_One } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";

const suez = Suez_One({
  variable: "--font-suez",
  subsets: ["hebrew", "latin"],
  weight: "400",
  display: "swap",
});

const assistant = Assistant({
  variable: "--font-ui",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://chabadpedro.com"),
  title: {
    default: 'בית חב"ד פדרו גואטמלה — הבית היהודי שלך על שפת אגם אטיטלן',
    template: '%s · בית חב"ד פדרו',
  },
  description:
    'אוכל כשר, מניינים, סעודות שבת וחג, מקווה, לינה קרובה וזמני היום בהלכה — כל מה שהמטייל היהודי צריך בסן פדרו לה לגונה, אגם אטיטלן, גואטמלה.',
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: 'בית חב"ד פדרו גואטמלה',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${suez.variable} ${assistant.variable} ${fraunces.variable}`}
    >
      <body suppressHydrationWarning className="antialiased">
        <ClientBody>{children}</ClientBody>
      </body>
    </html>
  );
}
