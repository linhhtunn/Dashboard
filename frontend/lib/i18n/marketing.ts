import type { Locale } from "@/types";

type Bilingual = { vi: string; en: string };

export const MARKETING_COPY = {
  nav: {
    signIn: { vi: "Đăng nhập", en: "Sign in" },
  },
  hero: {
    headline: {
      vi: "Theo dõi rõ hơn.\nPhản ứng nhanh hơn.",
      en: "See clearly.\nRespond faster.",
    },
    sub: {
      vi: "Nền tảng theo dõi bệnh nhân realtime tích hợp AI lâm sàng — cho bác sĩ và đội ngũ y tế.",
      en: "Realtime patient monitoring platform with clinical AI — built for physicians and care teams.",
    },
    ctaPrimary: { vi: "Vào dashboard demo", en: "Try the demo" },
    ctaSecondary: { vi: "Tìm hiểu thêm", en: "Learn more" },
    liveLabel: { vi: "Sinh hiệu trực tiếp", en: "Live vitals" },
  },
  vitals: {
    stable: { vi: "Ổn định", en: "Stable" },
    needsReview: { vi: "Cần xem", en: "Needs review" },
    hr: { vi: "Nhịp tim", en: "HR" },
    spo2: { vi: "SpO₂", en: "SpO₂" },
    rr: { vi: "Nhịp thở", en: "RR" },
    patientPrefix: { vi: "BN", en: "Pt" },
  },
  problem: {
    headline: {
      vi: "Bác sĩ không thể có mặt khắp nơi cùng lúc.",
      en: "Clinicians can't be everywhere at once.",
    },
    items: [
      {
        pain: {
          vi: "Bỏ lỡ tín hiệu bất thường giữa ca trực",
          en: "Missing abnormal signals between shift handoffs",
        },
        solution: {
          vi: "Cảnh báo realtime với context đầy đủ",
          en: "Realtime alerts with full clinical context",
        },
      },
      {
        pain: {
          vi: "Mất thời gian tổng hợp thông tin bệnh nhân",
          en: "Time lost assembling patient information",
        },
        solution: {
          vi: "AI summary theo yêu cầu, không tự động",
          en: "On-demand AI summaries — never automatic",
        },
      },
      {
        pain: {
          vi: "Người nhà không biết tình trạng cập nhật",
          en: "Families lack up-to-date visibility",
        },
        solution: {
          vi: "Màn hình người nhà, ngôn ngữ không chuyên môn",
          en: "Family view in plain, non-clinical language",
        },
      },
    ],
  },
  features: {
    headline: {
      vi: "Thiết kế cho quy trình lâm sàng thực tế",
      en: "Built for real clinical workflows",
    },
    items: [
      {
        title: {
          vi: "Dashboard theo dõi realtime",
          en: "Realtime monitoring dashboard",
        },
        body: {
          vi: "Scan toàn bộ danh sách bệnh nhân theo mức độ nghiêm trọng. Cập nhật mỗi 5 phút.",
          en: "Scan the full patient list by severity. Refreshed every 5 minutes.",
        },
      },
      {
        title: {
          vi: "Cảnh báo thông minh có context",
          en: "Context-rich smart alerts",
        },
        body: {
          vi: "Cảnh báo kèm giá trị, thời điểm và hoạt động tại thời điểm bất thường — không chỉ là số liệu.",
          en: "Alerts include values, timing, and activity at the moment of anomaly — not just numbers.",
        },
      },
      {
        title: {
          vi: "AI lâm sàng theo yêu cầu",
          en: "On-demand clinical AI",
        },
        body: {
          vi: "Bác sĩ chủ động kích hoạt tóm tắt. AI giải thích tình huống, so sánh baseline, không đưa ra chẩn đoán.",
          en: "Physicians trigger summaries. AI explains context and compares baselines — it does not diagnose.",
        },
      },
      {
        title: {
          vi: "Màn hình người nhà",
          en: "Family-facing view",
        },
        body: {
          vi: "Người nhà theo dõi tình trạng bằng ngôn ngữ thông thường. Nhận thông báo khi bác sĩ có chỉ định mới.",
          en: "Families follow status in everyday language. Notifications when physicians issue new orders.",
        },
      },
    ],
  },
  stats: {
    items: [
      {
        value: "4",
        label: {
          vi: "chuyên khoa đang thử nghiệm",
          en: "departments in pilot",
        },
        caption: {
          vi: "Môi trường demo nội bộ",
          en: "Internal demo environment",
        },
      },
      {
        value: "10",
        label: {
          vi: "bệnh nhân theo dõi đồng thời",
          en: "patients monitored concurrently",
        },
        caption: {
          vi: "Dữ liệu mô phỏng",
          en: "Simulated patient data",
        },
      },
      {
        value: "< 30s",
        label: {
          vi: "thời gian phản hồi alert",
          en: "alert response time",
        },
        caption: {
          vi: "Mục tiêu vận hành demo",
          en: "Demo operational target",
        },
      },
    ],
    footnote: {
      vi: "Số liệu từ môi trường thử nghiệm nội bộ.",
      en: "Metrics from internal pilot environment.",
    },
  },
  roles: {
    headline: { vi: "Cho toàn bộ đội ngũ y tế", en: "For the entire care team" },
    items: [
      {
        title: { vi: "Bác sĩ", en: "Physician" },
        bullets: [
          {
            vi: "Xem tổng quan và chi tiết từng bệnh nhân",
            en: "Ward overview and per-patient detail",
          },
          {
            vi: "Tương tác với AI để tóm tắt và phân tích",
            en: "Interact with AI for summaries and analysis",
          },
          {
            vi: "Xuất tờ điều trị",
            en: "Export treatment sheets",
          },
        ],
      },
      {
        title: { vi: "Y tá điều phối", en: "Shift coordinator" },
        bullets: [
          {
            vi: "Nhận và báo cáo cảnh báo",
            en: "Receive and document alerts",
          },
          {
            vi: "Theo dõi vitals và lịch sử alert",
            en: "Track vitals and alert history",
          },
          {
            vi: "Phối hợp với bác sĩ",
            en: "Coordinate with physicians",
          },
        ],
      },
      {
        title: { vi: "Người nhà / Bảo mẫu", en: "Family / caregiver" },
        bullets: [
          {
            vi: "Xem tình trạng tổng quát",
            en: "View overall status",
          },
          {
            vi: "Nhận thông báo từ bác sĩ",
            en: "Receive physician notifications",
          },
          {
            vi: "Xác nhận lịch uống thuốc",
            en: "Confirm medication schedules",
          },
        ],
      },
    ],
  },
  cta: {
    headline: { vi: "Sẵn sàng thử nghiệm?", en: "Ready to get started?" },
    sub: {
      vi: "Đăng nhập để xem dashboard demo với dữ liệu mô phỏng.",
      en: "Sign in to explore the demo dashboard with simulated patient data.",
    },
    button: { vi: "Đăng nhập ngay", en: "Sign in now" },
  },
  footer: {
    disclaimer: {
      vi: "AI hỗ trợ tham khảo, không thay thế chẩn đoán lâm sàng.",
      en: "AI is for reference only — not a substitute for clinical diagnosis.",
    },
    disclaimerSub: {
      vi: "Luôn dùng phán đoán lâm sàng của bác sĩ.",
      en: "Always rely on physician clinical judgment.",
    },
    copyright: { vi: "© 2025 CareSignal AI", en: "© 2025 CareSignal AI" },
  },
} as const;

export function t(copy: Bilingual, locale: Locale): string {
  return copy[locale];
}
