import { useEffect, useRef, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { StackedLogo } from "@/components/StackedLogo";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

/** OTP validity window shown to the user (seconds). */
const OTP_TTL_SECONDS = 10 * 60;

function GoogleGlyph() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function Auth() {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step !== "code") return;
    timerRef.current = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) {
        toast({ title: "Google sign-in failed", description: result.error.message, variant: "destructive" });
      }
    } catch (err) {
      toast({
        title: "Google sign-in failed",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: value,
        options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setEmail(value);
      setCode("");
      setSecondsLeft(OTP_TTL_SECONDS);
      setStep("code");
      toast({ title: "Code sent", description: "Check your inbox — it expires in 10 minutes." });
    } catch (err) {
      toast({
        title: "Could not send code",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const verify = async (token: string) => {
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (error) throw error;
      toast({ title: "Welcome to Clipper" });
    } catch (err) {
      setCode("");
      toast({
        title: "Invalid or expired code",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[420px] surface-card animate-fade-in p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Link to="/" className="press-scale focus-ring rounded-full">
            <StackedLogo size={30} />
          </Link>
          <h1 className="font-display text-[24px] font-semibold leading-tight tracking-tight">
            {step === "email" ? "Welcome to Clipper" : "Check your email"}
          </h1>
          {step === "code" ? (
            <p className="text-[13px] text-muted-foreground">
              We sent a 6-digit code to <span className="text-foreground">{email}</span>
            </p>
          ) : null}
        </div>

        {step === "email" ? (
          <div className="mt-7 space-y-5">
            <button
              type="button"
              onClick={() => void handleGoogle()}
              disabled={googleLoading}
              className="btn-outline-pill"
            >
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleGlyph />}
              Continue with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/70" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-3 text-[12px] text-muted-foreground">or</span>
              </div>
            </div>

            <form onSubmit={(e) => void sendCode(e)} className="space-y-3">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Type your email..."
                  className="focus-ring w-full rounded-full border border-border/70 bg-surface-raised py-3.5 pl-11 pr-4 text-[15px] placeholder:text-muted-foreground"
                  required
                />
              </div>
              <button type="submit" disabled={sending} className="btn-primary-pill">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continue
              </button>
            </form>

            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              By continuing you agree to the Creator Terms of Use and Privacy Policy.
            </p>
          </div>
        ) : (
          <div className="mt-7 space-y-5">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(v) => {
                  setCode(v);
                  if (v.length === 6) void verify(v);
                }}
                disabled={verifying || secondsLeft === 0}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="h-12 w-11 rounded-xl text-[18px]" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <p className="text-center text-[13px] text-muted-foreground">
              {secondsLeft > 0 ? (
                <>
                  Code expires in <span className="display-figure text-foreground">{mmss}</span>
                </>
              ) : (
                "Your code expired — request a new one."
              )}
            </p>

            <button
              type="button"
              onClick={() => void verify(code)}
              disabled={verifying || code.length !== 6}
              className="btn-primary-pill"
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Verify and continue
            </button>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep("email")}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Change email
              </button>
              <button
                type="button"
                onClick={() => void sendCode()}
                disabled={sending}
                className="focus-ring rounded-full px-2 py-1 text-[13px] font-semibold text-primary transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                Resend code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
