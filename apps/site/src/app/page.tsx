import Hero from "@/components/site/Hero";
import QuickAccess from "@/components/site/QuickAccess";
import Provides from "@/components/site/Provides";
import Events from "@/components/site/Events";
import FindUs from "@/components/site/FindUs";
import { AboutBand, ShabbatBand, DonateBand } from "@/components/site/Bands";
import { HomeRegisterStrip } from "@/components/site/RegisterCta";

export default function Home() {
  return (
    <>
      <Hero />
      <HomeRegisterStrip />
      <Provides />
      <ShabbatBand />
      <Events />
      <QuickAccess />
      <AboutBand />
      <FindUs />
      <DonateBand />
    </>
  );
}
