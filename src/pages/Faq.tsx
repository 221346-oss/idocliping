import { useNavigate } from "react-router-dom";
import { CreatorShell, PageContainer, DetailHeader } from "@/components/shell/CreatorShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { REFERRAL_RATE_LABEL } from "@/lib/referral";

const FAQS = [
  {
    q: "How do I start earning?",
    a: "Connect and verify a social account, open a live campaign in Discover, post your clip, then submit the post link on the campaign page.",
  },
  {
    q: "What do the submission statuses mean?",
    a: "Processing means we are checking your post. Eligible means it qualifies and is accruing earnings. Ineligible means it broke a campaign rule. Paid Out means the money is in your available balance.",
  },
  {
    q: "When does my money become withdrawable?",
    a: "Eligible earnings sit in Pending until the campaign is paid out by our team. Once paid out they move into your available balance and can be withdrawn.",
  },
  {
    q: "What is the minimum withdrawal?",
    a: "$50. You can withdraw via PayPal, Amazon gift card, Visa prepaid card, or USDT (ERC20).",
  },
  {
    q: "How does account verification work?",
    a: "We give you a code that starts with iclips. Add it to your social bio, then press Verify — we check the bio automatically and you can remove the code afterwards.",
  },
  {
    q: "Why was my post marked ineligible?",
    a: "Usually bought engagement, a re-upload, or a broken campaign rule. Open the submission report to see the reason — you can appeal a post once with proof.",
  },
  {
    q: "How do referrals work?",
    a: `Share your referral code and earn ${REFERRAL_RATE_LABEL} of what your referred creators make, forever.`,
  },
];

export default function FaqPage() {
  const navigate = useNavigate();
  return (
    <CreatorShell>
      <PageContainer>
        <DetailHeader title="FAQ" onBack={() => navigate("/profile")} />
        <div className="surface-card px-4">
          <Accordion type="single" collapsible>
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`i${i}`} className="border-border/60">
                <AccordionTrigger className="text-left text-[14px] font-medium">{f.q}</AccordionTrigger>
                <AccordionContent className="text-[13px] leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <p className="mt-4 text-center text-[12.5px] text-muted-foreground">
          Still stuck?{" "}
          <button type="button" onClick={() => navigate("/support/new")} className="font-semibold text-primary">
            Open a support ticket
          </button>
        </p>
      </PageContainer>
    </CreatorShell>
  );
}
