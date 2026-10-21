import { subscribeRateHub } from "@/lib/rate-hub";
import type { RateBook } from "@/lib/rates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let open = true;
      const send = (book: RateBook) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(book)}\n\n`));
        } catch {
          open = false;
          unsubscribe();
        }
      };
      unsubscribe = subscribeRateHub(send);
    },
    cancel() {
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
