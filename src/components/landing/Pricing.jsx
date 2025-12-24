import React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "../../utils";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for exploring AI art generation.",
    features: [
      "50 daily credits",
      "Standard generation speed",
      "Public gallery",
      "Basic editing tools"
    ],
    cta: "Start Creating",
    popular: false
  },
  {
    name: "Pro",
    price: "$15",
    period: "/month",
    description: "For creators who need power and privacy.",
    features: [
      "1000 monthly credits",
      "Fast generation mode",
      "Private gallery",
      "Advanced control tools",
      "Commercial usage rights",
      "Priority support"
    ],
    cta: "Get Pro",
    popular: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Scalable solutions for teams and agencies.",
    features: [
      "Unlimited generation",
      "Custom models training",
      "API access",
      "SSO & Team management",
      "Dedicated account manager"
    ],
    cta: "Contact Sales",
    popular: false
  }
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-32 px-6 bg-[#0A0A0A] border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Simple, transparent <span className="gradient-text">pricing</span>
          </h2>
          <p className="text-xl text-white/50 max-w-2xl mx-auto">
            Choose the plan that best fits your creative needs. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div 
              key={i}
              className={`relative p-8 rounded-3xl border flex flex-col ${
                plan.popular 
                  ? "bg-[#141414] border-[#FF6B35] shadow-2xl shadow-[#FF6B35]/10" 
                  : "bg-white/5 border-white/5"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#FF6B35] text-white text-sm font-bold">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-white/40">{plan.period}</span>}
                </div>
                <p className="text-white/60 text-sm">{plan.description}</p>
              </div>

              <div className="flex-1 mb-8 space-y-4">
                {plan.features.map((feature, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className={`p-1 rounded-full ${plan.popular ? "bg-[#FF6B35]/20 text-[#FF6B35]" : "bg-white/10 text-white/60"}`}>
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-white/80 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Button 
                onClick={() => base44.auth.redirectToLogin(createPageUrl("Generate"))}
                className={`w-full h-12 rounded-xl font-bold transition-all ${
                  plan.popular 
                    ? "btn-gradient text-white hover:scale-105" 
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}