# ПРИОРИТЕТНЫЕ ПРАВИЛА ПРОЕКТА
Для ВСЕХ запросов по мобильным правкам — СТРОГО следовать разделу ниже: 
"# CLAUDE.md — Правила для мобильных правок (2026)"

# CLAUDE.md — Правила для мобильных правок (2026)

## Основное правило проекта
Я редактирую сайт **только в режиме мобильного устройства** (DevTools → iPhone / Pixel и т.д.).

**Ключевое требование:**
- На десктопе (ПК) сайт **должен оставаться точно таким же**, как сейчас. Никаких изменений в десктопных стилях.
- Все изменения применяются **только на мобильных устройствах** через media query.

## Как работать с правками
Когда я делаю правки в DevTools на телефоне и присылаю тебе:
- Описание изменений
- Скопированные CSS-правила
- Скриншот или Computed styles

Ты должен:

1. **Никогда не трогать** существующие стили вне media query.
2. Все изменения обернуть **только** в один блок:
   ```css
   /* МОБИЛЬНАЯ ВЕРСИЯ — ТОЛЬКО ДЛЯ ТЕЛЕФОНОВ */
   @media (max-width: 768px) {
     /* сюда все изменения */
   }

Использовать max-width: 768px (это стандарт для мобильных в этом проекте).
Внутри media query переопределять стили (можно использовать !important только если без него не получается).
Предпочитать простые и чистые правила: display, padding, font-size, flex-direction, gap и т.д.
Если нужно скрыть элемент на мобильном — используй display: none;
Если нужно показать элемент только на мобильном — создавай класс .mobile-only { display: none; } на десктопе и показывай внутри media query.

Строгие запреты

Не меняй ничего за пределами @media (max-width: 768px)
Не добавляй новые классы или HTML без моего явного разрешения
Не используй Tailwind, Bootstrap или другие фреймворки (только чистый CSS)
Не делай mobile-first перестройку всего сайта — только целевые правки
Не добавляй лишние комментарии и объяснения, если я не попросил

Формат ответа
Когда я присылаю правки из DevTools, отвечай только готовым CSS-блоком:
CSS/* МОБИЛЬНАЯ ВЕРСИЯ — ТОЛЬКО ДЛЯ ТЕЛЕФОНОВ */
@media (max-width: 768px) {
  /* твои изменения здесь */
}
Ничего больше не пиши сверху и снизу, если я не попросил объяснения.

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->
