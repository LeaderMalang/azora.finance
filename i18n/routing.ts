import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es", "zh", "ar"],
  defaultLocale: "en",
  localePrefix: "always",
});
