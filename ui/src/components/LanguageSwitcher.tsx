import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { setLocale } from "@/i18n/i18n";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language === "pt-BR" ? "pt-BR" : "en";

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground shrink-0"
              aria-label={t("language.label")}
            >
              <Languages className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{t("language.label")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup
          value={lng}
          onValueChange={(v) => setLocale(v as "pt-BR" | "en")}
        >
          <DropdownMenuRadioItem value="pt-BR">{t("language.ptBR")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en">{t("language.en")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
