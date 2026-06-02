import { Bot, MessageSquareText, ShieldCheck } from "lucide-react";

function EmptyThreadCard() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 px-5 py-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0D47A1] shadow-sm">
          <MessageSquareText className="h-5 w-5" />
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Chua co cau hoi nao trong phien nay
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Bat dau bang mot prompt de AI tong hop tinh trang hien tai, phat
            hien thay doi gan day, hoac giai thich ly do cua alert.
          </p>
        </div>
      </div>
    </div>
  );
}

function StarterSystemNote() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0D47A1]/10 text-[#0D47A1]">
        <Bot className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">
            CareSignal AI workspace
          </p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            Commit 2 scaffold
          </span>
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          O commit nay, panel trai da duoc chuyen sang flow hoi thoai 2 lop:
          thread o tren, prompt va composer o duoi. Commit tiep theo se them AI
          answer card co evidence va disclaimer day du.
        </p>
      </div>
    </div>
  );
}

function SafetyNote() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#009688]/15 bg-[#009688]/5 px-4 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#009688]">
        <ShieldCheck className="h-5 w-5" />
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900">Clinical guardrail</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          AI support only. Not a diagnosis. Always use clinical judgment.
        </p>
      </div>
    </div>
  );
}

export function ConversationThread() {
  return (
    <div className="flex min-h-full flex-col gap-4">
      <StarterSystemNote />
      <EmptyThreadCard />
      <SafetyNote />
    </div>
  );
}
