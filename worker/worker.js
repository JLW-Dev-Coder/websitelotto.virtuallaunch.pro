/**
 * Website Lotto — Cloudflare Worker
 *
 * Handles all *.virtuallaunch.pro subdomain requests.
 * Routes:
 *   GET  *            — serve buyer's live site
 *   POST /api/checkout       — create Stripe Checkout Session
 *   PATCH /api/config/:slug  — save buyer's site_config
 *   POST /api/webhook        — Stripe webhook handler
 *   POST /api/login          — exchange email+pass for auth cookie
 *   POST /api/logout         — clear auth cookie
 *   POST /api/upload-logo    — upload logo to R2, return URL
 */

const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_SERVICE_KEY = "YOUR_SERVICE_ROLE_KEY"; // set via wrangler secret
const STRIPE_SECRET_KEY = "sk_live_...";              // set via wrangler secret
const STRIPE_WEBHOOK_SECRET = "whsec_...";            // set via wrangler secret
const STRIPE_PRICE_ID = "price_...";                  // $99/mo recurring price
const RESEND_API_KEY = "re_...";                      // set via wrangler secret
const ROOT_DOMAIN = "virtuallaunch.pro";
const ADMIN_DOMAIN = "admin.virtuallaunch.pro";
const MARKETING_DOMAIN = "virtuallaunch.pro";

// ─── Entry point ─────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    const slug = extractSlug(hostname);

    // Pass through to marketing site (Cloudflare Pages) for root domain
    if (hostname === MARKETING_DOMAIN || hostname === `www.${MARKETING_DOMAIN}`) {
      return fetch(request);
    }

    try {
      // API routes — handled regardless of subdomain
      if (url.pathname.startsWith("/api/")) {
        return handleApi(request, url, env, ctx);
      }

      // Subdomain site serving
      if (slug) {
        return serveSite(request, url, slug, env);
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error("Worker error:", err);
      return new Response("Internal server error", { status: 500 });
    }
  },
};

// ─── API router ──────────────────────────────────────────────────────────────

async function handleApi(request, url, env, ctx) {
  const method = request.method;
  const path = url.pathname;

  if (method === "POST" && path === "/api/checkout") {
    return handleCheckout(request, env);
  }
  if (method === "PATCH" && path.startsWith("/api/config/")) {
    const slug = path.split("/api/config/")[1];
    return handleSaveConfig(request, slug, env);
  }
  if (method === "POST" && path === "/api/webhook") {
    return handleStripeWebhook(request, env, ctx);
  }
  if (method === "POST" && path === "/api/login") {
    return handleLogin(request, env);
  }
  if (method === "POST" && path === "/api/logout") {
    return handleLogout();
  }
  if (method === "POST" && path === "/api/upload-logo") {
    return handleLogoUpload(request, env);
  }

  return new Response("Not found", { status: 404 });
}

// ─── Site serving ─────────────────────────────────────────────────────────────

async function serveSite(request, url, slug, env) {
  // 1. Fetch template row from Supabase
  const template = await supabaseFetch(env, "GET",
    `/rest/v1/templates?slug=eq.${slug}&select=*&limit=1`
  );

  if (!template || template.length === 0) {
    return new Response(notFoundPage(slug), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  const tmpl = template[0];

  // 2. If template was never sold, show "available" splash
  if (tmpl.status === "available") {
    return Response.redirect(`https://${MARKETING_DOMAIN}/?available=${slug}`, 302);
  }

  // 3. Fetch buyer's site_config
  const configs = await supabaseFetch(env, "GET",
    `/rest/v1/site_configs?slug=eq.${slug}&select=*&limit=1`
  );
  const siteConfig = configs?.[0]?.config ?? tmpl.default_config;

  // 4. Fetch template HTML from R2
  const r2Object = await env.R2_BUCKET.get(tmpl.html_path);
  if (!r2Object) {
    return new Response("Template file not found", { status: 500 });
  }
  let html = await r2Object.text();

  // 5. Inject buyer's config in place of defaultConfig
  html = injectConfig(html, siteConfig);

  // 6. Check auth cookie → inject edit panel if valid
  const userId = await getAuthenticatedUser(request, env);
  if (userId) {
    const owner = await supabaseFetch(env, "GET",
      `/rest/v1/site_configs?slug=eq.${slug}&owner_id=eq.${userId}&select=id&limit=1`
    );
    if (owner && owner.length > 0) {
      html = injectEditPanel(html, slug, siteConfig);
    }
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "no-store",
    },
  });
}

// ─── Config injection ────────────────────────────────────────────────────────

function injectConfig(html, config) {
  const configJson = JSON.stringify(config, null, 2);
  // Replace defaultConfig = { ... } block with buyer's config
  return html.replace(
    /const\s+defaultConfig\s*=\s*\{[\s\S]*?\};/,
    `const defaultConfig = ${configJson};`
  );
}

function injectEditPanel(html, slug, config) {
  const panelScript = `
<script>
  window.__SITE_SLUG__ = ${JSON.stringify(slug)};
  window.__SITE_CONFIG__ = ${JSON.stringify(config)};
</script>
<script src="https://${MARKETING_DOMAIN}/edit-panel.js" defer></script>
`;
  return html.replace("</body>", panelScript + "</body>");
}

// ─── Auth helpers ────────────────────────────────────────────────────────────

async function getAuthenticatedUser(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/sb_access_token=([^;]+)/);
  if (!match) return null;

  const token = match[1];
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_SERVICE_KEY,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id ?? null;
  } catch {
    return null;
  }
}

// ─── POST /api/login ─────────────────────────────────────────────────────────

async function handleLogin(request, env) {
  const { email, password } = await request.json();

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    return jsonResponse({ error: data.error_description ?? "Login failed" }, 401);
  }

  const cookie = [
    `sb_access_token=${data.access_token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${data.expires_in}`,
  ].join("; ");

  return jsonResponse({ ok: true }, 200, { "Set-Cookie": cookie });
}

// ─── POST /api/logout ────────────────────────────────────────────────────────

function handleLogout() {
  const clearCookie = "sb_access_token=; Path=/; HttpOnly; Secure; Max-Age=0";
  return jsonResponse({ ok: true }, 200, { "Set-Cookie": clearCookie });
}

// ─── POST /api/checkout ───────────────────────────────────────────────────────

async function handleCheckout(request, env) {
  const { slug, email } = await request.json();

  // Verify template is still available
  const templates = await supabaseFetch(env, "GET",
    `/rest/v1/templates?slug=eq.${slug}&status=eq.available&select=id,name&limit=1`
  );
  if (!templates || templates.length === 0) {
    return jsonResponse({ error: "Template is no longer available" }, 409);
  }

  const params = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": STRIPE_PRICE_ID,
    "line_items[0][quantity]": "1",
    "customer_email": email,
    "metadata[template_slug]": slug,
    "success_url": `https://${MARKETING_DOMAIN}/success?slug=${slug}`,
    "cancel_url": `https://${MARKETING_DOMAIN}/?cancelled=1`,
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const session = await res.json();
  if (!res.ok) {
    return jsonResponse({ error: session.error?.message ?? "Stripe error" }, 500);
  }

  return jsonResponse({ url: session.url });
}

// ─── PATCH /api/config/:slug ─────────────────────────────────────────────────

async function handleSaveConfig(request, slug, env) {
  const userId = await getAuthenticatedUser(request, env);
  if (!userId) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // Verify ownership
  const owner = await supabaseFetch(env, "GET",
    `/rest/v1/site_configs?slug=eq.${slug}&owner_id=eq.${userId}&select=id&limit=1`
  );
  if (!owner || owner.length === 0) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const body = await request.json();
  const allowedFields = [
    "brand_name", "tagline", "hero_title", "hero_subtitle",
    "cta_text", "background_color", "surface_color", "text_color",
    "primary_action_color", "font_family", "email", "phone",
    "address", "stripe_payment_link", "instagram", "facebook", "logo_url",
  ];

  // Whitelist fields
  const config = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) config[field] = body[field];
  }

  await supabaseFetch(env, "PATCH",
    `/rest/v1/site_configs?slug=eq.${slug}&owner_id=eq.${userId}`,
    { config, updated_at: new Date().toISOString() }
  );

  return jsonResponse({ ok: true });
}

// ─── POST /api/upload-logo ───────────────────────────────────────────────────

async function handleLogoUpload(request, env) {
  const userId = await getAuthenticatedUser(request, env);
  if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

  const formData = await request.formData();
  const file = formData.get("logo");
  const slug = formData.get("slug");

  if (!file || !slug) return jsonResponse({ error: "Missing file or slug" }, 400);

  // Verify ownership before upload
  const owner = await supabaseFetch(env, "GET",
    `/rest/v1/site_configs?slug=eq.${slug}&owner_id=eq.${userId}&select=id&limit=1`
  );
  if (!owner || owner.length === 0) return jsonResponse({ error: "Forbidden" }, 403);

  const ext = file.name.split(".").pop().toLowerCase();
  const allowed = ["png", "jpg", "jpeg", "svg", "webp"];
  if (!allowed.includes(ext)) return jsonResponse({ error: "Invalid file type" }, 400);

  const key = `logos/${slug}/${Date.now()}.${ext}`;
  await env.R2_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  const logoUrl = `https://assets.${ROOT_DOMAIN}/${key}`;
  return jsonResponse({ url: logoUrl });
}

// ─── POST /api/webhook ────────────────────────────────────────────────────────

async function handleStripeWebhook(request, env, ctx) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  // Verify webhook signature
  const event = await verifyStripeSignature(body, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!event) {
    return new Response("Invalid signature", { status: 400 });
  }

  ctx.waitUntil(processWebhookEvent(event, env));
  return new Response("OK");
}

async function processWebhookEvent(event, env) {
  switch (event.type) {

    case "checkout.session.completed": {
      const session = event.data.object;
      const slug = session.metadata?.template_slug;
      const email = session.customer_email;
      const stripeSessionId = session.id;
      if (!slug || !email) break;

      // Mark template as sold
      await supabaseFetch(env, "PATCH",
        `/rest/v1/templates?slug=eq.${slug}`,
        { status: "sold" }
      );

      // Create purchase record
      await supabaseFetch(env, "POST",
        `/rest/v1/purchases`,
        { template_slug: slug, buyer_email: email, stripe_session_id: stripeSessionId }
      );

      // Fetch template for default_config
      const templates = await supabaseFetch(env, "GET",
        `/rest/v1/templates?slug=eq.${slug}&select=default_config&limit=1`
      );
      const defaultConfig = templates?.[0]?.default_config ?? {};

      // Create Supabase Auth user (ignore error if already exists)
      const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          email,
          email_confirm: true,
          password: generatePassword(),
        }),
      });

      let userId = null;
      if (signupRes.ok) {
        const user = await signupRes.json();
        userId = user.id;

        // Seed site_configs row with default config
        await supabaseFetch(env, "POST",
          `/rest/v1/site_configs`,
          {
            slug,
            owner_id: userId,
            config: defaultConfig,
            logo_url: null,
            updated_at: new Date().toISOString(),
          }
        );
      } else {
        // User might already exist — look them up
        const existing = await supabaseFetch(env, "GET",
          `/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id&limit=1`
        );
        userId = existing?.[0]?.id ?? null;
      }

      // Send onboarding email via Resend
      await sendOnboardingEmail(env, email, slug);
      break;
    }

    case "customer.subscription.deleted": {
      // Subscription cancelled — take site offline and revoke edit access
      const sub = event.data.object;
      const customerId = sub.customer;

      // Look up buyer email from Stripe customer
      const custRes = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
      });
      const customer = await custRes.json();
      const email = customer.email;

      // Find their slug
      const purchases = await supabaseFetch(env, "GET",
        `/rest/v1/purchases?buyer_email=eq.${encodeURIComponent(email)}&select=template_slug&order=created_at.desc&limit=1`
      );
      const slug = purchases?.[0]?.template_slug;
      if (!slug) break;

      // Mark template as available again (or "offline" — your choice)
      await supabaseFetch(env, "PATCH",
        `/rest/v1/templates?slug=eq.${slug}`,
        { status: "available", owner_id: null }
      );

      // Remove site_config so edit panel access is revoked
      await supabaseFetch(env, "DELETE",
        `/rest/v1/site_configs?slug=eq.${slug}`
      );
      break;
    }
  }
}

// ─── Email ────────────────────────────────────────────────────────────────────

async function sendOnboardingEmail(env, email, slug) {
  const liveUrl = `https://${slug}.${ROOT_DOMAIN}`;
  const loginUrl = `https://${MARKETING_DOMAIN}/login`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Website Lotto <hello@${ROOT_DOMAIN}>`,
      to: email,
      subject: "Your site is live! 🎉",
      html: buildEmailHtml(email, slug, liveUrl, loginUrl),
    }),
  });

  if (!res.ok) {
    console.error("Resend error:", await res.text());
  }
}

function buildEmailHtml(email, slug, liveUrl, loginUrl) {
  // Minimal inline email — full template is email/email-template.html
  return `<p>Hi there,</p>
<p>Your site is live at <a href="${liveUrl}">${liveUrl}</a></p>
<p><a href="${loginUrl}">Log in to edit your site</a></p>`;
}

// ─── Supabase helper ─────────────────────────────────────────────────────────

async function supabaseFetch(env, method, path, body) {
  const url = `${SUPABASE_URL}${path}`;
  const headers = {
    apikey: env.SUPABASE_SERVICE_KEY ?? SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY ?? SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: method === "POST" ? "return=representation" : "return=minimal",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (method === "DELETE" || method === "PATCH") return null;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${method} ${path} → ${res.status}: ${err}`);
  }
  return res.json();
}

// ─── Stripe signature verification ───────────────────────────────────────────

async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader) return null;
  const parts = Object.fromEntries(sigHeader.split(",").map(p => p.split("=")));
  const timestamp = parts.t;
  const sig = parts.v1;

  const data = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const computed = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  if (computed !== sig) return null;

  // Reject events older than 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return null;

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function extractSlug(hostname) {
  // furniture.virtuallaunch.pro → "furniture"
  if (!hostname.endsWith(`.${ROOT_DOMAIN}`)) return null;
  const sub = hostname.slice(0, -(ROOT_DOMAIN.length + 1));
  if (!sub || sub === "www" || sub === "admin" || sub === "assets") return null;
  return sub;
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": `https://${MARKETING_DOMAIN}`,
      ...extraHeaders,
    },
  });
}

function generatePassword() {
  // 20-char random password for auto-created accounts
  return Array.from(crypto.getRandomValues(new Uint8Array(15)))
    .map(b => b.toString(36))
    .join("")
    .slice(0, 20);
}

function notFoundPage(slug) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Site not found</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;}
.box{text-align:center;padding:2rem;}</style></head>
<body><div class="box"><h1>Site not found</h1>
<p>No site exists at <strong>${slug}.${ROOT_DOMAIN}</strong>.</p>
<a href="https://${MARKETING_DOMAIN}">Browse available templates →</a></div></body></html>`;
}
