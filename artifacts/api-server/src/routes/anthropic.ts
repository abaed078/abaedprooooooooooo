import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db/schema";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { eq, asc } from "drizzle-orm";

const router = Router();

const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-4-6";
const CACHE_TTL_MS = 1000 * 60 * 10;
const MAX_CACHE_ITEMS = 80;
const responseCache = new Map<string, { text: string; expiresAt: number }>();

const DTC_KNOWLEDGE: Record<string, { ar: string; en: string; checksAr: string[]; checksEn: string[]; urgency: string }> = {
  P0300: {
    ar: "اشتعال عشوائي أو متعدد في الأسطوانات. غالباً يرتبط بالبواجي، الكويلات، بخاخات الوقود، تهريب هواء، أو ضغط ميكانيكي غير مستقر.",
    en: "Random or multiple cylinder misfire. Common causes include spark plugs, coils, injectors, vacuum leaks, or unstable mechanical compression.",
    checksAr: ["افحص البواجي والكويلات حسب الأسطوانة", "راجع عدادات misfire live data", "اختبر ضغط الوقود والتهريب الهوائي", "افحص ضغط الأسطوانات إذا استمر العطل"],
    checksEn: ["Inspect plugs and coils by cylinder", "Review misfire counters in live data", "Test fuel pressure and vacuum leaks", "Run compression testing if the fault persists"],
    urgency: "critical",
  },
  P0234: {
    ar: "ضغط توربو زائد عن المطلوب. قد ينتج عن wastegate عالق، حساس MAP/boost، تسريب أو انسداد في خراطيم التحكم، أو برمجة غير صحيحة.",
    en: "Turbocharger overboost. Likely causes include a stuck wastegate, MAP/boost sensor faults, control hose leaks/blockage, or incorrect calibration.",
    checksAr: ["افحص خراطيم التحكم والفاكيوم", "قارن boost actual مقابل desired", "اختبر wastegate/actuator", "افحص حساس MAP ونظافة مجرى الهواء"],
    checksEn: ["Inspect vacuum/control hoses", "Compare actual boost versus desired boost", "Test wastegate/actuator movement", "Inspect MAP sensor and intake path cleanliness"],
    urgency: "high",
  },
  P0420: {
    ar: "كفاءة المحفز الحفاز أقل من الحد. لا تستبدل المحفز قبل فحص حساسات الأكسجين، التسريبات، ومشاكل الاشتعال.",
    en: "Catalyst efficiency below threshold. Do not replace the catalyst before checking oxygen sensors, exhaust leaks, and misfire issues.",
    checksAr: ["راجع قراءات O2 قبل وبعد المحفز", "افحص تهريب العادم", "تأكد من عدم وجود misfire", "اختبر حرارة المحفز قبل/بعد"],
    checksEn: ["Review upstream/downstream O2 readings", "Check exhaust leaks", "Confirm there are no misfires", "Test catalyst inlet/outlet temperature"],
    urgency: "medium",
  },
  B0083: {
    ar: "خلل دائرة حساس الصدمة الأمامي الأيسر. هذا مرتبط بنظام SRS ويجب التعامل معه كعطل سلامة.",
    en: "Front left impact sensor circuit fault. This is SRS-related and should be treated as a safety fault.",
    checksAr: ["افصل البطارية حسب تعليمات السلامة قبل الفحص", "افحص الفيشة والضفيرة للحساس", "تحقق من مقاومة الدائرة", "امسح العطل ثم أعد فحص SRS"],
    checksEn: ["Disconnect the battery following safety procedure before inspection", "Inspect sensor connector and harness", "Verify circuit resistance", "Clear the code and rescan SRS"],
    urgency: "high",
  },
};

function isAiConfigured() {
  const key = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || "";
  return Boolean(key && key !== "dummy" && key !== "sk-ant-dummy");
}

function cleanText(value: unknown, max = 3000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cacheKey(parts: unknown[]) {
  return JSON.stringify(parts).toLowerCase().replace(/\s+/g, " ").slice(0, 8000);
}

function getCached(key: string) {
  const item = responseCache.get(key);
  if (!item) return "";
  if (item.expiresAt < Date.now()) {
    responseCache.delete(key);
    return "";
  }
  return item.text;
}

function setCached(key: string, text: string) {
  if (!text.trim()) return;
  if (responseCache.size >= MAX_CACHE_ITEMS) {
    const first = responseCache.keys().next().value;
    if (first) responseCache.delete(first);
  }
  responseCache.set(key, { text, expiresAt: Date.now() + CACHE_TTL_MS });
}

function writeSse(res: Parameters<Parameters<typeof router.post>[1]>[1], payload: unknown) {
  res.write(`data: ${typeof payload === "string" ? payload : JSON.stringify(payload)}\n\n`);
}

async function streamLocalAnswer(res: Parameters<Parameters<typeof router.post>[1]>[1], text: string, shape: "diagnose" | "conversation" = "diagnose") {
  const chunks = text.match(/.{1,280}(\s|$)/g) || [text];
  for (const chunk of chunks) {
    writeSse(res, shape === "diagnose" ? { delta: { text: chunk } } : { chunk });
  }
  writeSse(res, shape === "diagnose" ? "[DONE]" : { done: true, source: "local-expert" });
  res.end();
}

function compactHistory(history: unknown) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && cleanText(m.content, 1200))
    .slice(-6)
    .map((m) => ({ role: m.role as "user" | "assistant", content: cleanText(m.content, 1200) }));
}

function extractDtcCodes(text: string) {
  return Array.from(new Set((text.toUpperCase().match(/\b[PCBU][0-9A-F]{4}\b/g) || [])));
}

function buildLocalDiagnosticAnswer(message: string, lang = "ar") {
  const isAr = lang !== "en";
  const codes = extractDtcCodes(message);
  const matchedCodes = codes.length ? codes : ["P0300", "P0234", "P0420"];
  const known = matchedCodes.map((code) => [code, DTC_KNOWLEDGE[code]] as const).filter(([, info]) => info);

  if (!known.length) {
    return isAr
      ? [
          "## تحليل سريع",
          "لم أجد كود عطل واضح في السؤال، لذلك أعطيك خطة تشخيص عالية الأداء تصلح لمعظم أعطال السيارات.",
          "",
          "1. اقرأ الأكواد من جميع الأنظمة وليس المحرك فقط.",
          "2. رتّب الأعطال حسب السلامة ثم الأعطال التي تسبب أعطالاً أخرى.",
          "3. افحص البيانات الحية Freeze Frame وLive Data قبل مسح الأكواد.",
          "4. اختبر البطارية والشحن أولاً لأن الجهد الضعيف يسبب أعطالاً وهمية.",
          "5. بعد كل إصلاح امسح الأكواد ثم نفذ اختبار قيادة وإعادة فحص.",
        ].join("\n")
      : [
          "## Quick analysis",
          "I did not detect a clear DTC in the question, so here is a high-performance workflow for most vehicle faults.",
          "",
          "1. Scan all modules, not only the engine ECU.",
          "2. Prioritize safety faults, then root-cause faults that can create secondary codes.",
          "3. Review Freeze Frame and Live Data before clearing codes.",
          "4. Test battery and charging voltage first because low voltage can create false faults.",
          "5. After repair, clear codes, road test, and rescan.",
        ].join("\n");
  }

  const lines = isAr
    ? ["## تشخيص ذكي سريع", "تم استخدام محرك خبير محلي سريع لأن خدمة الذكاء الخارجية غير متاحة حالياً.", ""]
    : ["## Fast expert diagnosis", "A fast local expert engine was used because the external AI service is currently unavailable.", ""];

  known.forEach(([code, info], index) => {
    lines.push(`${index + 1}. **${code}**`);
    lines.push(isAr ? info.ar : info.en);
    lines.push(isAr ? `- الأولوية: ${info.urgency}` : `- Urgency: ${info.urgency}`);
    (isAr ? info.checksAr : info.checksEn).forEach((check) => lines.push(`- ${check}`));
    lines.push("");
  });

  lines.push(isAr ? "## أفضل ترتيب عمل" : "## Best work order");
  lines.push(isAr ? "1. ثبّت الجهد والبطارية قبل أي فحص." : "1. Stabilize battery and charging voltage before diagnostics.");
  lines.push(isAr ? "2. ابدأ بالأعطال الحرجة أو المؤثرة على السلامة." : "2. Start with critical or safety-impacting faults.");
  lines.push(isAr ? "3. راقب البيانات الحية بعد كل خطوة ولا تعتمد على تبديل القطع مباشرة." : "3. Watch live data after each step and avoid parts swapping.");

  return lines.join("\n");
}

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

  const cleanedMessage = cleanText(message, 2500);
  const cleanedSystemPrompt = cleanText(systemPrompt, 3000) || DEFAULT_SYSTEM;
  const compactedHistory = compactHistory(history);
  const lang = /[\u0600-\u06FF]/.test(cleanedMessage + cleanedSystemPrompt) ? "ar" : "en";
  const key = cacheKey(["diagnose", cleanedMessage, cleanedSystemPrompt, compactedHistory]);

  if (!cleanedMessage) {
    res.status(400).json({ error: "message required" });
    return;
  }

  const cached = getCached(key);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  if (cached) {
    await streamLocalAnswer(res, cached);
    return;
  }

  const chatMessages = [
    ...compactedHistory,
    { role: "user" as const, content: cleanedMessage },
  ];

  if (!isAiConfigured()) {
    const localAnswer = buildLocalDiagnosticAnswer(cleanedMessage, lang);
    setCached(key, localAnswer);
    await streamLocalAnswer(res, localAnswer);
    return;
  }

  try {
    let assistantText = "";
    const stream = anthropic.messages.stream({
      model: AI_MODEL,
      max_tokens: 850,
      system: [
        cleanedSystemPrompt,
        lang === "ar"
          ? "اجعل الرد مختصراً وعملياً: التشخيص، السبب المحتمل، خطوات الفحص، الأولوية، ومتى يجب إيقاف المركبة."
          : "Keep the answer concise and practical: diagnosis, likely cause, test steps, priority, and when the vehicle should not be driven.",
      ].join("\n"),
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        assistantText += event.delta.text;
        writeSse(res, { delta: { text: event.delta.text } });
      }
    }

    setCached(key, assistantText);
    writeSse(res, "[DONE]");
    res.end();
  } catch (err) {
    console.error("AI diagnose error:", err);
    const localAnswer = buildLocalDiagnosticAnswer(cleanedMessage, lang);
    setCached(key, localAnswer);
    await streamLocalAnswer(res, localAnswer);
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
