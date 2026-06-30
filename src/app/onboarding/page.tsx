import { auth } from "@/lib/auth";
import { OnboardingClient } from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await auth();
  const name = (session?.user as any)?.name ?? "";
  return <OnboardingClient name={name} />;
}
