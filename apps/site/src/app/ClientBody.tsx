"use client";

import { useEffect } from "react";
import { LocaleProvider } from "@/lib/i18n";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import FloatingWhatsApp from "@/components/site/FloatingWhatsApp";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.body.className = "antialiased";
  }, []);

  return (
    <LocaleProvider>
      <div className="antialiased flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <FloatingWhatsApp />
        <Footer />
      </div>
    </LocaleProvider>
  );
}
