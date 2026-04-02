"use client";

import { Badge } from "@/components/ui/badge";
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
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 opacity-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <span className="text-xs font-bold uppercase tracking-wide text-primary">Scanning Personnel Registry...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-display mb-1 text-foreground">Personnel Registry</h1>
        <p className="text-muted-foreground text-sm uppercase tracking-wide font-medium">Review clearance requests and manage tactical access levels.</p>
      </div>

      <div className="grid gap-6">
        {!users || users.length === 0 ? (
          <Card className="p-20 text-center bg-card/20 backdrop-blur-xl border-dashed border-2 border-border/40 rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-6">
               <Users className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-bold font-display uppercase tracking-tight mb-2">Registry Clear</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">No personnel data available.</p>
          </Card>
        ) : (
          users.sort((a, b) => {
            if (a.roleRequest === "pending" && b.roleRequest !== "pending") return -1;
            if (a.roleRequest !== "pending" && b.roleRequest === "pending") return 1;
            return 0;
          }).map((req) => (
            <Card key={req.id} className="p-6 bg-card/30 backdrop-blur-xl border-border/40 hover:bg-card/40 transition-all group overflow-hidden relative shadow-lg">
              <div className="absolute right-0 top-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <div className="text-xs font-bold text-muted-foreground uppercase bg-secondary/80 px-2 py-1 rounded border border-border/40 backdrop-blur-md">ID: {req.id}</div>
              </div>

              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center overflow-hidden border border-border/40 shadow-xl group-hover:scale-105 transition-transform">
                        {req.image ? (
                        <Image 
                            src={req.image} 
                            alt={`${req.name || 'User'}'s profile picture`}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover" 
                        />
                        ) : (
                        <UserIcon className="w-8 h-8 text-muted-foreground/40" />
                        )}
                    </div>
                    {req.roleRequest === "pending" && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-4 border-card animate-pulse shadow-lg shadow-amber-500/50" />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                        <h4 className="font-bold text-lg tracking-tight font-display uppercase leading-none">{req.name}</h4>
                        {req.roleRequest === "pending" && (
                            <Badge className="bg-amber-500 text-white border-none text-[11px] font-bold tracking-wide px-2 py-0.5 h-auto rounded-full shadow-lg shadow-amber-500/20">CLEARANCE REQUESTED</Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono font-medium opacity-80 uppercase tracking-wide">{req.email}</p>
                    <div className="pt-1 flex items-center gap-2">
                        {req.role === "owner" && <Badge variant="default" className="bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 text-[11px] uppercase font-bold tracking-wide px-2 py-0.5"><ShieldAlert className="w-3 h-3 mr-1.5" /> Owner</Badge>}
                        {req.role === "admin" && <Badge variant="default" className="bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20 text-[11px] uppercase font-bold tracking-wide px-2 py-0.5"><ShieldAlert className="w-3 h-3 mr-1.5" /> Admin</Badge>}
                        {req.role === "moderator" && <Badge variant="default" className="bg-orange-500 text-white shadow-lg shadow-orange-500/20 text-[11px] uppercase font-bold tracking-wide px-2 py-0.5"><Shield className="w-3 h-3 mr-1.5" /> Moderator</Badge>}
                        {req.role === "analyst" && <Badge variant="default" className="bg-blue-500 text-white shadow-lg shadow-blue-500/20 text-[11px] uppercase font-bold tracking-wide px-2 py-0.5"><Eye className="w-3 h-3 mr-1.5" /> Analyst</Badge>}
                        {req.role === "user" && <Badge variant="outline" className="text-muted-foreground text-[11px] uppercase font-bold tracking-wide px-2 py-0.5 border-border/40"><UserIcon className="w-3 h-3 mr-1.5" /> Basic User</Badge>}
                    </div>
                  </div>
                </div>

                {req.role !== "owner" && (
                  <div className="flex flex-col items-end gap-2 w-full lg:w-auto mt-4 lg:mt-0 pt-4 border-t border-border/10 lg:border-none lg:pt-0">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground/50 tracking-wide">Assign Tactical Clearance</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleAction(req.id, "demote")} 
                        className={cn("h-8 text-[11px] font-bold uppercase tracking-wide rounded-lg transition-all", req.role === "user" ? "bg-secondary text-secondary-foreground border-transparent" : "text-muted-foreground border-border/20 hover:bg-secondary/20")}
                      >
                        Civilian
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleAction(req.id, "approve_analyst")} 
                        className={cn("h-8 text-[11px] font-bold uppercase tracking-wide rounded-lg transition-all", req.role === "analyst" ? "bg-blue-500 text-white border-blue-500/50 shadow-lg shadow-blue-500/20" : "text-muted-foreground border-border/20 hover:bg-blue-500/10 hover:text-blue-500")}
                      >
                        Analyst
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleAction(req.id, "approve_moderator")} 
                        className={cn("h-8 text-[11px] font-bold uppercase tracking-wide rounded-lg transition-all", req.role === "moderator" ? "bg-orange-500 text-white border-orange-500/50 shadow-lg shadow-orange-500/20" : "text-muted-foreground border-border/20 hover:bg-orange-500/10 hover:text-orange-500")}
                      >
                        Moderator
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleAction(req.id, "approve_admin")} 
                        className={cn("h-8 text-[11px] font-bold uppercase tracking-wide rounded-lg transition-all", req.role === "admin" ? "bg-destructive text-destructive-foreground border-destructive/50 shadow-lg shadow-destructive/20" : "text-destructive/50 border-destructive/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30")}
                      >
                        Admin
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
