"use client";

import { authClient } from "@/lib/auth-client";
import { 
  ArrowLeft, 
  ShieldCheck, 
  User as UserIcon, 
  Mail, 
  Calendar, 
  Activity,
  LogOut,
  ChevronRight,
  ExternalLink,
  Settings as SettingsIcon,
  Fingerprint
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import * as React from "react";

export default function ProfilePage() {
  const { data: session, isPending } = authClient.useSession();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (isPending || !mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Activity className="w-8 h-8 animate-pulse text-primary/20" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
         <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mb-6 border border-border/10">
            <Fingerprint className="w-8 h-8 text-muted-foreground/40" />
         </div>
         <h1 className="text-xl font-black uppercase tracking-tight mb-2 text-foreground">Authentication Required</h1>
         <p className="text-xs text-muted-foreground max-w-xs mb-8">You must be authenticated to access operational profile metrics.</p>
         <Button asChild className="tactical-btn h-11 px-8">
            <Link href="/auth/sign-in">Sign In</Link>
         </Button>
      </div>
    );
  }

  const user = session.user as { name: string; email: string; image?: string | null; role?: string };
  const role = user.role || "USER";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary),0.05),transparent_50%)] pointer-events-none" />
      
      <header className="sticky top-0 w-full h-20 border-b border-border/50 bg-background/50 backdrop-blur-xl z-50 flex items-center px-10 justify-between">
        <Link href="/" className="group flex items-center gap-2.5">
           <div className="w-10 h-10 rounded-2xl bg-secondary/40 flex items-center justify-center border border-border/10 transition-all group-hover:scale-110">
              <ArrowLeft className="w-5 h-5 text-foreground/60 transition-transform group-hover:-translate-x-1" />
           </div>
           <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tight uppercase text-foreground leading-none">User Profile</h1>
              <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                 Personnel Registry
              </span>
           </div>
        </Link>
        
        <Link href="/settings" className="flex items-center gap-2 px-4 h-10 rounded-xl bg-secondary/20 border border-border/10 text-[10px] font-black uppercase tracking-widest hover:bg-secondary/40 transition-all text-foreground">
           <SettingsIcon className="w-3.5 h-3.5" />
           System Settings
        </Link>
      </header>

      <main className="max-w-[800px] mx-auto py-16 px-8 flex flex-col items-center">
        {/* User Card */}
        <div className="w-full relative group">
           <div className="absolute inset-0 bg-primary/5 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
           <div className="relative glass-panel p-10 flex flex-col items-center text-center overflow-hidden border-border/20">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                 <ShieldCheck className="w-48 h-48 text-primary" />
              </div>

              <div className="relative mb-8">
                 <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-125 animate-pulse" />
                 <div className="w-32 h-32 rounded-[2.5rem] bg-secondary/20 border-2 border-primary/20 p-1.5 relative z-10 overflow-hidden shadow-2xl">
                    {user.image ? (
                       <Image src={user.image} alt={user.name || ""} width={128} height={128} className="w-full h-full object-cover rounded-[2rem]" />
                    ) : (
                       <div className="w-full h-full flex items-center justify-center bg-primary/10">
                          <UserIcon className="w-12 h-12 text-primary" />
                       </div>
                    )}
                 </div>
                 <div className="absolute -bottom-2 -right-2 bg-background border border-border/20 p-2.5 rounded-2xl shadow-xl z-20">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                 </div>
              </div>

              <h2 className="text-3xl font-black tracking-tight text-foreground uppercase mb-2 drop-shadow-sm">{user.name}</h2>
              <div className="flex items-center gap-2 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 mb-10">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                 <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{role} ACCESS AUTHORIZED</span>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full pt-10 border-t border-border/10">
                 <div className="flex flex-col items-center p-6 rounded-3xl bg-secondary/5 group/item hover:bg-secondary/10 transition-all border border-border/10">
                    <Mail className="w-5 h-5 text-muted-foreground/40 mb-3" />
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">Communication</span>
                    <span className="text-xs font-bold text-foreground break-all">{user.email}</span>
                 </div>
                 <div className="flex flex-col items-center p-6 rounded-3xl bg-secondary/5 group/item hover:bg-secondary/10 transition-all border border-border/10">
                    <Calendar className="w-5 h-5 text-muted-foreground/40 mb-3" />
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">Registry Date</span>
                    <span className="text-xs font-bold text-foreground font-mono">03 APR 2026</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
           <Link href="/admin/queue" className="group glass-panel p-6 flex items-center justify-between hover:bg-secondary/20 transition-all border-border/20">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Activity className="w-5 h-5 text-primary" />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase tracking-wider text-foreground">Live Operations</span>
                    <span className="text-[9px] text-muted-foreground/60 font-black uppercase mt-0.5">Access Moderation Feed</span>
                 </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:translate-x-1 group-hover:text-primary transition-all" />
           </Link>

           <button 
             onClick={() => authClient.signOut()}
             className="group glass-panel p-6 flex items-center justify-between hover:bg-destructive/5 hover:border-destructive/20 transition-all border-border/20 text-left"
           >
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
                    <LogOut className="w-5 h-5 text-destructive" />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase tracking-wider text-destructive">Terminate Session</span>
                    <span className="text-[9px] text-muted-foreground/60 font-black uppercase mt-0.5">Securely sign out of terminal</span>
                 </div>
              </div>
              <ExternalLink className="w-4 h-4 text-destructive/30 group-hover:scale-110 group-hover:text-destructive transition-all" />
           </button>
        </div>

        <div className="mt-20 pt-8 border-t border-border/10 w-full text-center">
            <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.3em] font-mono">
               Identity Verification Module // Terminal Secure v0.1
            </p>
        </div>
      </main>
    </div>
  );
}
