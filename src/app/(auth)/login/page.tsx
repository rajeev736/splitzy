"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { SplitzyLogo } from "@/components/brand/SplitzyLogo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const navigateAfterLogin = () => {
    let target = "/home";
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("joysplit_redirect_to");
      if (saved && saved.startsWith("/") && !saved.startsWith("/login") && !saved.startsWith("/signup")) {
        target = saved;
        sessionStorage.removeItem("joysplit_redirect_to");
      }
    }
    router.replace(target);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!email.trim()) {
      setFormError("Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      toastSuccess("Welcome back to JoySplit!");
      navigateAfterLogin();
    } catch (err: any) {
      const msg = err?.message || "Failed to log in. Please check credentials.";
      setFormError(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      toastSuccess("Logged in successfully with Google!");
      navigateAfterLogin();
    } catch (err: any) {
      toastError(err?.message || "Google login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col justify-between p-6 max-w-md mx-auto transition-colors">
      {/* Top Bar with Back */}
      <div>
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="my-auto py-4">
        <div className="flex flex-col items-center text-center mb-8">
          <SplitzyLogo size="lg" showText={true} />
          <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-slate-100 mt-6 tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1.5 max-w-xs">
            Login to continue splitting bills with your friends.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <div>
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              leftIcon={<Lock className="w-4 h-4" />}
              rightAction={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-slate-800 dark:hover:text-slate-200 p-1 text-slate-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />
            <div className="flex justify-end mt-2">
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {formError && (
            <div className="text-xs text-[#EF4444] font-medium bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-800">
              {formError}
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isLoading}
            className="mt-2"
          >
            Login
          </Button>

          <div className="relative flex items-center justify-center py-2">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-[#F8FAFC] dark:bg-slate-950 px-3 text-xs font-bold text-[#94A3B8] dark:text-slate-500 uppercase tracking-wider">
              OR
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-[#0F172A] dark:text-slate-100 font-semibold py-3 px-4 rounded-xl text-sm shadow-xs transition-all active:scale-[0.99]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </form>
      </div>

      {/* Bottom Link */}
      <div className="text-center text-xs text-[#64748B] dark:text-slate-400 pt-4 pb-2">
        New to JoySplit?{" "}
        <Link href="/signup" className="font-bold text-[#2563EB] dark:text-blue-400 hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}
