import React from "react";

// Placeholder logos - in production use real SVGs
const Logo = ({ name }) => (
  <div className="flex items-center gap-2 text-white/30 font-bold text-xl uppercase tracking-widest grayscale opacity-50 hover:opacity-100 hover:grayscale-0 transition-all duration-300 cursor-default select-none">
    <div className="w-8 h-8 rounded bg-white/10" />
    {name}
  </div>
);

export default function LogoCloud() {
  return (
    <section className="py-12 border-y border-white/5 bg-[#0A0A0A]/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-sm text-white/40 mb-8 uppercase tracking-widest">Trusted by creative teams at</p>
        <div className="flex flex-wrap justify-center gap-12 md:gap-24 items-center">
          <Logo name="Acme Corp" />
          <Logo name="GlobalArt" />
          <Logo name="NextGen" />
          <Logo name="Studio 44" />
          <Logo name="Visionary" />
        </div>
      </div>
    </section>
  );
}