"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Receipt, CheckCircle2, Bell, Smartphone } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Split bills",
      highlight: "together",
      description:
        "Add expenses, split equally or manually, and keep track easily with your friends.",
      renderVisual: () => (
        <div className="relative w-full max-w-[280px] h-[260px] mx-auto flex flex-col items-center justify-center">
          <div className="relative w-44 h-44 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center p-4 shadow-inner">
            {/* Bill Receipt Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-40 text-center animate-bounce-subtle">
              <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center mx-auto mb-2 shadow-xs">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="text-xl font-extrabold text-[#0F172A]">₹1,200</div>
              <div className="space-y-1.5 mt-2.5">
                <div className="h-1.5 bg-slate-200 rounded-full w-3/4 mx-auto" />
                <div className="h-1.5 bg-slate-200 rounded-full w-1/2 mx-auto" />
              </div>
            </div>
          </div>
          {/* Orbiting avatar circles */}
          <div className="absolute top-2 left-4 w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md">
            <Image src="/assets/avatar_girl.jpg" alt="Friend" width={40} height={40} />
          </div>
          <div className="absolute top-4 right-4 w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md">
            <Image src="/assets/avatar_boy.jpg" alt="Friend" width={40} height={40} />
          </div>
          <div className="absolute bottom-2 left-6 w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md">
            <Image src="/assets/avatar_glasses.jpg" alt="Friend" width={40} height={40} />
          </div>
        </div>
      ),
    },
    {
      title: "Track and",
      highlight: "manage easily",
      description:
        "See who owes what, mark payments and never miss a bill again.",
      renderVisual: () => (
        <div className="w-full max-w-[300px] mx-auto space-y-2.5 py-4">
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200">
                <Image src="/assets/avatar_boy.jpg" alt="Rahul" width={36} height={36} />
              </div>
              <div>
                <div className="text-xs font-bold text-[#0F172A]">Rahul paid you</div>
                <div className="text-[10px] text-[#64748B]">2 hours ago</div>
              </div>
            </div>
            <div className="text-xs font-bold text-[#10B981] bg-emerald-50 px-2 py-0.5 rounded-full">
              + ₹300
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-md flex items-center justify-between scale-105 transition-transform">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-[#2563EB]">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#0F172A]">Dinner at Cafe</div>
                <div className="text-[10px] text-[#64748B]">3 people • You paid</div>
              </div>
            </div>
            <div className="text-xs font-bold text-[#0F172A]">₹900</div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200">
                <Image src="/assets/avatar_girl.jpg" alt="Neha" width={36} height={36} />
              </div>
              <div>
                <div className="text-xs font-bold text-[#0F172A]">Pending from Neha</div>
                <div className="text-[10px] text-[#64748B]">1 day ago</div>
              </div>
            </div>
            <div className="text-xs font-bold text-[#EF4444] bg-red-50 px-2 py-0.5 rounded-full">
              ₹300
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Pay with",
      highlight: "any UPI app",
      description:
        "Open your favourite UPI app, pay your share and get back to Splitzy.",
      renderVisual: () => (
        <div className="w-full max-w-[280px] mx-auto py-2 flex flex-col items-center">
          <div className="grid grid-cols-2 gap-3 w-full mb-4">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                G
              </div>
              <span className="text-xs font-bold text-slate-800">Google Pay</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                पे
              </div>
              <span className="text-xs font-bold text-slate-800">PhonePe</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold">
                P
              </div>
              <span className="text-xs font-bold text-slate-800">Paytm</span>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
                C
              </div>
              <span className="text-xs font-bold text-slate-800">CRED UPI</span>
            </div>
          </div>
          <div className="bg-emerald-50 text-[#166534] border border-emerald-200 rounded-xl px-4 py-2 flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span>Simple. Fast. Secure.</span>
          </div>
        </div>
      ),
    },
    {
      title: "Stay in sync",
      highlight: "with friends",
      description:
        "Get notified when someone pays, track pending bills and keep your groups organized.",
      renderVisual: () => (
        <div className="w-full max-w-[290px] mx-auto py-3 space-y-2.5">
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <Image src="/assets/avatar_boy.jpg" alt="Aman" width={32} height={32} />
              </div>
              <div>
                <div className="text-xs font-bold text-[#0F172A]">Aman paid you ₹250</div>
                <div className="text-[10px] text-[#64748B]">2 min ago</div>
              </div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          </div>

          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <Image src="/assets/avatar_girl.jpg" alt="Neha" width={32} height={32} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#0F172A]">Neha marked as paid</div>
              <div className="text-[10px] text-[#64748B]">Dinner at Cafe • 10 min ago</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <Image src="/assets/avatar_glasses.jpg" alt="Rahul" width={32} height={32} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#0F172A]">Rahul added a new bill</div>
              <div className="text-[10px] text-[#64748B]">Goa Trip • 1 hour ago</div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push("/signup");
    }
  };

  const handleSkip = () => {
    router.push("/signup");
  };

  const current = steps[currentStep];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Top Bar with Skip */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs font-semibold text-[#64748B]">
          Step {currentStep + 1} of {steps.length}
        </div>
        <button
          onClick={handleSkip}
          className="text-sm font-bold text-[#2563EB] hover:opacity-80 py-1 px-2"
        >
          Skip
        </button>
      </div>

      {/* Main Content Area */}
      <div className="my-auto py-4 flex flex-col">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
            {current.title}{" "}
            <span className="text-[#2563EB]">{current.highlight}</span>
          </h2>
          <p className="text-sm text-[#64748B] mt-2.5 leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Dynamic visual representation */}
        <div className="min-h-[280px] flex items-center justify-center">
          {current.renderVisual()}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="w-full pb-4 space-y-6">
        {/* Step indicator dots */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? "w-6 bg-[#2563EB]"
                  : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Next / Get Started button */}
        <Button
          fullWidth
          size="lg"
          onClick={handleNext}
          rightIcon={<ArrowRight className="w-5 h-5" />}
        >
          {currentStep === steps.length - 1 ? "Get Started" : "Next"}
        </Button>
      </div>
    </div>
  );
}
