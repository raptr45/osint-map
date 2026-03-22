"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldCheck, User as UserIcon, X, Check, Loader2, Users } from "lucide-react";
import Image from "next/image";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface RoleUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  roleRequest?: "pending" | "rejected" | null;
}

export default function RoleRequestsPage() {
  const { data: requests, mutate, isLoading } = useSWR<RoleUser[]>("/api/admin/roles", fetcher, {
    refreshInterval: 10000
  });

  const handleAction = async (userId: string, action: "approve" | "reject") => {
    try {
      await fetch("/api/admin/roles", {
        method: "PATCH",
        body: JSON.stringify({ userId, action }),
      });
      mutate();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 opacity-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Scanning Personnel Registry...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-display mb-1 uppercase">Personnel Registry</h1>
        <p className="text-muted-foreground text-sm">Review clearance requests and manage tactical access levels.</p>
      </div>

      <div className="grid gap-4 max-w-4xl">
        {!requests || requests.length === 0 ? (
          <Card className="p-20 text-center bg-card/20 backdrop-blur-xl border-dashed border-2 border-border/40 rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-6">
               <Users className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-bold font-display uppercase tracking-tight mb-2">Registry Clear</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">No pending administrative clearance requests in the current queue.</p>
          </Card>
        ) : (
          requests.map((req) => (
            <Card key={req.id} className="p-6 bg-card/30 backdrop-blur-xl border-border/40 hover:bg-card/40 transition-all group overflow-hidden relative">
              <div className="absolute right-0 top-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <div className="text-xs font-bold text-muted-foreground uppercase bg-secondary/80 px-2 py-1 rounded border border-border/40">ID: {req.id}</div>
              </div>

              <div className="flex items-center justify-between">
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

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg tracking-tight font-display uppercase leading-none">{req.name}</h4>
                        {req.roleRequest === "pending" && (
                            <Badge className="bg-amber-500 text-white border-none text-xs font-bold px-2 py-0 h-4 rounded-full">PRIORITY</Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium opacity-70">REIGSTRY EMAIL: {req.email}</p>
                    <div className="pt-2">
                        <Badge variant="outline" className="text-xs font-bold border-primary/20 text-primary bg-primary/5 rounded-lg px-2 py-1">
                            <ShieldCheck className="w-3 h-3 mr-1.5 opacity-70" />
                            AWAITING LEVEL 2 CLEARANCE
                        </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-11 px-5 rounded-xl text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 text-xs font-bold uppercase tracking-widest gap-2"
                    onClick={() => handleAction(req.id, "reject")}
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-11 px-6 rounded-xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs font-bold uppercase tracking-widest gap-2"
                    onClick={() => handleAction(req.id, "approve")}
                  >
                    <Check className="w-4 h-4" />
                    Grant Level 2
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
