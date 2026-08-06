import { ReactNode } from "react";
import { CreatorShell, PageContainer, DetailHeader } from "@/components/shell/CreatorShell";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/brand";

function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <CreatorShell>
      <PageContainer className="max-w-[820px]">
        <DetailHeader title={title} />
        <article className="surface-card space-y-5 p-5 text-[14.5px] leading-relaxed text-muted-foreground md:p-7">
          {children}
          <p className="pt-2 text-[13px]">
            Questions? Contact{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </article>
      </PageContainer>
    </CreatorShell>
  );
}

function H({ children }: { children: ReactNode }) {
  return <h2 className="pt-2 font-display text-[16px] font-semibold text-foreground">{children}</h2>;
}

export function TermsPage() {
  return (
    <LegalShell title="Creators Terms of Use">
      <p>
        These terms govern your use of {APP_NAME} as a creator. By submitting content to a campaign you agree
        to them.
      </p>
      <H>1. Eligibility</H>
      <p>
        You must be at least 16 years old and own, or be fully authorised to post from, every social account
        you link. Linked accounts must pass ownership verification before their posts can earn.
      </p>
      <H>2. Submissions</H>
      <p>
        A submission is a public post on a platform accepted by the campaign, published after you joined it.
        Only views accrued after submission count. Rewarded campaign posts must remain public and unchanged
        for 30 days from submission; deleting, editing or privating a post may reverse its earnings.
      </p>
      <H>3. Prohibited activity</H>
      <p>
        Inorganic engagement, view botting, purchased views, re-uploading another creator&apos;s work, and
        misrepresenting account ownership are prohibited and will make submissions ineligible or rejected, and
        may result in account termination and forfeiture of pending balances.
      </p>
      <H>4. Earnings and payouts</H>
      <p>
        Earnings are calculated from eligible views at the campaign&apos;s published rate per 1M views, subject
        to the campaign&apos;s caps and remaining budget. Withdrawals require a minimum balance of $50 and are
        reviewed before payment. You are responsible for any taxes on your earnings.
      </p>
      <H>5. Referrals</H>
      <p>
        Referral commission is paid on the earnings of creators who sign up with your link. Self-referral and
        fraudulent referral activity void all commission.
      </p>
      <H>6. Changes and termination</H>
      <p>
        We may update these terms or close accounts that breach them. Continued use after a change means you
        accept the updated terms.
      </p>
    </LegalShell>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p>This policy explains what {APP_NAME} collects, why, and what control you have over it.</p>
      <H>What we collect</H>
      <p>
        Account data (email, username, display name, avatar, bio), the social handles and post URLs you submit,
        public performance figures for those posts (views, engagement rate), earnings and payout records, and
        basic technical data such as device type and session logs.
      </p>
      <H>Why we use it</H>
      <p>
        To run campaigns, verify account ownership, calculate and pay earnings, prevent fraud, provide support,
        and meet legal and accounting obligations.
      </p>
      <H>Who we share it with</H>
      <p>
        Brands see aggregate campaign performance and your public handle — never your email or payout details.
        Payment processors receive only the details needed to pay you. We do not sell personal data.
      </p>
      <H>Retention</H>
      <p>
        Account and earnings records are retained while your account is active and afterwards for as long as
        the law requires. You can request deletion at any time.
      </p>
      <H>Your rights</H>
      <p>
        You can access, correct, export or delete your data, and withdraw consent for optional cookies from the
        cookie banner. Contact us to exercise any of these.
      </p>
    </LegalShell>
  );
}

export function DoNotSellPage() {
  return (
    <LegalShell title="Do Not Sell My Data">
      <p>
        {APP_NAME} does not sell or share personal information for cross-context behavioural advertising, and
        never has.
      </p>
      <H>What this means</H>
      <p>
        We do not exchange your email, payout details, submission history or earnings with third parties for
        money or advertising value. Analytics and marketing cookies are optional and off until you accept them
        in the cookie banner.
      </p>
      <H>Opting out</H>
      <p>
        Because there is no sale of personal information, there is nothing to opt out of. You can still disable
        analytics and marketing cookies at any time, and request deletion of your account data.
      </p>
      <H>Submitting a request</H>
      <p>
        Email us from the address on your account and we will confirm within 10 business days and complete the
        request within 45 days.
      </p>
    </LegalShell>
  );
}
