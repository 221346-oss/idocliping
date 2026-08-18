import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandLogo";

const DISMISS_KEY = "iclips_install_dismissed";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Cookie-consent style bar offering to install iClips to the phone home screen. */
export function InstallBanner() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    if (isIos) {
      setIosHint(true);
      setVisible(true);
    }

    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  return (
    <div className="fixed bottom-[84px] left-0 right-0 z-[59] px-3 sm:bottom-[80px] sm:px-6">
      <div className="mx-auto flex max-w-[1200px] items-center gap-3 rounded-2xl border border-primary/30 bg-background/95 px-4 py-3 shadow-lift backdrop-blur">
        <BrandLogo size={32} className="rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground">Install iClips on your phone</p>
          <p className="truncate text-[12px] text-muted-foreground">
            {iosHint
              ? "Tap Share, then “Add to Home Screen”."
              : "Add the app to your home screen — full screen, no store needed."}
          </p>
        </div>
        {!iosHint && (
          <Button size="sm" className="shrink-0 gap-1.5 rounded-full" onClick={() => void install()}>
            <Download className="h-4 w-4" />
            Install
          </Button>
        )}
        <button
          type="button"
          aria-label="Dismiss install prompt"
          onClick={dismiss}
          className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
