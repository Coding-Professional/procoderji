"use client";

import React from "react";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { About } from "@/components/landing/about";
import { WhyUs } from "@/components/landing/why-us";

import { FAQ } from "@/components/landing/faq";
import { Contact } from "@/components/landing/contact";
import { Footer } from "@/components/landing/footer";

export function LandingPage() {
    return (
        <div className="min-h-screen text-gray-900 selection:bg-primary selection:text-white font-sans">


            <main id="main-content" className="relative z-10 flex flex-col min-h-screen">
                <Navbar />
                <Hero />
                <About />
                <WhyUs />
                {/* <Services /> */}
                <FAQ />
                <Contact />
                <Footer />
            </main>
        </div>
    );
}