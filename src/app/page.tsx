"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { JoySplitLogo } from "@/components/brand/SplitzyLogo";
import { Button } from "@/components/ui/Button";
import { ArrowRight, ShieldCheck, Zap, Users2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function WelcomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-linear-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#FFFFFF] flex flex-col justify-between p-6 max-w-md mx-auto sm:max-w-xl sm:py-12">
      {/* Top Header / Branding */}
      <div className="pt-4 text-center flex flex-col items-center">
        <JoySplitLogo size="xl" showTagline={true} />
      </div>

      {/* Hero Illustration */}
      <div className="my-auto py-6 flex flex-col items-center">
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden shadow-xl border-4 border-white mb-6">
          <Image
            src="/assets/friends_hero.jpg"
            alt="JoySplit Friends"
            fill
            priority
            className="object-cover"
          />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight text-center">
          Split bills. <br />
          <span className="text-[#2563EB]">Keep friendships.</span>
        </h1>
        <p className="text-sm text-[#64748B] text-center mt-2.5 max-w-xs leading-relaxed">
          The zero-budget expense splitting app for friends, trips, and roommates with instant UPI payment handoff.
        </p>

        {/* Feature Badges */}
        <div className="flex items-center gap-3 mt-4 text-xs font-semibold text-[#0F172A]">
          <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
            <Zap className="w-3.5 h-3.5 text-[#FBBF24]" /> Instant UPI
          </span>
          <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" /> Exact Paise
          </span>
          <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
            <Users2 className="w-3.5 h-3.5 text-[#2563EB]" /> Free Forever
          </span>
        </div>
      </div>

      {/* Bottom CTA actions */}
      <div className="w-full space-y-3 pb-4">
        {user ? (
          <>
            <Button
              fullWidth
              size="lg"
              onClick={() => router.push("/home")}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Go to Dashboard ({user.displayName})
            </Button>
            <Link
              href="/onboarding"
              className="block text-center text-xs font-semibold text-[#2563EB] hover:underline py-1.5"
            >
              View Onboarding Walkthrough
            </Link>
          </>
        ) : (
          <>
            <Button
              fullWidth
              size="lg"
              onClick={() => router.push("/onboarding")}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Get Started
            </Button>
            <Button
              fullWidth
              size="lg"
              variant="secondary"
              onClick={() => router.push("/login")}
            >
              I already have an account
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
