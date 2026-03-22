import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { hasClearance } from "@/lib/admin-check";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await hasClearance("analyst"))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Send an initial connected message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));
      
      let lastCheckedDate = new Date();
      let isClosed = false;
      
      const interval = setInterval(async () => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }
        
        try {
          // Find any pending events created after lastCheckedDate
          const newEvents = await db.query.pendingEvents.findMany({
             where: (events, { gt }) => gt(events.createdAt, lastCheckedDate),
             orderBy: (events, { asc }) => [asc(events.createdAt)]
          });
          
          if (newEvents.length > 0) {
            lastCheckedDate = newEvents[newEvents.length - 1].createdAt;
            for (const event of newEvents) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "new_event", data: event })}\n\n`)
              );
            }
          }
        } catch (e) {
          console.error("SSE Polling Error", e);
        }
      }, 5000); // poll every 5 seconds
      
      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(interval);
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}
