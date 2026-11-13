import React from "react";
import { Navbar } from "@/components/landing/navbar";
import { Hero, NotesFinder } from "@/components/landing/hero";
import { About } from "@/components/landing/about";
import { WhyUs } from "@/components/landing/why-us";
import { GamesSection } from "@/components/landing/games";

import { FAQ } from "@/components/landing/faq";
import { Contact } from "@/components/landing/contact";
import { Footer } from "@/components/landing/footer";

export function LandingPage({
  latestVideos,
}: {
  latestVideos?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main id="main-content">
        <Hero />
        <WhyUs />
        <NotesFinder />
        <GamesSection />
        <About />
        {latestVideos}
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
