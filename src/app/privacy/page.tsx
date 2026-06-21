export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Privacy Policy</h1>
      <p className="text-foreground-dim text-sm mb-10">Last updated: June 2026</p>
      <Section title="Overview">Train2Race is a team training platform for endurance athletes. This policy explains what data we collect, how we use it, and your rights. We take privacy seriously - your data is yours, and we never sell it.</Section>
      <Section title="What we collect">
        <ul className="list-disc pl-5 space-y-2 text-sm text-foreground-dim">
          <li><strong className="text-foreground">Account data</strong> - your name, email address, and password (hashed, never stored in plain text)</li>
          <li><strong className="text-foreground">Profile data</strong> - optional: date of birth, biological sex, height, weight, and timezone. Used only for training calculations.</li>
          <li><strong className="text-foreground">Activity data</strong> - workout type, duration, distance, and date from connected devices. Used to display your training history and weekly volume.</li>
          <li><strong className="text-foreground">Recovery metrics</strong> - HRV, resting heart rate, sleep score, and recovery percentage from connected wearables.</li>
          <li><strong className="text-foreground">Race and training data</strong> - races you add, training plans you generate, and workout completion status.</li>
          <li><strong className="text-foreground">Team data</strong> - teams you create or join, team messages, and your training progress as shared with your team.</li>
        </ul>
      </Section>
      <Section title="How we use your data">
        <ul className="list-disc pl-5 space-y-2 text-sm text-foreground-dim">
          <li>To display your personal training dashboard - activities, metrics, and race plan progress</li>
          <li>To show your weekly training volume and progress to teammates you have chosen to train with</li>
          <li>To generate personalized training plans based on your fitness level and race distance</li>
          <li>To calculate nutrition targets based on your weight and workout type</li>
          <li>To flag when your recovery metrics drop significantly below your personal baseline</li>
        </ul>
        <p className="text-sm text-foreground-dim mt-3">We do not use your data to train machine learning models. We do not sell your data. We do not share your data with advertisers.</p>
      </Section>
      <Section title="Third-party connections">
        <ul className="list-disc pl-5 space-y-2 text-sm text-foreground-dim">
          <li><strong className="text-foreground">Strava</strong> - we read your activities (type, distance, duration, date). We do not post to Strava or access your followers, segments, or social features.</li>
          <li><strong className="text-foreground">Whoop</strong> - we read your daily recovery score, HRV, resting heart rate, and sleep data.</li>
          <li><strong className="text-foreground">Garmin</strong> - we read your daily metrics and activities.</li>
          <li><strong className="text-foreground">Apple Health</strong> - we receive health data you choose to share via webhook.</li>
        </ul>
        <p className="text-sm text-foreground-dim mt-3">You can disconnect any service at any time from the Connections page. We delete your data from that service immediately upon disconnection.</p>
      </Section>
      <Section title="Data sharing within teams"><p className="text-sm text-foreground-dim">If you join a team, your teammates can see your weekly mileage, workout completion percentage, and training plan progress. You control this by choosing which teams to join. You can leave a team at any time.</p></Section>
      <Section title="Data retention">
        <ul className="list-disc pl-5 space-y-2 text-sm text-foreground-dim">
          <li>Daily metrics are automatically deleted after 90 days</li>
          <li>Team messages are automatically deleted after 90 days</li>
          <li>All your data is deleted when you delete your account</li>
          <li>Strava data is deleted immediately when you disconnect Strava</li>
        </ul>
      </Section>
      <Section title="Data security"><p className="text-sm text-foreground-dim">All data is encrypted in transit (HTTPS). Passwords are hashed using bcrypt and never stored in plain text. Access tokens from third-party services are encrypted at rest.</p></Section>
      <Section title="Your rights">
        <ul className="list-disc pl-5 space-y-2 text-sm text-foreground-dim">
          <li><strong className="text-foreground">Access</strong> - you can view all your data in the app at any time</li>
          <li><strong className="text-foreground">Deletion</strong> - you can delete your account and all associated data by contacting us</li>
          <li><strong className="text-foreground">Disconnection</strong> - you can disconnect any third-party service at any time from the Connections page</li>
        </ul>
      </Section>
      <Section title="Cookies"><p className="text-sm text-foreground-dim">We use a single session cookie to keep you logged in. We do not use advertising cookies or tracking pixels.</p></Section>
      <Section title="Medical disclaimer"><p className="text-sm text-foreground-dim">Train2Race is a training tool, not a medical device. The metrics and flags we display are for informational purposes only and are not medical advice. Please consult a qualified healthcare professional if you have health concerns.</p></Section>
      <Section title="Contact"><p className="text-sm text-foreground-dim">Questions about this policy? Email us at <a href="mailto:support@train2race.com" className="text-signal hover:underline">support@train2race.com</a></p></Section>
      <div className="mt-12 pt-8 border-t border-border"><p className="text-xs text-foreground-dim">Train2Race - train2race.com - support@train2race.com</p></div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mb-10"><h2 className="text-lg font-semibold mb-3">{title}</h2>{children}</div>;
}
