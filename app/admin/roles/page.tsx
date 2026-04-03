"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User as UserIcon, Loader2, Users, ShieldAlert, Shield, Eye } from "lucide-react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface RoleUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: "owner" | "admin" | "moderator" | "analyst" | "user";
  roleRequest?: "pending" | "rejected" | null;
}

export default function RoleRequestsPage() {
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery<RoleUser[]>({
    queryKey: ["admin-roles"],
    queryFn:  () => fetch("/api/admin/roles").then((r) => r.json()),
    refetchInterval: 10_000,
  });

  const handleAction = async (userId: string, action: string) => {
    try {
      await fetch("/api/admin/roles", {
        method: "PATCH",
        body: JSON.stringify({ userId, action }),
      });
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 opacity-50 px-6 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <span className="text-xs font-bold uppercase tracking-widest text-primary italic">Scanning Personnel Registry...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 md:p-10 space-y-8 animate-in fade-in duration-700 font-sans max-w-7xl mx-auto overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-white/5">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-display text-white italic">
            User Management
          </h1>
          <p className="text-muted-foreground/60 text-[9px] sm:text-sm font-medium tracking-widest uppercase">
            Manage user accounts AND ACCESS PRIVILEGES
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-secondary/20 border border-white/5 backdrop-blur-xl flex items-center gap-3 shadow-xl">
             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse" />
             <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Auth Service Online</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6">
        {!users || users.length === 0 ? (
          <Card className="p-10 sm:p-20 text-center bg-card/20 backdrop-blur-xl border-dashed border-2 border-border/40 rounded-3xl">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-6">
               <Users className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-display tracking-tight mb-2 italic">No users found</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto opacity-60">No user accounts to display.</p>
          </Card>
        ) : (
          users.sort((a, b) => {
            if (a.roleRequest === "pending" && b.roleRequest !== "pending") return -1;
            if (a.roleRequest !== "pending" && b.roleRequest === "pending") return 1;
            return 0;
          }).map((req) => (
            <div key={req.id} className="tactical-card group p-5 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
              <div className="premium-glow" />
              
              <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-4 sm:gap-8 relative z-10 w-full lg:w-auto">
                {/* Profile Section */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[2rem] bg-white/5 flex items-center justify-center overflow-hidden border-2 border-white/10 shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                    {req.image ? (
                      <Image 
                        src={req.image} 
                        alt={req.name || 'User'}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <Users className="w-8 h-8 text-white/20" />
                    )}
                  </div>
                  {req.roleRequest === "pending" && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-amber-500 rounded-full border-4 border-[#121214] animate-pulse shadow-xl shadow-amber-500/40" />
                  )}
                </div>

                <div className="flex-1 space-y-2 sm:space-y-3 min-w-0 text-center sm:text-left w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap justify-center sm:justify-start">
                    <h3 className="font-black text-xl sm:text-2xl font-display tracking-tight text-white/90 truncate group-hover:text-primary transition-colors uppercase leading-none italic">
                      {req.name}
                    </h3>
                    {req.roleRequest === "pending" && (
                      <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[9px] font-black text-amber-500 uppercase tracking-widest shadow-lg shadow-amber-500/10 w-fit mx-auto sm:mx-0">
                        Elevation Requested
                      </div>
                    )}
                  </div>
                  
                  <p className="text-[10px] sm:text-xs text-muted-foreground/60 font-mono font-medium tracking-widest uppercase truncate max-w-md">
                    {req.email}
                  </p>

                  <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 pt-1">
                    {req.role === "owner" && (
                      <div className="tactical-badge bg-primary text-primary-foreground border-transparent shadow-primary/20 flex items-center gap-1.5 px-2.5 py-1">
                        <ShieldAlert className="w-3 h-3" /> OWNER
                      </div>
                    )}
                    {req.role === "admin" && (
                      <div className="tactical-badge bg-rose-500/10 border-rose-500/30 text-rose-500 flex items-center gap-1.5 px-2.5 py-1">
                        <Shield className="w-3 h-3" /> ADMIN
                      </div>
                    )}
                    {req.role === "moderator" && (
                      <div className="tactical-badge bg-amber-500/10 border-amber-500/30 text-amber-500 flex items-center gap-1.5 px-2.5 py-1">
                        <Shield className="w-3 h-3" /> MOD
                      </div>
                    )}
                    {req.role === "analyst" && (
                      <div className="tactical-badge bg-blue-500/10 border-blue-500/30 text-blue-500 flex items-center gap-1.5 px-2.5 py-1">
                        <Eye className="w-3 h-3" /> ANALYST
                      </div>
                    )}
                    {req.role === "user" && (
                      <div className="tactical-badge bg-white/5 border-white/5 text-white/30 flex items-center gap-1.5 px-2.5 py-1">
                        <UserIcon className="w-3 h-3" /> USER
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls Section */}
              {req.role !== "owner" && (
                <div className="flex flex-col items-center lg:items-end gap-3 sm:gap-4 w-full lg:w-auto relative z-10 pt-4 sm:pt-6 lg:pt-0 border-t lg:border-none border-white/5">
                  <span className="text-[9px] font-black uppercase text-muted-foreground/30 tracking-[0.15em] sm:mr-2">Assign Role Elevation</span>
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-xl w-full sm:w-auto">
                    {(["user", "analyst", "moderator", "admin"] as const).map((role) => {
                      const actionMap = { user: "demote", analyst: "approve_analyst", moderator: "approve_moderator", admin: "approve_admin" };
                      const colorMap = { user: "bg-white/5 text-white/40 hover:text-white hover:bg-white/10", analyst: "bg-blue-500/10 text-blue-500/60 hover:text-blue-400 hover:bg-blue-500/20", moderator: "bg-amber-500/10 text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/20", admin: "bg-rose-500/10 text-rose-500/60 hover:text-rose-400 hover:bg-rose-500/20" };
                      const activeColorMap = { user: "bg-white/20 text-white border-white/20 shadow-xl", analyst: "bg-blue-500 text-white border-blue-500/20 shadow-xl shadow-blue-500/20", moderator: "bg-amber-500 text-white border-amber-500/20 shadow-xl shadow-amber-500/20", admin: "bg-rose-500 text-white border-rose-500/20 shadow-xl shadow-rose-500/20" };
                      
                      return (
                        <Button 
                          key={role}
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleAction(req.id, actionMap[role])} 
                          className={cn(
                            "h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                            req.role === role ? activeColorMap[role] : colorMap[role]
                          )}
                        >
                          {role}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>

  );
}
