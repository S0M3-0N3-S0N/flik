import React from "react";
import { Github, Twitter, Instagram, Linkedin, ArrowUp } from "lucide-react";
import { createPageUrl } from "../../utils";
import { base44 } from "@/api/base44Client";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-white/5 bg-[#050505] pt-20 pb-10 px-6">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold gradient-text mb-4">FLIK</h3>
            <p className="text-white/40 max-w-sm mb-6">
              Empowering creators with next-generation AI tools. 
              Built for artists, designers, and dreamers.
            </p>
            <div className="flex gap-4">
              {/* Social links - placeholders for now but better styled */}
              {[Twitter, Instagram, Github, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="p-2 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-6">Product</h4>
            <ul className="space-y-4">
              <li><button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-white/40 hover:text-[#FF6B35] transition-colors">Features</button></li>
              <li><button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="text-white/40 hover:text-[#FF6B35] transition-colors">Pricing</button></li>
              <li><button onClick={() => base44.auth.redirectToLogin(createPageUrl("Gallery"))} className="text-white/40 hover:text-[#FF6B35] transition-colors">Gallery</button></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-6">Support</h4>
            <ul className="space-y-4">
              <li><button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="text-white/40 hover:text-[#FF6B35] transition-colors">FAQ</button></li>
              <li><a href="mailto:support@flik.ai" className="text-white/40 hover:text-[#FF6B35] transition-colors">Contact Support</a></li>
              <li><a href="#" className="text-white/40 hover:text-[#FF6B35] transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-white/40 hover:text-[#FF6B35] transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/20 text-sm">© {new Date().getFullYear()} Flik AI. All rights reserved.</p>
          <div className="flex items-center gap-8">
            <div className="flex gap-8 text-sm text-white/20">
                <a href="#" className="hover:text-white/40 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white/40 transition-colors">Terms of Service</a>
            </div>
            <button 
                onClick={scrollToTop}
                className="p-2 rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                title="Back to top"
            >
                <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}