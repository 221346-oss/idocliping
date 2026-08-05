import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { StackedLogo } from "@/components/StackedLogo";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const [mode, setMode] = useState<"auth" | "forgot_password" | "update_password">(
    new URLSearchParams(window.location.search).get("update_password") ? "update_password" : "auth"
  );
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />; // Index handles role-based redirect

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (error) toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
    } catch (error: any) {
      toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signIn(loginEmail, loginPassword);
      toast({ title: "Welcome back!" });
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await signUp(signupEmail, signupPassword, signupName);
      toast({ title: "Account created!", description: "Check your email to confirm your account." });
    } catch (error: any) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?update_password=true`,
      });
      if (error) throw error;
      toast({ title: "Reset email sent!", description: "Check your email for the password reset link." });
      setMode("auth");
    } catch (error: any) {
      toast({ title: "Failed to send reset email", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated successfully!" });
      setMode("auth");
      window.history.replaceState({}, document.title, "/auth");
    } catch (error: any) {
      toast({ title: "Failed to update password", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[440px] surface-card p-7 sm:p-8 space-y-6 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-start gap-2">
          <Link to="/" className="flex items-center gap-2.5 press-scale focus-ring rounded-full">
            <StackedLogo size={20} />
            <span className="text-[15px] font-bold text-foreground tracking-[0.08em] uppercase">Clipper</span>
          </Link>
          <h1 className="text-[26px] leading-tight font-semibold tracking-tight">
            {mode === "update_password" ? "Update password" : mode === "forgot_password" ? "Reset password" : "Welcome back"}
          </h1>
          <p className="text-[13px] text-muted-foreground">Creator marketing marketplace</p>
        </div>

        {/* Google */}
        {mode === "auth" && (
          <>
            <Button
              variant="outline"
              className="w-full h-12 gap-2.5 rounded-full text-[14px] font-semibold press-scale"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-card px-3 text-muted-foreground">or</span>
              </div>
            </div>
          </>
        )}

        {/* Email auth */}
        {mode === "update_password" ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">New Password</Label>
              <Input type="password" placeholder="Min 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="h-12 rounded-2xl text-[14px] px-4" />
            </div>
            <Button type="submit" className="w-full h-12 rounded-full text-[14px] font-semibold press-scale" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        ) : mode === "forgot_password" ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Email</Label>
              <Input type="email" placeholder="you@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required className="h-12 rounded-2xl text-[14px] px-4" />
            </div>
            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full h-12 rounded-full text-[14px] font-semibold press-scale" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
              <Button type="button" variant="ghost" className="h-11 rounded-full text-[13px]" onClick={() => setMode("auth")} disabled={isSubmitting}>
                Back to Sign in
              </Button>
            </div>
          </form>
        ) : (
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 h-12 p-1 rounded-full bg-surface-raised">
              <TabsTrigger value="login" className="text-[13px] rounded-full data-[state=active]:bg-card">Sign in</TabsTrigger>
              <TabsTrigger value="signup" className="text-[13px] rounded-full data-[state=active]:bg-card">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-5">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Email</Label>
                  <Input type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className="h-12 rounded-2xl text-[14px] px-4" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[13px]">Password</Label>
                    <button type="button" onClick={() => setMode("forgot_password")} className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">Forgot password?</button>
                  </div>
                  <Input type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="h-12 rounded-2xl text-[14px] px-4" />
                </div>
                <Button type="submit" className="w-full h-12 rounded-full text-[14px] font-semibold press-scale" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-5">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Full Name</Label>
                  <Input type="text" placeholder="Jane Doe" value={signupName} onChange={(e) => setSignupName(e.target.value)} required className="h-12 rounded-2xl text-[14px] px-4" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Email</Label>
                  <Input type="email" placeholder="you@example.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required className="h-12 rounded-2xl text-[14px] px-4" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Password</Label>
                  <Input type="password" placeholder="Min 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={6} className="h-12 rounded-2xl text-[14px] px-4" />
                </div>
                <Button type="submit" className="w-full h-12 rounded-full text-[14px] font-semibold press-scale" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}

        <p className="text-left text-[11px] text-muted-foreground pt-1">
          © {new Date().getFullYear()} Clipper
        </p>
      </div>
    </div>
  );
}

