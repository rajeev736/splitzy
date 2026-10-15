"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { generateRandomSplitzyId } from "@/lib/firebase/splitzyId";

export default function SignupPage() {
  const router = useRouter();
  const { signup, updateProfile, loginWithGoogle } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [step, setStep] = useState<"account" | "profile">("account");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Profile setup fields
  const [splitzyId, setSplitzyId] = useState("JOY-7K9M2Q");
  const [upiId, setUpiId] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("/assets/avatar_boy.jpg");
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    setSplitzyId(generateRandomSplitzyId());
  }, []);

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
      await signup(fullName, email, password);
      // Pre-fill suggested UPI ID
      setUpiId(`${fullName.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`);
      setStep("profile");
      toastSuccess("Account created! Let's set up your profile.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create account");
      toastError(err?.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileComplete = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        displayName: fullName,
        splitzyId,
        upiId: upiId.trim() || undefined,
        photoURL: selectedAvatar,
      });
      toastSuccess("Profile configured successfully!");
      router.push("/home");
    } catch (err) {
      toastError("Could not update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(splitzyId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Top Bar with Back */}
      <div>
        <button
          onClick={() => (step === "profile" ? setStep("account") : router.back())}
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {step === "account" ? (
        /* Screen 7: Sign Up Screen */
        <div className="my-auto py-2">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Create your <br />
              <span className="text-[#2563EB]">account</span>
            </h1>
            <p className="text-sm text-[#64748B] mt-1.5">
              Join Splitzy and start splitting bills with your friends.
            </p>
          </div>

          <form onSubmit={handleAccountSubmit} className="space-y-3.5">
            <Input
              label="Full name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rajeev Ranjan"
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              leftIcon={<Lock className="w-4 h-4" />}
              rightAction={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-slate-800 p-1"
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
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            {errorMsg && (
              <div className="text-xs text-[#EF4444] font-medium bg-red-50 p-2.5 rounded-xl border border-red-200">
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
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-[#F8FAFC] px-3 text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                OR
              </span>
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={async () => {
                setIsLoading(true);
                try {
                  await loginWithGoogle();
                  toastSuccess("Signed in with Google successfully!");
                  router.push("/home");
                } catch (e: any) {
                  toastError(e?.message || "Google sign-in failed");
                } finally {
                  setIsLoading(false);
                }
              }}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-[#0F172A] font-semibold py-3 px-4 rounded-xl text-sm shadow-xs transition-all active:scale-[0.99]"
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
      ) : (
        /* Screen 8: Profile Setup Screen */
        <div className="my-auto py-2">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Set up <br />
              <span className="text-[#2563EB]">your profile</span>
            </h1>
            <p className="text-sm text-[#64748B] mt-1.5">
              Add a few details to get started.
            </p>
          </div>

          {/* Avatar selector */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg mb-3">
              <Image src={selectedAvatar} alt="Profile Avatar" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
                <Camera className="w-6 h-6 text-white drop-shadow-md" />
              </div>
            </div>
            <span className="text-xs font-semibold text-[#64748B] mb-2">Choose your avatar</span>
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
                      ? "border-[#2563EB] scale-110 shadow-md ring-2 ring-blue-200"
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
              leftIcon={<User className="w-4 h-4" />}
            />

            {/* JoySplit ID Card */}
            <div>
              <label className="text-xs font-semibold text-[#0F172A] mb-1.5 block">
                JoySplit ID (unique)
              </label>
              <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold text-xs">
                    ID
                  </div>
                  <span className="font-mono font-bold text-[#0F172A] text-sm tracking-wider">
                    {splitzyId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1.5 text-slate-500 hover:text-[#2563EB] transition-colors"
                  title="Copy ID"
                >
                  {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-[#64748B] mt-1">
                Friends use this unique ID to find and add you.
              </p>
            </div>

            <Input
              label="UPI ID (optional)"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              hint="For receiving payments"
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
      <div className="text-center text-xs text-[#64748B] pt-4 pb-2">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-[#2563EB] hover:underline">
          Login
        </Link>
      </div>
    </div>
  );
}
