import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db/schema";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { eq, asc } from "drizzle-orm";

const router = Router();

router.get("/anthropic/conversations", async (_req, res) => {
  const rows = await db.select().from(conversations).orderBy(asc(conversations.createdAt));
  res.json(rows);
});

router.post("/anthropic/conversations", async (req, res) => {
  const { title } = req.body as { title: string };
  if (!title?.trim()) {
    res.status(400).json({ error: "title required" });
    return;
  }
  const [row] = await db.insert(conversations).values({ title }).returning();
  res.status(201).json(row);
});

router.get("/anthropic/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json({ ...conv, messages: msgs });
});

router.delete("/anthropic/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).end();
});

router.get("/anthropic/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json(msgs);
});

router.post("/anthropic/conversations/:id/messages", async (req, res) => {
  const conversationId = parseInt(req.params.id);
  const { content } = req.body as { content: string };

  if (!content?.trim()) {
    res.status(400).json({ error: "content required" });
    return;
  }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!conv) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.insert(messages).values({ conversationId, role: "user", content });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  const systemPrompt = conv.title.startsWith("{")
    ? (() => {
        try {
          const ctx = JSON.parse(conv.title);
          return buildSystemPrompt(ctx);
        } catch {
          return DEFAULT_SYSTEM;
        }
      })()
    : DEFAULT_SYSTEM;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let assistantContent = "";

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const chunk = event.delta.text;
        assistantContent += chunk;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
    }

    await db.insert(messages).values({ conversationId, role: "assistant", content: assistantContent });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Anthropic streaming error", err);
    res.write(`data: ${JSON.stringify({ error: "AI error" })}\n\n`);
    res.end();
  }
});

const DEFAULT_SYSTEM = `أنت مساعد تشخيص سيارات متخصص. أجب بالعربية والإنجليزية حسب السياق. قدّم توصيات إصلاح واضحة ومرتّبة حسب الأولوية.`;

function buildSystemPrompt(ctx: {
  vehicle?: { make?: string; model?: string; year?: number; vin?: string };
  dtcs?: Array<{ code: string; description: string; severity?: string }>;
  liveData?: Record<string, string | number>;
}) {
  const lines: string[] = [
    "أنت مساعد تشخيص سيارات متخصص بنظام Autel MaxiSYS MS Ultra S2.",
    "أجب بالعربية بشكل أساسي، وأضف المصطلحات التقنية بالإنجليزية عند الحاجة.",
    "قدّم توصيات إصلاح واضحة ومرتّبة حسب الأولوية.",
    "",
  ];

  if (ctx.vehicle) {
    const v = ctx.vehicle;
    lines.push(`## معلومات المركبة`);
    lines.push(`- الصنع: ${v.make || "غير محدد"} | الموديل: ${v.model || "غير محدد"} | السنة: ${v.year || "غير محدد"}`);
    if (v.vin) lines.push(`- VIN: ${v.vin}`);
    lines.push("");
  }

  if (ctx.dtcs && ctx.dtcs.length > 0) {
    lines.push(`## أكواد الأعطال النشطة (DTCs)`);
    ctx.dtcs.forEach((d) => {
      lines.push(`- **${d.code}**: ${d.description}${d.severity ? ` [${d.severity}]` : ""}`);
    });
    lines.push("");
  }

  if (ctx.liveData && Object.keys(ctx.liveData).length > 0) {
    lines.push(`## البيانات الحية`);
    Object.entries(ctx.liveData).forEach(([k, v]) => {
      lines.push(`- ${k}: ${v}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

/* ─── Simple Diagnose endpoint for the AI assistant ─── */
router.post("/ai/diagnose", async (req, res) => {
  const { message, systemPrompt, history = [] } = req.body as {
    message: string;
    systemPrompt: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "message required" });
    return;
  }

  const chatMessages = [
    ...history,
    { role: "user" as const, content: message },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ delta: { text: event.delta.text } })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    console.error("AI diagnose error:", err);
    res.write(`data: ${JSON.stringify({ error: "AI error" })}\n\n`);
    res.end();
  }
});

/* ─── AI Cost Estimator ─── */
router.post("/ai/cost-estimate", async (req, res) => {
  const { dtcs, vehicle, lang = "ar" } = req.body as {
    dtcs: Array<{ code: string; description: string }>;
    vehicle?: { make?: string; model?: string; year?: number };
    lang?: string;
  };

  if (!dtcs?.length) {
    res.status(400).json({ error: "dtcs required" });
    return;
  }

  const isAr = lang === "ar";
  const vehicleStr = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "unknown vehicle";
  const dtcStr = dtcs.map(d => `${d.code}: ${d.description}`).join("\n");

  const prompt = isAr
    ? `قدّر تكلفة إصلاح الأعطال التالية للسيارة ${vehicleStr}:\n${dtcStr}\n\nأعطِ تقديراً للتكلفة بالريال السعودي (SAR) لكل عطل مع وقت الإصلاح المتوقع.`
    : `Estimate repair costs for the following faults on a ${vehicleStr}:\n${dtcStr}\n\nProvide cost estimates in USD for each fault with estimated repair time.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    res.json({ estimate: text });
  } catch (err) {
    console.error("Cost estimate error:", err);
    res.status(500).json({ error: "Failed to generate estimate" });
  }
});

/* ─── AI Repair Priority ─── */
router.post("/ai/repair-priority", async (req, res) => {
  const { dtcs, vehicle, lang = "ar" } = req.body as {
    dtcs: Array<{ code: string; description: string; severity?: string }>;
    vehicle?: { make?: string; model?: string; year?: number };
    lang?: string;
  };

  if (!dtcs?.length) {
    res.status(400).json({ error: "dtcs required" });
    return;
  }

  const isAr = lang === "ar";
  const vehicleStr = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "unknown vehicle";
  const dtcStr = dtcs.map(d => `${d.code}: ${d.description}${d.severity ? ` [${d.severity}]` : ""}`).join("\n");

  const prompt = isAr
    ? `رتّب أعطال السيارة ${vehicleStr} حسب الأولوية والخطورة:\n${dtcStr}\n\nأعطِ قائمة مرتّبة من الأهم للأقل مع شرح قصير لكل عطل وسبب أولويته.`
    : `Prioritize these faults for a ${vehicleStr} by urgency and safety impact:\n${dtcStr}\n\nReturn a ranked list from most to least urgent with brief reasoning for each.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    res.json({ priorities: text });
  } catch (err) {
    console.error("Repair priority error:", err);
    res.status(500).json({ error: "Failed to generate priorities" });
  }
});

export default router;
