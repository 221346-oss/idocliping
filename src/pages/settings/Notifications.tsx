import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreatorShell, PageContainer, DetailHeader } from "@/components/shell/CreatorShell";
import { Switch } from "@/components/ui/switch";

const KEY = "iclips.notifications";

type Prefs = {
  submissions: boolean;
  payouts: boolean;
  campaigns: boolean;
  product: boolean;
};

const DEFAULTS: Prefs = { submissions: true, payouts: true, campaigns: true, product: false };

const ROWS: { key: keyof Prefs; label: string; hint: string }[] = [
  { key: "submissions", label: "Submission updates", hint: "Eligible, ineligible and payout status" },
  { key: "payouts", label: "Wallet & payouts", hint: "Withdrawals and balance changes" },
  { key: "campaigns", label: "New campaigns", hint: "When a campaign goes live in your categories" },
  { key: "product", label: "Product news", hint: "Occasional updates about iClips" },
];

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = (key: keyof Prefs) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <CreatorShell>
      <PageContainer>
        <DetailHeader title="Notifications" onBack={() => navigate("/profile")} />
        <div className="list-group">
          {ROWS.map((r) => (
            <div key={r.key} className="list-row">
              <span className="min-w-0 flex-1">
                <span className="block truncate">{r.label}</span>
                <span className="block truncate text-[12.5px] font-normal text-muted-foreground">{r.hint}</span>
              </span>
              <Switch checked={prefs[r.key]} onCheckedChange={() => toggle(r.key)} aria-label={r.label} />
            </div>
          ))}
        </div>
      </PageContainer>
    </CreatorShell>
  );
}
