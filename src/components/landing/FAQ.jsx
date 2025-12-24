import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do the free credits work?",
    answer: "You receive 50 free credits upon signing up. Each image generation typically costs 1 credit. Credits refresh daily on the free plan."
  },
  {
    question: "Can I use the images commercially?",
    answer: "Yes! If you are on our Pro or Enterprise plans, you have full commercial rights to all images you generate."
  },
  {
    question: "What AI models do you use?",
    answer: "We utilize a custom-tuned version of Stable Diffusion XL, optimized for artistic coherence and photorealism, along with ControlNet for precise guidance."
  },
  {
    question: "Can I upload my own reference images?",
    answer: "Absolutely. Our 'Image to Image' and 'ControlNet' features allow you to use uploaded images as a base for structure, composition, or style."
  },
  {
    question: "Is there a mobile app?",
    answer: "Flik is a progressive web app (PWA), meaning it works perfectly in your mobile browser and can be installed to your home screen for an app-like experience."
  }
];

export default function FAQ() {
  return (
    <section className="py-32 px-6 bg-[#0A0A0A]">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12">
          Frequently asked <span className="gradient-text">questions</span>
        </h2>
        
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border border-white/10 rounded-2xl px-6 bg-[#141414]">
              <AccordionTrigger className="text-lg font-medium text-white hover:text-[#FF6B35] transition-colors py-6">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-white/60 text-base pb-6 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}