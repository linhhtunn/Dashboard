"use client";

import { useState } from "react";

import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";

export default function PlaceholdersAndVanishInputDemo() {
  const [value, setValue] = useState("");

  const placeholders = [
    "Tóm tắt nhanh tình trạng của bệnh nhân A",
    "SpO₂ có đang thấp hơn baseline không?",
    "Có thay đổi gì trong 1 giờ qua?",
    "Chỉ số nào cần ưu tiên theo dõi ngay lúc này?",
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("submitted", value);
  };

  return (
    <div className="flex h-[40rem] flex-col items-center justify-center px-4">
      <PlaceholdersAndVanishInput
        placeholders={placeholders}
        value={value}
        onValueChange={setValue}
        onChange={handleChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}
