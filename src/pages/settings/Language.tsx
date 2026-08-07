import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { CreatorShell, PageContainer, DetailHeader } from "@/components/shell/CreatorShell";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "ur", label: "اردو" },
];

const KEY = "iclips.language";

export default function LanguageSettings() {
  const navigate = useNavigate();
  const [lang, setLang] = useState("en");

  useEffect(() => {
    setLang(localStorage.getItem(KEY) ?? "en");
  }, []);

  const pick = (code: string) => {
    setLang(code);
    localStorage.setItem(KEY, code);
  };

  return (
    <CreatorShell>
      <PageContainer>
        <DetailHeader title="Language" onBack={() => navigate("/profile")} />
        <p className="mb-3 text-[13px] text-muted-foreground">
          Choose the language used across iClips. More languages are on the way.
        </p>
        <div className="list-group">
          {LANGUAGES.map((l) => (
            <button key={l.code} type="button" onClick={() => pick(l.code)} className="list-row">
              <span className="flex-1 truncate">{l.label}</span>
              {lang === l.code && <Check className="h-[18px] w-[18px] shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      </PageContainer>
    </CreatorShell>
  );
}
