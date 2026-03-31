import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Sun, Moon, Globe, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useTheme } from "../context/ThemeContext";
import { setLocale } from "@/i18n/i18n";
import { healthApi } from "@/api/health";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";

export default function UserSettings() {
  const { t, i18n } = useTranslation();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { theme, setTheme } = useTheme();
  const lng = i18n.language === "pt-BR" ? "pt-BR" : "en";

  useEffect(() => {
    setBreadcrumbs([
      { label: t("sidebar.settings") },
      { label: t("settings.userPreferences.title") },
    ]);
  }, [setBreadcrumbs, t]);

  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: () => healthApi.get(),
  });

  return (
    <div className="max-w-4xl space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("settings.userPreferences.appearance.title")}</CardTitle>
          </div>
          <CardDescription>{t("settings.userPreferences.appearance.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                theme === "light"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              <Sun className="h-4 w-4" />
              {t("settings.userPreferences.appearance.light")}
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                theme === "dark"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              <Moon className="h-4 w-4" />
              {t("settings.userPreferences.appearance.dark")}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("settings.userPreferences.language.title")}</CardTitle>
          </div>
          <CardDescription>{t("settings.userPreferences.language.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLocale("pt-BR")}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                lng === "pt-BR"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {t("language.ptBR")}
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                lng === "en"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {t("language.en")}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("settings.userPreferences.about.title")}</CardTitle>
          </div>
          <CardDescription>{t("settings.userPreferences.about.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground">
                {t("settings.userPreferences.about.version")}:
              </span>
              <span>
                {healthQuery.isLoading
                  ? "..."
                  : healthQuery.data?.version ?? "—"}
              </span>
            </div>
            <p className="text-muted-foreground">
              {t("settings.userPreferences.about.builtWith")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
