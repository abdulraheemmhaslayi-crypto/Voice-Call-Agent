"use client";

import type { Team } from "@stackframe/stack";
import {
  Activity,
  AlertTriangle,
  AudioLines,
  Box,
  ChevronLeft,
  ChevronsUpDown,
  CircleDollarSign,
  Code2,
  FileText,
  Folder,
  Home,
  LogOut,
  type LucideIcon,
  MessageSquare,
  Phone,
  Send,
  Settings,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useRef } from "react";

import { JamureLogo } from "@/components/JamureLogo";
import ThemeToggle from "@/components/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppConfig } from "@/context/AppConfigContext";
import { useTelephonyConfigWarnings } from "@/context/TelephonyConfigWarningsContext";
import { useLatestReleaseVersion } from "@/hooks/useLatestReleaseVersion";
import type { LocalUser } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type SidebarNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  showsTelephonyWarning?: boolean;
};

type SidebarNavSection = {
  label?: string;
  items: SidebarNavItem[];
};

const TELEPHONY_WARNING_COPY = "Action required";

const NAV_SECTIONS: SidebarNavSection[] = [
  {
    items: [
      {
        title: "Dashboard",
        url: "/overview",
        icon: Home,
      },
      {
        title: "Voice Agents",
        url: "/workflow",
        icon: Phone,
      },
      {
        title: "Campaigns",
        url: "/campaigns",
        icon: Send,
      },
      {
        title: "Conversations",
        url: "/recordings",
        icon: MessageSquare,
      },
      {
        title: "Models",
        url: "/model-configurations",
        icon: Box,
      },
      {
        title: "Telephony",
        url: "/telephony-configurations",
        icon: Phone,
        showsTelephonyWarning: true,
      },
      {
        title: "Tools",
        url: "/tools",
        icon: Wrench,
      },
      {
        title: "Files",
        url: "/files",
        icon: Folder,
      },
      {
        title: "Recordings",
        url: "/recordings",
        icon: AudioLines,
      },
      {
        title: "Developers",
        url: "/api-keys",
        icon: Code2,
      },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        title: "Agent Runs",
        url: "/usage",
        icon: Activity,
      },
      {
        title: "Reports",
        url: "/reports",
        icon: FileText,
      },
    ],
  },
];

// Lazy load SelectedTeamSwitcher - we'll pass selectedTeam from our context
const StackTeamSwitcher = React.lazy(() =>
  import("@stackframe/stack").then((mod) => ({
    default: mod.SelectedTeamSwitcher,
  }))
);

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { provider, getSelectedTeam, logout, user } = useAuth();
  const { config } = useAppConfig();
  const { telnyxMissingWebhookPublicKeyCount } = useTelephonyConfigWarnings();
  const hasTelephonyWarning = telnyxMissingWebhookPublicKeyCount > 0;
  const isCollapsed = !isMobile && state === "collapsed";

  // Get selected team for Stack auth (cast to Team type from Stack)
  const selectedTeamRef = useRef<Team | null>(null);
  const rawSelectedTeam = provider === "stack" && getSelectedTeam ? getSelectedTeam() as Team | null : null;
  if (rawSelectedTeam?.id !== selectedTeamRef.current?.id) {
    selectedTeamRef.current = rawSelectedTeam;
  }
  const selectedTeam = selectedTeamRef.current;

  // Version info from app config context
  const versionInfo = config ? { ui: config.uiVersion, api: config.apiVersion } : null;

  // Check for updates only on self-hosted (OSS) deployments
  const { isLatest } = useLatestReleaseVersion(
    versionInfo?.ui,
    { enabled: config?.deploymentMode === "oss" },
  );

  const isActive = (path: string) => {
    if (path === "/overview") {
      return pathname === "/" || pathname === "/overview";
    }
    return pathname.startsWith(path);
  };

  const handleMobileNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Derive user info matching Rahman / Administrator in reference image
  const userDisplayName = user?.displayName || (user as { name?: string })?.name;
  const userEmail = (user as LocalUser | undefined)?.email || (user as { primaryEmail?: string })?.primaryEmail || "";
  const userName = userDisplayName || (userEmail ? userEmail.split("@")[0] : "Rahman");
  const userRole = "Administrator";
  const userInitials = (userDisplayName || userEmail || "Rahman")
    .split(/[\s@._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join("") || "RG";

  const SidebarLink = ({ item }: { item: SidebarNavItem }) => {
    const isItemActive = isActive(item.url);
    const Icon = item.icon;
    const showWarningDot = item.showsTelephonyWarning && hasTelephonyWarning;
    const tooltip = {
      children: (
        <div className="notranslate" translate="no">
          <p>{item.title}</p>
          {showWarningDot && (
            <p className="text-amber-600 dark:text-amber-400">{TELEPHONY_WARNING_COPY}</p>
          )}
        </div>
      ),
    };
    const warningIndicator = (
      <AlertTriangle
        aria-label="Action required on a telephony configuration"
        className={cn(
          "text-amber-500",
          isCollapsed ? "absolute -right-0.5 -top-0.5 h-3 w-3" : "ml-auto h-3.5 w-3.5"
        )}
      />
    );

    return (
      <SidebarMenuButton
        asChild
        tooltip={tooltip}
        className={cn(
          "relative h-9.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
          isItemActive
            ? "bg-blue-50/80 font-semibold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
            : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
        )}
      >
        <Link
          href={item.url}
          onClick={handleMobileNavClick}
          className={cn("relative flex items-center gap-3 w-full", isCollapsed && "justify-center px-0")}
          translate="no"
        >
          {/* Active left indicator pill like in the reference image */}
          {isItemActive && (
            <span className="absolute -left-2 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-blue-600 dark:bg-blue-500" />
          )}

          <Icon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              isItemActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
            )}
          />
          <span
            className={cn("notranslate min-w-0 flex-1 truncate text-sm", isCollapsed && "sr-only")}
            translate="no"
          >
            {item.title}
          </span>
          {showWarningDot && (
            isCollapsed ? (
              warningIndicator
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  {warningIndicator}
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{TELEPHONY_WARNING_COPY}</p>
                </TooltipContent>
              </Tooltip>
            )
          )}
        </Link>
      </SidebarMenuButton>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60 bg-background">
      {/* Brand Header */}
      <SidebarHeader className="border-b border-border/50 px-3.5 py-4 notranslate" translate="no">
        <div className="flex items-center justify-between">
          {isCollapsed ? (
            <div className="mx-auto flex flex-col items-center gap-2">
              <Link href="/" title="Jamure Voice AI">
                <JamureLogo size="md" showText={false} />
              </Link>
              <SidebarTrigger className="hover:bg-accent" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <Link
                  href="/"
                  className="notranslate flex items-center gap-3 px-0.5 group"
                  translate="no"
                >
                  <JamureLogo size="md" showText={false} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold tracking-tight text-foreground truncate">
                      Jamure Voice AI
                    </span>
                    <span
                      className="notranslate text-xs text-muted-foreground shrink-0"
                      translate="no"
                    >
                      v{versionInfo?.ui || "1.34.0"}
                    </span>
                  </div>
                </Link>
                {isLatest && (
                  <span className="inline-flex items-center rounded-md border border-emerald-500/20 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Latest
                  </span>
                )}
              </div>

              <SidebarTrigger className="hover:bg-accent h-7 w-7 rounded-lg text-muted-foreground">
                <ChevronLeft className="h-4 w-4" />
              </SidebarTrigger>
            </>
          )}
        </div>

        {provider === "stack" && (
          <div className={cn("mt-3 notranslate", isCollapsed && "hidden")} translate="no">
            <React.Suspense
              fallback={
                <div className="h-9 w-full animate-pulse rounded bg-muted" />
              }
            >
              <StackTeamSwitcher
                selectedTeam={selectedTeam || undefined}
                onChange={() => {
                  router.refresh();
                }}
              />
            </React.Suspense>
          </div>
        )}
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent className={cn("px-2 py-2 notranslate", isCollapsed && "px-0")} translate="no">
        {NAV_SECTIONS.map((section, index) => (
          <SidebarGroup
            key={section.label ?? "overview"}
            className={index === 0 ? "pt-1" : "pt-4"}
          >
            {section.label && (
              <SidebarGroupLabel
                className={cn(
                  "notranslate text-xs font-semibold text-slate-400 dark:text-slate-500 px-3 mb-1.5 tracking-normal",
                  isCollapsed && "hidden"
                )}
                translate="no"
              >
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarMenu className="gap-1">
              {section.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarLink item={item} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer Profile Section */}
      <SidebarFooter
        className={cn("border-t border-border/50 p-3 notranslate", isCollapsed && "p-2")}
        translate="no"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent/60 outline-hidden",
                isCollapsed && "justify-center p-1"
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-semibold text-xs shadow-xs">
                {userInitials}
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-xs font-semibold text-foreground">
                      {userName}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {userRole}
                    </span>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground ml-auto" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 rounded-xl p-1.5 shadow-lg">
            <DropdownMenuLabel className="font-normal px-2 py-1.5">
              <div className="flex flex-col space-y-0.5">
                <p className="text-xs font-semibold text-foreground">{userName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{userEmail || "administrator@jamure.ai"}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer rounded-lg text-xs">
              <Settings className="mr-2 h-4 w-4" />
              Platform Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/usage")} className="cursor-pointer rounded-lg text-xs">
              <CircleDollarSign className="mr-2 h-4 w-4" />
              Usage & Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1">
              <ThemeToggle showLabel={true} className="w-full justify-start text-xs h-8" />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="cursor-pointer rounded-lg text-xs text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
