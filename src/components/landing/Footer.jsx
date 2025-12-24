import React from "react";
import { Github, Twitter, Instagram, Linkedin } from "lucide-react";

export default function Footer() {
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
              <a href="#" className="p-2 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-6">Product</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-white/40 hover:text-[#FF6B35] transition-colors">Features</a></li>
              <li><a href="#" className="text-white/40 hover:text-[#FF6B35] transition-colors">Gallery</a></li>
              <li><a href="#" className="text-white/40 hover:text-[#FF6B35] transition-colors">Pricing</a></li>
              <li><a href="#" className="text-white/40 hover:text-[#FF6B35] transition-colors">API</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-6">Company</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-white/40 hover:text-[#FF6B35] transition-colors">About</a></li>
              <li><a href="#" className="text-white/40 hover:text-[#FF6B35] transition-colors">Blog</a></li>
              <li><a href="#" className="text-white/40 hover:text-[#FF6B35] transition-colors">Careers</a></li>
              <li><a href="#" className="text-white/40 hover:text-[#FF6B35] transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/20 text-sm">© 2024 Flik AI. All rights reserved.</p>
          <div className="flex gap-8 text-sm text-white/20">
            <a href="#" className="hover:text-white/40 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white/40 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}