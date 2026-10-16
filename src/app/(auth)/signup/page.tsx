"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Camera,
  AtSign,
  ArrowRight,
  UserCheck,
  LogOut,
  RefreshCw,
  MailCheck,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { generateRandomSplitzyId } from "@/lib/firebase/splitzyId";
import { getFriendlyAuthErrorMessage } from "@/lib/firebase/errors";

type SignupStep = "account" | "verify" | "profile";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    fbUser,
    isEmailVerified,
    signup,
    updateProfile,
    loginWithGoogle,
    logout,
    sendVerificationEmail,
    reloadUser,
    isLoading: authLoading,
  } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [step, setStep] = useState<SignupStep>("account");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Email verification screen states
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);

  // Profile setup fields - dynamically initialized with a clean random ID
  const [splitzyId, setSplitzyId] = useState<string>(() => generateRandomSplitzyId());
  const [upiId, setUpiId] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("/assets/avatar_boy.jpg");
  const [copiedId, setCopiedId] = useState(false);

  // Read URL query params
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam && !email) {
      setEmail(emailParam);
    }
    const stepParam = searchParams.get("step");
    if (stepParam === "verify") {
      setStep("verify");
    } else if (stepParam === "profile") {
      setStep("profile");
    }
  }, [searchParams, email]);

  // Synchronize authentication and onboarding state
  useEffect(() => {
    if (user) {
      if (user.onboardingCompleted) {
        // Handled in already-authenticated screen
      } else {
        const isPasswordAccount = fbUser?.providerData?.some(
          (p: any) => p.providerId === "password"
        );
        // If registered with password and not verified, keep on verification step
        if (isPasswordAccount && !isEmailVerified) {
          setStep("verify");
        } else if (isEmailVerified || step === "profile") {
          setStep("profile");
        }

        if (user.displayName && !fullName) {
          setFullName(user.displayName);
        }
        if (user.splitzyId) {
          setSplitzyId(user.splitzyId);
        }
        if (user.upiId && !upiId) {
          setUpiId(user.upiId);
        }
        if (user.photoURL) {
          setSelectedAvatar(user.photoURL);
        }
      }
    }
  }, [user, fbUser, isEmailVerified, step, fullName, upiId]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-polling for email verification (without requiring manual reload)
  useEffect(() => {
    if (step !== "verify" || isEmailVerified) return;

    let isMounted = true;
    const pollInterval = setInterval(async () => {
      try {
        const verified = await reloadUser();
        if (verified && isMounted) {
          toastSuccess("Email verified! Let's set up your profile.");
          setStep("profile");
        }
      } catch (e) {
        // Ignore background polling errors
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [step, isEmailVerified, reloadUser, toastSuccess]);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const generatedId = generateRandomSplitzyId();
      setSplitzyId(generatedId);
      await signup(fullName.trim(), email.trim(), password, generatedId);
      setUpiId(`${fullName.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`);
      setStep("verify");
      setResendCooldown(60);
      toastSuccess("Account created! A verification link was sent to your email.");
    } catch (err: any) {
      console.error("Signup submission error:", err);
      const friendly = getFriendlyAuthErrorMessage(err);
      setErrorMsg(friendly);
      toastError(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await loginWithGoogle();
      if (res.onboardingCompleted) {
        toastSuccess("Welcome back to Splitzy!");
        router.push("/home");
      } else {
        setStep("profile");
        toastSuccess("Signed in with Google! Let's complete your profile.");
      }
    } catch (err: any) {
      const friendly = getFriendlyAuthErrorMessage(err);
      setErrorMsg(friendly);
      toastError(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsCheckingVerification(true);
    try {
      const isVerified = await reloadUser();
      if (isVerified) {
        toastSuccess("Email verified successfully! Setting up your profile...");
        setStep("profile");
      } else {
        toastError("Email is not verified yet. Please check your inbox or spam folder.");
      }
    } catch (err: any) {
      toastError(err?.message || "Failed to check verification status.");
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    try {
      await sendVerificationEmail();
      setResendCooldown(60);
      toastSuccess("A new verification link has been sent to your email.");
    } catch (err: any) {
      const friendly = getFriendlyAuthErrorMessage(err);
      toastError(friendly);
    }
  };

  const handleProfileComplete = async () => {
    if (!user) {
      toastError("Your session expired. Please log in again.");
      router.push("/login");
      return;
    }

    if (!fullName.trim()) {
      toastError("Please enter your name.");
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile({
        displayName: fullName.trim() || user.displayName || "User",
        upiId: upiId.trim() || "",
        photoURL: selectedAvatar,
        onboardingCompleted: true,
      });
      toastSuccess("Profile configured successfully!");
      router.push("/home");
    } catch (err: any) {
      console.error("Profile update error:", err);
      toastError(err?.message || "Could not update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(splitzyId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // If already authenticated with completed profile
  if (!authLoading && user && user.onboardingCompleted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col justify-between p-6 max-w-md mx-auto transition-colors">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="my-auto py-6 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-200 dark:border-blue-900 shadow-sm">
            <UserCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-slate-100 mb-2">
            Already Signed In
          </h2>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mb-6 max-w-xs mx-auto">
            You are currently signed in as <span className="font-semibold text-slate-800 dark:text-slate-200">{user.displayName}</span> ({user.email}).
          </p>

          <div className="space-y-3">
            <Button
              fullWidth
              size="lg"
              onClick={() => router.push("/home")}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Dashboard
            </Button>
            <Button
              fullWidth
              variant="outline"
              size="lg"
              onClick={async () => {
                await logout();
                setFullName("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setStep("account");
                toastSuccess("Signed out successfully");
              }}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Sign out of this account
            </Button>
          </div>
        </div>

        <div className="py-2" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col justify-between p-6 max-w-md mx-auto transition-colors">
      {/* Top Bar with Back */}
      <div>
        <button
          onClick={() => {
            if (step === "profile") {
              if (user) {
                router.push("/home");
              } else {
                setStep("account");
              }
            } else if (step === "verify") {
              setStep("account");
            } else {
              router.back();
            }
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {step === "account" && (
        /* Screen 1: Sign Up Form */
        <div className="my-auto py-2">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-slate-100 tracking-tight">
              Create your <br />
              <span className="text-[#2563EB] dark:text-blue-500">account</span>
            </h1>
            <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1.5">
              Join Splitzy and start splitting bills with your friends.
            </p>
          </div>

          <form onSubmit={handleAccountSubmit} className="space-y-3.5">
            <Input
              label="Full name"
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setErrorMsg("");
              }}
              placeholder="e.g. Rajeev Ranjan"
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMsg("");
              }}
              placeholder="name@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMsg("");
              }}
              placeholder="At least 6 characters"
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

            <Input
              label="Confirm password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrorMsg("");
              }}
              placeholder="Re-enter your password"
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            {errorMsg && (
              <div className="text-xs text-[#EF4444] font-medium bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-800">
                {errorMsg}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
              className="mt-2"
            >
              Create account
            </Button>

            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-[#F8FAFC] dark:bg-slate-950 px-3 text-xs font-bold text-[#94A3B8] dark:text-slate-500 uppercase tracking-wider">
                OR
              </span>
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleSignup}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-[#0F172A] dark:text-slate-100 font-semibold py-3 px-4 rounded-xl text-sm shadow-xs transition-all active:scale-[0.99]"
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
      )}

      {step === "verify" && (
        /* Screen 2: Email Verification Pending */
        <div className="my-auto py-4 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-200 dark:border-blue-900 shadow-sm animate-pulse">
            <MailCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-slate-100 mb-2">
            Verify your email
          </h2>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mb-2 max-w-xs mx-auto">
            We sent a verification link to:
          </p>
          <div className="inline-block bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
            {email || fbUser?.email || "your email"}
          </div>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mb-6 max-w-xs mx-auto leading-relaxed">
            Click the link in the email to verify. This page will <strong>automatically continue</strong> to profile setup without reloading once verified!
          </p>

          <div className="space-y-3">
            <Button
              fullWidth
              size="lg"
              isLoading={isCheckingVerification}
              onClick={handleCheckVerification}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              I have verified my email
            </Button>

            <button
              type="button"
              disabled={resendCooldown > 0}
              onClick={handleResendVerification}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline py-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? "animate-spin" : ""}`} />
              {resendCooldown > 0
                ? `Resend link in ${resendCooldown}s`
                : "Resend verification email"}
            </button>

            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium pt-2"
            >
              Back to Login
            </button>
          </div>
        </div>
      )}

      {step === "profile" && (
        /* Screen 3: Profile Setup Screen */
        <div className="my-auto py-2">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-slate-100 tracking-tight">
              Set up <br />
              <span className="text-[#2563EB] dark:text-blue-500">your profile</span>
            </h1>
            <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1.5">
              Add a few details to get started with Splitzy.
            </p>
          </div>

          {/* Avatar selector */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg mb-3">
              <Image src={selectedAvatar} alt="Profile Avatar" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
                <Camera className="w-6 h-6 text-white drop-shadow-md" />
              </div>
            </div>
            <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400 mb-2">
              Choose your avatar
            </span>
            <div className="flex items-center gap-3">
              {[
                "/assets/avatar_boy.jpg",
                "/assets/avatar_girl.jpg",
                "/assets/avatar_glasses.jpg",
              ].map((img) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setSelectedAvatar(img)}
                  className={`relative w-11 h-11 rounded-full overflow-hidden border-2 transition-all ${
                    selectedAvatar === img
                      ? "border-[#2563EB] scale-110 shadow-md ring-2 ring-blue-200 dark:ring-blue-900"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image src={img} alt="Avatar option" fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rajeev Ranjan"
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            {/* Splitzy ID Card */}
            <div>
              <label className="text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5 block">
                Splitzy ID (unique)
              </label>
              <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                    ID
                  </div>
                  <span className="font-mono font-bold text-[#0F172A] dark:text-slate-100 text-sm tracking-wider">
                    {splitzyId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1.5 text-slate-500 hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors"
                  title="Copy ID"
                >
                  {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
                Friends use this unique ID to find and add you.
              </p>
            </div>

            <Input
              label="UPI ID (optional)"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              hint="For receiving payments directly"
              leftIcon={<AtSign className="w-4 h-4" />}
            />

            <Button
              fullWidth
              size="lg"
              isLoading={isLoading}
              onClick={handleProfileComplete}
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="mt-2"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Bottom Link */}
      <div className="text-center text-xs text-[#64748B] dark:text-slate-400 pt-4 pb-2">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-[#2563EB] dark:text-blue-400 hover:underline">
          Login
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950" />}>
      <SignupForm />
    </Suspense>
  );
}
