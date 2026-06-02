import { AIComposer } from "@/components/dashboard/AIComposer";
import { AIWorkspaceHeader } from "@/components/dashboard/AIWorkspaceHeader";
import { ConversationThread } from "@/components/dashboard/ConversationThread";
import { SuggestedPromptList } from "@/components/dashboard/SuggestedPromptList";
import { PanelCard } from "@/components/common/PanelCard";

const prompts = [
  "Tóm tắt tình trạng hiện tại",
  "Có thay đổi gì trong 1 giờ qua?",
  "Rủi ro diễn tiến xấu?",
  "Thuốc sắp tới là gì?",
  "Các dấu hiệu cần theo dõi thêm?",
];

export function AIWorkspacePanel() {
  return (
    <PanelCard className="flex h-full min-h-0 flex-col overflow-hidden">
      <AIWorkspaceHeader />

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
