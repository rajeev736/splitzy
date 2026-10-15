"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { success } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSent(true);
      success("Password reset instructions sent!");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between p-6 max-w-md mx-auto">
      <div>
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="my-auto py-4">
        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Check your email</h1>
            <p className="text-sm text-[#64748B] max-w-xs mx-auto">
              We have sent password recovery instructions to <strong className="text-slate-800">{email}</strong>.
            </p>
            <Button fullWidth onClick={() => router.push("/login")}>
              Back to Login
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
                Reset your password
              </h1>
              <p className="text-sm text-[#64748B] mt-1.5">
                Enter your registered email address and we will send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
                Send Reset Link
              </Button>
            </form>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-[#64748B] pt-4 pb-2">
        Remember your password?{" "}
        <Link href="/login" className="font-bold text-[#2563EB] hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
