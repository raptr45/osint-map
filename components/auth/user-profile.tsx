"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, Monitor, Moon, Sun, Settings, Heart, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function UserProfile() {
  const { data: session, isPending } = authClient.useSession();
  const { theme, setTheme } = useTheme();

  if (isPending) {
    return (
      <div className="h-10 w-10 animate-pulse bg-muted rounded-full" />
    );
  }

  if (!session) {
    return (
      <Button asChild variant="default" className="rounded-full px-6 transition-all hover:scale-105 active:scale-95">
        <Link href="/auth/sign-in">Sign In</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 overflow-hidden ring-offset-background transition-all hover:ring-2 hover:ring-primary/20">
          {session.user.image ? (
            <Image 
              src={session.user.image} 
              alt={session.user.name} 
              width={40} 
              height={40} 
              className="aspect-square h-full w-full object-cover" 
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <UserIcon className="h-5 w-5" />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-64 p-2 mt-2 backdrop-blur-xl bg-card/80 border-border/50" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2 p-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold leading-none">{session.user.name}</p>
              {(session.user as any).role === "admin" && (
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full border border-primary/20">ADMIN</span>
              )}
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              @{session.user.email.split('@')[0]}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="bg-border/50" />
        
        <div className="p-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <Sun className="h-3.5 w-3.5 block dark:hidden" />
                <Moon className="h-3.5 w-3.5 hidden dark:block" />
              </div>
              <span className="text-sm font-medium">Theme</span>
            </div>
            
            <div className="flex items-center gap-1 bg-secondary p-1 rounded-full border border-border/50">
              <button
                onClick={() => setTheme("system")}
                className={cn(
                  "p-1.5 rounded-full transition-all",
                  theme === "system" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setTheme("light")}
                className={cn(
                  "p-1.5 rounded-full transition-all",
                  theme === "light" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={cn(
                  "p-1.5 rounded-full transition-all",
                  theme === "dark" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Moon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-border/50" />
        
        <DropdownMenuGroup>
          {(session.user as any).role === "admin" && (
            <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg py-2 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
              <Link href="/admin/queue" className="flex items-center gap-2 w-full">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-bold">Moderation Queue</span>
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg py-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg py-2">
            <Heart className="w-4 h-4 text-muted-foreground" />
            <span>Favorites</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator className="bg-border/50" />
        
        <DropdownMenuItem 
          className="cursor-pointer gap-2 rounded-lg py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={() => authClient.signOut()}
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

