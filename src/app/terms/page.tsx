export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Terms of Service</h1>
      <p className="text-foreground-dim text-sm mb-10">Last updated: September 2026</p>
      <Section title="Overview">By creating a Train2Race account, you agree to these terms. Train2Race is a team training platform for endurance athletes - please use it respectfully and only for its intended purpose.</Section>
      <Section title="Acceptable use">
        <ul className="list-disc pl-5 space-y-2 text-sm text-foreground-dim">
          <li>Be respectful to other athletes in team chat, direct messages, and activity comments</li>
          <li>Only post content you have the right to share</li>
          <li>Do not harass, threaten, or impersonate other users</li>
          <li>Do not use the app to spam, advertise, or solicit outside of its intended training purpose</li>
        </ul>
      </Section>
      <Section title="Prohibited content">
        <p className="text-sm text-foreground-dim mb-3">The following is never allowed anywhere in Train2Race, including messages, comments, and workout photos:</p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-foreground-dim">
          <li><strong className="text-foreground">Nudity or sexually explicit content</strong></li>
          <li><strong className="text-foreground">Graphic violence</strong> depicting real-world events, outside of a newsworthy or educational context</li>
          <li>Hate speech or content that attacks people based on race, ethnicity, religion, gender, sexual orientation, or disability</li>
          <li>Content that promotes self-harm, illegal activity, or violence</li>
        </ul>
      </Section>
      <Section title="Reporting and enforcement">
        <p className="text-sm text-foreground-dim">You can report any message, comment, or photo you believe violates these terms, and block any user directly from the app. Reported photos are automatically hidden pending review. We review reports and may remove content, hide photos, or suspend accounts that violate these terms, at our discretion and without prior notice.</p>
      </Section>
      <Section title="Your content"><p className="text-sm text-foreground-dim">You retain ownership of anything you post. By posting, you grant Train2Race a license to display it to your teammates as part of the app's normal function. You're solely responsible for the content you share.</p></Section>
      <Section title="Account termination"><p className="text-sm text-foreground-dim">We may suspend or terminate accounts that violate these terms. You can delete your own account at any time from your profile settings.</p></Section>
      <Section title="Disclaimer"><p className="text-sm text-foreground-dim">Train2Race is provided "as is" without warranties of any kind. See our <a href="/privacy" className="text-signal hover:underline">Privacy Policy</a> for how we handle your data, including our medical disclaimer.</p></Section>
      <Section title="Changes to these terms"><p className="text-sm text-foreground-dim">We may update these terms from time to time. Continued use of the app after changes means you accept the updated terms.</p></Section>
      <Section title="Contact"><p className="text-sm text-foreground-dim">Questions about these terms? Email us at <a href="mailto:support@train2race.com" className="text-signal hover:underline">support@train2race.com</a></p></Section>
      <div className="mt-12 pt-8 border-t border-border"><p className="text-xs text-foreground-dim">Train2Race - train2race.com - support@train2race.com</p></div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mb-10"><h2 className="text-lg font-semibold mb-3">{title}</h2>{children}</div>;
}
