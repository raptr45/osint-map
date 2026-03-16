"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, User as UserIcon, Loader2 } from "lucide-react";
import Image from "next/image";

interface RoleUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  roleRequest?: "pending" | "rejected" | null;
}

export default function RoleRequestsPage() {
  const [requests, setRequests] = useState<RoleUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/admin/roles");
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (userId: string, action: "approve" | "reject") => {
    try {
      await fetch("/api/admin/roles", {
        method: "PATCH",
        body: JSON.stringify({ userId, action }),
      });
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
        <p className="text-muted-foreground">Review and approve access requests for OSINT analysts.</p>
      </div>

      <div className="grid gap-4">
        {requests.length === 0 ? (
          <Card className="p-12 text-center bg-secondary/20 border-dashed border-2">
            <UserIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No pending requests</h3>
            <p className="text-sm text-muted-foreground">When users apply for admin access, they will appear here.</p>
          </Card>
        ) : (
          requests.map((req) => (
            <Card key={req.id} className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                    {req.image ? (
                      <Image 
                        src={req.image} 
                        alt={`${req.name || 'User'}'s profile picture`}
                        width={48}
                        height={48}
                        className="rounded-full w-full h-full object-cover" 
                      />
                    ) : (
                      <UserIcon className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{req.name}</h4>
                    <p className="text-sm text-muted-foreground">{req.email}</p>
                    <Badge variant="outline" className="mt-2 text-[10px] uppercase font-bold tracking-widest text-primary border-primary/20 bg-primary/5">
                      {req.roleRequest}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
                    onClick={() => handleAction(req.id, "reject")}
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="gap-2 bg-primary shadow-lg shadow-primary/20"
                    onClick={() => handleAction(req.id, "approve")}
                  >
                    <Check className="w-4 h-4" />
                    Approve Admin
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
