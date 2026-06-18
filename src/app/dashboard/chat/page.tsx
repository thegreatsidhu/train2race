import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChatUI } from "@/components/ChatUI";

export default async function ChatPage() {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  const messages = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return (
    <div className="max-w-3xl px-8 py-10 h-[calc(100vh-2rem)] flex flex-col">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Coach</h1>
        <p className="text-foreground-dim text-sm mt-1">
          Ask about your trends, plan a race, or just check in.
        </p>
      </header>
      <ChatUI
        initialMessages={messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))}
      />
    </div>
  );
}
