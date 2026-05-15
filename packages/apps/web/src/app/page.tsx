import { IsplayRuntime } from "@/components/runtime/IsplayRuntime";
import { About } from "@/components/sections/About";
import { FooterWaves, PreFooter } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { Install } from "@/components/sections/Install";
import { Platform } from "@/components/sections/Platform";
import { Navbar } from "@/components/shared/Navbar";
import { jsonLd } from "@/lib/content";

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="page-wrapper">
        <main className="main-wrapper">
          <Navbar />
          <Hero />
          <About />
          <Platform />
          <Install />
        </main>
        <PreFooter />
        <FooterWaves />
      </div>
      <IsplayRuntime />
    </>
  );
}
