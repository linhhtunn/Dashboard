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
    <PanelCard className="flex h-full min-h-[70vh] flex-col overflow-hidden">
      <AIWorkspaceHeader />

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <ConversationThread />
      </div>

      <div className="border-t border-slate-200 px-5 py-4">
        <SuggestedPromptList prompts={prompts} />
        <div className="mt-4">
          <AIComposer />
        </div>
      </div>
    </PanelCard>
  );
}