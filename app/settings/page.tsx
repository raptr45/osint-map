"use client";

import { authClient } from "@/lib/auth-client";
import { 
  Monitor, 
  Moon, 
  Sun, 
  Palette, 
  ArrowLeft, 
  ShieldCheck, 
  Activity,
  Eye,
  Check,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import * as React from "react";

const SCHEMES = [
  { id: "indigo", label: "Midnight Cobalt", color: "#6366f1" },
  { id: "emerald", label: "Nature Emerald", color: "#10b981" },
  { id: "amber", label: "Warning Amber", color: "#f59e0b" },
  { id: "rose", label: "Intensity Rose", color: "#f43f5e" },
  { id: "slate", label: "Tactical Slate", color: "#64748b" },
];

export default function SettingsPage() {
  const { data: session, isPending } = authClient.useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [scheme, setScheme] = React.useState("indigo");

  // Load and sync scheme
  React.useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("osint-map-scheme") || "indigo";
    setScheme(saved);
  }, []);

  const updateScheme = (newScheme: string) => {
    setScheme(newScheme);
    localStorage.setItem("osint-map-scheme", newScheme);
    document.documentElement.setAttribute("data-scheme", newScheme);
  };

  if (isPending || !mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Activity className="w-8 h-8 animate-pulse text-primary/20" />
      </div>
    );
  }

  const themes = [
    { id: "light", label: "Standard Surface", icon: Sun },
    { id: "dark", label: "Operational Dark", icon: Moon },
    { id: "system", label: "System Dynamic", icon: Monitor },
  ];

  const sections = [
    {
      id: "scheme",
      label: "Tactical Color Scheme",
      icon: Zap,
      description: "Define the primary operational color language for the interface.",
      content: (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
          {SCHEMES.map((s) => (
            <button
              key={s.id}
              onClick={() => updateScheme(s.id)}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 relative group",
                scheme === s.id
                  ? "bg-primary/10 border-primary shadow-xl shadow-primary/5"
                  : "bg-secondary/20 border-white/5 text-muted-foreground hover:bg-secondary/40 hover:border-white/10"
              )}
            >
              <div 
                className="w-10 h-10 rounded-xl mb-3 shadow-lg transition-transform group-hover:scale-110 flex items-center justify-center"
                style={{ backgroundColor: s.color }}
              >
                {scheme === s.id && <Check className="w-5 h-5 text-white" />}
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest text-center",
                scheme === s.id ? "text-foreground" : "text-muted-foreground/60"
              )}>{s.label}</span>
            </button>
          ))}
        </div>
      )
    },
    {
      id: "appearance",
      label: "Visual Mode",
      icon: Palette,
      description: "Customize the foundational light/dark operational aesthetic.",
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group",
                theme === t.id
                  ? "bg-primary/10 border-primary shadow-xl shadow-primary/5"
                  : "bg-secondary/20 border-white/5 text-muted-foreground hover:bg-secondary/40 hover:border-white/10"
              )}
            >
              <t.icon className={cn(
                "w-6 h-6 mb-3 transition-transform duration-500 group-hover:scale-110",
                theme === t.id ? "text-primary" : "text-muted-foreground/40"
              )} />
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                theme === t.id ? "text-foreground" : "text-muted-foreground/60"
              )}>{t.label}</span>
              {theme === t.id && (
                <div className="absolute top-2 right-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2 h-2 text-primary-foreground" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )
    },
    {
      id: "display",
      label: "Operational Metrics",
      icon: Eye,
      description: "Manage how geographic data and live feeds are prioritized.",
      content: (
        <div className="space-y-3 pt-2">
          <div className="p-4 rounded-2xl bg-secondary/10 border border-white/5 flex items-center justify-between group hover:bg-secondary/20 transition-all">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-tight text-foreground/90">Auto-Center Viewport</span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5">Focus the map when high-severity events are updated in real-time.</span>
            </div>
            <div className="w-10 h-5 bg-primary/20 rounded-full relative cursor-pointer border border-primary/30">
               <div className="absolute top-0.5 left-5 w-4 h-4 bg-primary rounded-full shadow-lg" />
            </div>
          </div>
        </div>
      )
    },
    {
      id: "account",
      label: "Authentication & Role",
      icon: ShieldCheck,
      description: "Review your operational clearance and terminal access levels.",
      content: (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-transparent border border-primary/20 relative overflow-hidden pt-2">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ShieldCheck className="w-24 h-24 text-primary" />
          </div>
          <div className="flex flex-col relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-widest text-primary">System Access Level</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5">Role: {(session?.user as { role?: string })?.role || "USER"}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[11px] font-bold">
                 <span className="text-muted-foreground uppercase tracking-wider">Moderation Terminal</span>
                 <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">Authorized</span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary),0.08),transparent_50%)] pointer-events-none" />
      <div className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <header className="sticky top-0 w-full h-20 border-b border-border/50 bg-background/50 backdrop-blur-xl z-50 flex items-center px-4 md:px-10 justify-between font-sans">
        <Link href="/" className="group flex items-center gap-2.5">
           <div className="w-10 h-10 rounded-2xl bg-secondary/40 flex items-center justify-center border border-border/10 transition-all group-hover:scale-110">
              <ArrowLeft className="w-5 h-5 text-foreground/60 transition-transform group-hover:-translate-x-1" />
           </div>
           <div className="flex flex-col">
              <h1 className="text-sm md:text-lg font-black tracking-tight uppercase text-foreground leading-none">Settings</h1>
              <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground/80 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                 Terminal Config
              </span>
           </div>
        </Link>
      </header>

      <main className="max-w-[950px] mx-auto py-10 md:py-12 px-4 md:px-8 space-y-12 md:space-y-16 pb-32 font-sans">
        {sections.map((section) => (
          <div key={section.id} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col space-y-1.5 border-l-2 border-primary/20 pl-6">
              <div className="flex items-center gap-3">
                <section.icon className="w-4 h-4 text-primary" />
                <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-foreground">{section.label}</h2>
              </div>
              <p className="text-[11px] text-muted-foreground/60 font-medium">{section.description}</p>
            </div>
            <div className="pl-6">
              {section.content}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
