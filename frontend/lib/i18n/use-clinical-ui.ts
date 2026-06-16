"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { getClinicalUi, type ClinicalUiCopy } from "@/lib/i18n/ui";

export function useClinicalUi(): ClinicalUiCopy {
  const { locale } = useLocale();
  return getClinicalUi(locale);
}
