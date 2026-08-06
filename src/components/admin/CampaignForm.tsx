import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export const CATEGORIES = ["ugc", "clipping", "edits", "anime", "music", "gaming", "logo", "other"];
export const STATUSES = ["draft", "active", "paused", "pending", "ended"];
export const PLATFORMS = ["tiktok", "instagram", "youtube", "x"];

export type CampaignFormValues = {
  brand_id: string;
  title: string;
  description: string;
  instructions: string;
  content_requirements: string;
  thumbnail_url: string;
  category: string;
  status: string;
  platforms: string[];
  payout_per_1m_views: string;
  budget_total: string;
  discord_link: string;
  community_link: string;
  song_link: string;
  /** newline separated */
  requirements_allowed: string;
  requirements_not_allowed: string;
  example_ads: string;
  sounds: string;
  max_earnings_per_post: string;
  max_earnings_per_creator: string;
  max_submissions_per_day: string;
  max_submissions_per_account: string;
  min_followers_per_account: string;
  min_views_for_earnings: string;
  min_engagement_rate: string;
  min_duration_seconds: string;
  account_audience_requirements: string;
};

export const emptyCampaignForm: CampaignFormValues = {
  brand_id: "", title: "", description: "", instructions: "", content_requirements: "",
  thumbnail_url: "", category: "ugc", status: "active", platforms: ["tiktok"],
  payout_per_1m_views: "1000", budget_total: "1000",
  discord_link: "", community_link: "", song_link: "",
  requirements_allowed: "", requirements_not_allowed: "", example_ads: "", sounds: "",
  max_earnings_per_post: "", max_earnings_per_creator: "", max_submissions_per_day: "",
  max_submissions_per_account: "", min_followers_per_account: "", min_views_for_earnings: "",
  min_engagement_rate: "", min_duration_seconds: "", account_audience_requirements: "",
};

const lines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);
const num = (v: string) => (v.trim() === "" ? null : Number(v) || 0);

/** Turns a campaign row into editable form values. */
export function campaignToForm(row: Record<string, any>): CampaignFormValues {
  const arr = (v: any) => (Array.isArray(v) ? v.join("\n") : "");
  const soundsArr = Array.isArray(row.sounds)
    ? row.sounds.map((s: any) => (typeof s === "string" ? s : s?.url ?? s?.link ?? "")).filter(Boolean).join("\n")
    : "";
  const str = (v: any) => (v === null || v === undefined ? "" : String(v));
  return {
    ...emptyCampaignForm,
    brand_id: str(row.brand_id),
    title: str(row.title),
    description: str(row.description),
    instructions: str(row.instructions),
    content_requirements: str(row.content_requirements),
    thumbnail_url: str(row.thumbnail_url),
    category: str(row.category) || "ugc",
    status: str(row.status) || "active",
    platforms: Array.isArray(row.platforms) && row.platforms.length ? row.platforms : ["tiktok"],
    payout_per_1m_views: str(row.payout_per_1m_views),
    budget_total: str(row.budget_total),
    discord_link: str(row.discord_link),
    community_link: str(row.community_link),
    song_link: str(row.song_link),
    requirements_allowed: arr(row.requirements_allowed ?? row.allowed_niches_pages),
    requirements_not_allowed: arr(row.requirements_not_allowed ?? row.not_allowed),
    example_ads: arr(row.example_ads),
    sounds: soundsArr,
    max_earnings_per_post: str(row.max_earnings_per_post),
    max_earnings_per_creator: str(row.max_earnings_per_creator),
    max_submissions_per_day: str(row.max_submissions_per_day),
    max_submissions_per_account: str(row.max_submissions_per_account),
    min_followers_per_account: str(row.min_followers_per_account),
    min_views_for_earnings: str(row.min_views_for_earnings),
    min_engagement_rate: str(row.min_engagement_rate),
    min_duration_seconds: str(row.min_duration_seconds),
    account_audience_requirements: str(row.account_audience_requirements),
  };
}

/** Maps form values onto a campaigns table payload. */
export function formToCampaignPayload(f: CampaignFormValues, opts: { isNew: boolean }) {
  const total = Number(f.budget_total) || 0;
  const payload: Record<string, any> = {
    brand_id: f.brand_id || null,
    title: f.title.trim(),
    description: f.description,
    instructions: f.instructions,
    content_requirements: f.content_requirements || null,
    thumbnail_url: f.thumbnail_url || null,
    category: f.category,
    status: f.status,
    platforms: f.platforms,
    payout_per_1m_views: Number(f.payout_per_1m_views) || 0,
    budget_total: total,
    discord_link: f.discord_link.trim() || null,
    community_link: f.community_link.trim() || null,
    song_link: f.song_link.trim() || null,
    requirements_allowed: lines(f.requirements_allowed),
    requirements_not_allowed: lines(f.requirements_not_allowed),
    example_ads: lines(f.example_ads),
    sounds: lines(f.sounds).map((url) => ({ url })),
    max_earnings_per_post: num(f.max_earnings_per_post),
    max_earnings_per_creator: num(f.max_earnings_per_creator),
    max_submissions_per_day: num(f.max_submissions_per_day),
    max_submissions_per_account: num(f.max_submissions_per_account),
    min_followers_per_account: num(f.min_followers_per_account),
    min_views_for_earnings: num(f.min_views_for_earnings),
    min_engagement_rate: num(f.min_engagement_rate),
    min_duration_seconds: num(f.min_duration_seconds),
    account_audience_requirements: f.account_audience_requirements.trim() || null,
  };
  if (opts.isNew) payload.budget_remaining = total;
  return payload;
}

type Props = {
  value: CampaignFormValues;
  onChange: (v: CampaignFormValues) => void;
  onSubmit: () => void;
  busy?: boolean;
  brands: { id: string; name: string }[];
  submitLabel: string;
};

export function CampaignForm({ value, onChange, onSubmit, busy, brands, submitLabel }: Props) {
  const [tab, setTab] = useState<"basics" | "content" | "rules">("basics");
  const set = <K extends keyof CampaignFormValues>(k: K, v: CampaignFormValues[K]) =>
    onChange({ ...value, [k]: v });
  const togglePlatform = (p: string) =>
    set("platforms", value.platforms.includes(p) ? value.platforms.filter((x) => x !== p) : [...value.platforms, p]);

  const TABS = [
    { id: "basics", label: "Basics" },
    { id: "content", label: "Content" },
    { id: "rules", label: "Rules & limits" },
  ] as const;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
              tab === t.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "basics" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Brand</Label>
            <Select value={value.brand_id} onValueChange={(v) => set("brand_id", v)}>
              <SelectTrigger><SelectValue placeholder="Choose brand" /></SelectTrigger>
              <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Title</Label>
            <Input value={value.title} onChange={(e) => set("title", e.target.value)} required /></div>
          <div className="space-y-1"><Label>Description (shown as the description box)</Label>
            <Textarea rows={4} value={value.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="space-y-1"><Label>Thumbnail URL</Label>
            <Input value={value.thumbnail_url} onChange={(e) => set("thumbnail_url", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label>Category</Label>
              <Select value={value.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Status</Label>
              <Select value={value.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label>Payout per 1M views ($)</Label>
              <Input type="number" step="0.01" value={value.payout_per_1m_views} onChange={(e) => set("payout_per_1m_views", e.target.value)} /></div>
            <div className="space-y-1"><Label>Total budget ($)</Label>
              <Input type="number" step="0.01" value={value.budget_total} onChange={(e) => set("budget_total", e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button type="button" key={p} onClick={() => togglePlatform(p)}
                  className={`rounded-full border px-3 py-1 text-[12px] uppercase tracking-wide ${value.platforms.includes(p) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "content" && (
        <div className="space-y-3">
          <div className="space-y-1"><Label>Instructions for creators</Label>
            <Textarea rows={4} value={value.instructions} onChange={(e) => set("instructions", e.target.value)} /></div>
          <div className="space-y-1"><Label>Content requirements</Label>
            <Textarea rows={4} value={value.content_requirements} onChange={(e) => set("content_requirements", e.target.value)} /></div>
          <div className="space-y-1"><Label>Example posts — one URL per line</Label>
            <Textarea rows={4} value={value.example_ads} onChange={(e) => set("example_ads", e.target.value)} placeholder={"https://tiktok.com/@user/video/1\nhttps://instagram.com/reel/2"} /></div>
          <div className="space-y-1"><Label>Available sounds — one URL per line</Label>
            <Textarea rows={3} value={value.sounds} onChange={(e) => set("sounds", e.target.value)} /></div>
          <div className="space-y-1"><Label>Song link</Label>
            <Input value={value.song_link} onChange={(e) => set("song_link", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label>Discord link</Label>
              <Input value={value.discord_link} onChange={(e) => set("discord_link", e.target.value)} placeholder="https://discord.gg/…" /></div>
            <div className="space-y-1"><Label>Community link</Label>
              <Input value={value.community_link} onChange={(e) => set("community_link", e.target.value)} /></div>
          </div>
        </div>
      )}

      {tab === "rules" && (
        <div className="space-y-3">
          <div className="space-y-1"><Label>Allowed — one per line</Label>
            <Textarea rows={4} value={value.requirements_allowed} onChange={(e) => set("requirements_allowed", e.target.value)} /></div>
          <div className="space-y-1"><Label>Not allowed — one per line</Label>
            <Textarea rows={4} value={value.requirements_not_allowed} onChange={(e) => set("requirements_not_allowed", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label>Max earnings / post ($)</Label>
              <Input type="number" step="0.01" value={value.max_earnings_per_post} onChange={(e) => set("max_earnings_per_post", e.target.value)} /></div>
            <div className="space-y-1"><Label>Max earnings / creator ($)</Label>
              <Input type="number" step="0.01" value={value.max_earnings_per_creator} onChange={(e) => set("max_earnings_per_creator", e.target.value)} /></div>
            <div className="space-y-1"><Label>Max submissions / day</Label>
              <Input type="number" value={value.max_submissions_per_day} onChange={(e) => set("max_submissions_per_day", e.target.value)} /></div>
            <div className="space-y-1"><Label>Max submissions / account</Label>
              <Input type="number" value={value.max_submissions_per_account} onChange={(e) => set("max_submissions_per_account", e.target.value)} /></div>
            <div className="space-y-1"><Label>Min followers / account</Label>
              <Input type="number" value={value.min_followers_per_account} onChange={(e) => set("min_followers_per_account", e.target.value)} /></div>
            <div className="space-y-1"><Label>Min views for earnings</Label>
              <Input type="number" value={value.min_views_for_earnings} onChange={(e) => set("min_views_for_earnings", e.target.value)} /></div>
            <div className="space-y-1"><Label>Min engagement rate (%)</Label>
              <Input type="number" step="0.01" value={value.min_engagement_rate} onChange={(e) => set("min_engagement_rate", e.target.value)} /></div>
            <div className="space-y-1"><Label>Min duration (seconds)</Label>
              <Input type="number" value={value.min_duration_seconds} onChange={(e) => set("min_duration_seconds", e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>Account audience requirement</Label>
            <Input value={value.account_audience_requirements} onChange={(e) => set("account_audience_requirements", e.target.value)} placeholder="Account audience must be mostly US" /></div>
        </div>
      )}

      <Button type="submit" disabled={busy} className="w-full">
        {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
