export default function DeleteAccountPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Delete Your Train2Race Account</h1>
      <p className="text-foreground-dim text-sm mb-10">
        If you'd like to delete your Train2Race account and associated data, please email us at{" "}
        <a href="mailto:support@train2race.com" className="text-signal hover:underline">support@train2race.com</a>{" "}
        with the subject line "Account Deletion Request," using the email address associated with your account.
      </p>
      <Section title="What happens when you request deletion">
        <ul className="list-disc pl-5 space-y-2 text-sm text-foreground-dim">
          <li>We will process your request within 7 business days</li>
          <li>Your profile information, workout history, and account credentials will be permanently deleted</li>
          <li>Data you've shared in team or community activity feeds (such as workout comments visible to teammates) may be retained in an anonymized form to preserve the integrity of team history, but will no longer be linked to your identity</li>
          <li>Any data required for legal or safety compliance may be retained as required by law</li>
        </ul>
      </Section>
      <Section title="Questions?"><p className="text-sm text-foreground-dim">Contact us at <a href="mailto:support@train2race.com" className="text-signal hover:underline">support@train2race.com</a> and we'll be happy to help.</p></Section>
      <div className="mt-12 pt-8 border-t border-border"><p className="text-xs text-foreground-dim">Train2Race - train2race.com - support@train2race.com</p></div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mb-10"><h2 className="text-lg font-semibold mb-3">{title}</h2>{children}</div>;
}
