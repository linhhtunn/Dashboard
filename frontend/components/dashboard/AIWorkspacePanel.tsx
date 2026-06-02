import { AIComposer } from "@/components/dashboard/AIComposer";
import { ChatHistoryPanel } from "@/components/dashboard/ChatHistoryPanel";
import { AIWorkspaceHeader } from "@/components/dashboard/AIWorkspaceHeader";
import { ConversationThread } from "@/components/dashboard/ConversationThread";
import { SuggestedPromptList } from "@/components/dashboard/SuggestedPromptList";
import { PanelCard } from "@/components/common/PanelCard";

const prompts = [
  "Tom tat tinh trang hien tai",
  "Co thay doi gi trong 1 gio qua?",
  "Rui ro dien tien xau?",
  "Thuoc sap toi la gi?",
  "Cac dau hieu can theo doi them?",
];

export function AIWorkspacePanel() {
  return (
    <PanelCard className="flex h-full min-h-0 flex-col overflow-hidden">
      <AIWorkspaceHeader />
      <ChatHistoryPanel />

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5 pt-5">
        <ConversationThread />
      </div>

      <div className="dashboard-glass-soft shrink-0 border-t dashboard-subtle-divider px-6 py-5">
        <SuggestedPromptList prompts={prompts} />
        <div className="mt-4">
          <AIComposer />
        </div>
      </div>
    </PanelCard>
  );
}
