/**
 * Website Lotto — Edit Panel
 *
 * Injected by the Worker into the buyer's live site when a valid
 * auth cookie is present. Provides a three-tab sidebar for editing
 * Content, Brand, and Contact fields, with live preview and save.
 *
 * Expects window.__SITE_SLUG__ and window.__SITE_CONFIG__ to be
 * set by the Worker before this script loads.
 */

(function () {
  "use strict";

  const slug = window.__SITE_SLUG__;
  const API_BASE = "https://virtuallaunch.pro";

  // Clone config so we can track unsaved changes
  let config = Object.assign({}, window.__SITE_CONFIG__ || {});

  // ── Styles ─────────────────────────────────────────────────────────────────

  const style = document.createElement("style");
  style.textContent = `
    #wl-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 320px;
      height: 100vh;
      background: #1a1a2e;
      color: #e0e0e0;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      box-shadow: -4px 0 24px rgba(0,0,0,0.4);
      transition: transform 0.3s ease;
    }
    #wl-panel.wl-collapsed {
      transform: translateX(296px);
    }
    #wl-toggle {
      position: fixed;
      top: 50%;
      right: 320px;
      transform: translateY(-50%);
      background: #6c63ff;
      color: #fff;
      border: none;
      border-radius: 6px 0 0 6px;
      padding: 10px 6px;
      cursor: pointer;
      font-size: 18px;
      z-index: 100000;
      line-height: 1;
      transition: right 0.3s ease;
    }
    #wl-panel.wl-collapsed ~ #wl-toggle {
      right: 0;
    }
    #wl-header {
      padding: 16px;
      border-bottom: 1px solid #2e2e4a;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #wl-header img {
      height: 24px;
      opacity: 0.8;
    }
    #wl-header span {
      font-weight: 600;
      font-size: 15px;
      color: #fff;
    }
    #wl-tabs {
      display: flex;
      border-bottom: 1px solid #2e2e4a;
    }
    .wl-tab {
      flex: 1;
      padding: 10px 0;
      background: none;
      border: none;
      color: #888;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      transition: color 0.2s, border-bottom 0.2s;
      border-bottom: 2px solid transparent;
    }
    .wl-tab.active {
      color: #6c63ff;
      border-bottom: 2px solid #6c63ff;
    }
    #wl-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    #wl-body::-webkit-scrollbar { width: 4px; }
    #wl-body::-webkit-scrollbar-track { background: #1a1a2e; }
    #wl-body::-webkit-scrollbar-thumb { background: #3a3a5c; border-radius: 4px; }
    .wl-section { display: none; }
    .wl-section.active { display: block; }
    .wl-field {
      margin-bottom: 14px;
    }
    .wl-label {
      display: block;
      margin-bottom: 4px;
      font-size: 12px;
      color: #aaa;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .wl-input {
      width: 100%;
      background: #0f0f22;
      border: 1px solid #2e2e4a;
      border-radius: 6px;
      color: #e0e0e0;
      padding: 8px 10px;
      font-size: 13px;
      font-family: inherit;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .wl-input:focus {
      outline: none;
      border-color: #6c63ff;
    }
    .wl-color-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .wl-color-row input[type="color"] {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      padding: 2px;
      background: #0f0f22;
    }
    .wl-color-hex {
      flex: 1;
    }
    #wl-footer {
      padding: 12px 16px;
      border-top: 1px solid #2e2e4a;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    #wl-save {
      width: 100%;
      padding: 10px;
      background: #6c63ff;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    #wl-save:hover { background: #5a52e0; }
    #wl-save:disabled { background: #3a3a5c; cursor: not-allowed; }
    #wl-status {
      font-size: 12px;
      text-align: center;
      min-height: 16px;
    }
    #wl-status.ok  { color: #4caf50; }
    #wl-status.err { color: #f44336; }
    #wl-logout-btn {
      background: none;
      border: none;
      color: #555;
      font-size: 11px;
      cursor: pointer;
      text-align: center;
      padding: 2px;
    }
    #wl-logout-btn:hover { color: #888; }
    .wl-logo-preview {
      width: 64px;
      height: 64px;
      object-fit: contain;
      border-radius: 6px;
      border: 1px solid #2e2e4a;
      display: none;
      margin-top: 6px;
    }
    .wl-logo-preview.visible { display: block; }
    select.wl-input {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      padding-right: 30px;
    }
  `;
  document.head.appendChild(style);

  // ── Build panel HTML ────────────────────────────────────────────────────────

  const panel = document.createElement("div");
  panel.id = "wl-panel";
  panel.innerHTML = `
    <div id="wl-header">
      <span>✏️ Edit Site</span>
    </div>

    <div id="wl-tabs">
      <button class="wl-tab active" data-tab="content">Content</button>
      <button class="wl-tab" data-tab="brand">Brand</button>
      <button class="wl-tab" data-tab="contact">Contact</button>
    </div>

    <div id="wl-body">

      <!-- Content tab -->
      <div class="wl-section active" data-section="content">
        ${field("brand_name", "Business Name", "text")}
        ${field("tagline", "Tagline", "text")}
        ${field("hero_title", "Hero Headline", "text")}
        ${field("hero_subtitle", "Hero Subheading", "text")}
        ${field("cta_text", "CTA Button Text", "text")}
      </div>

      <!-- Brand tab -->
      <div class="wl-section" data-section="brand">
        <div class="wl-field">
          <label class="wl-label">Logo</label>
          <input type="file" id="wl-logo-file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
            style="color:#aaa;font-size:12px;width:100%;">
          <img id="wl-logo-preview" class="wl-logo-preview" alt="Logo preview">
          <div id="wl-logo-status" style="font-size:11px;color:#888;margin-top:4px;"></div>
        </div>
        ${colorField("primary_action_color", "Primary Color")}
        ${colorField("surface_color", "Secondary / Surface Color")}
        ${colorField("background_color", "Background Color")}
        ${colorField("text_color", "Text Color")}
        <div class="wl-field">
          <label class="wl-label" for="wl-font_family">Font Family</label>
          <select class="wl-input" id="wl-font_family" data-key="font_family">
            <option value="Inter">Inter</option>
            <option value="Playfair Display">Playfair Display</option>
            <option value="Roboto">Roboto</option>
            <option value="Lato">Lato</option>
            <option value="Montserrat">Montserrat</option>
            <option value="Georgia">Georgia</option>
            <option value="system-ui">System UI</option>
          </select>
        </div>
      </div>

      <!-- Contact tab -->
      <div class="wl-section" data-section="contact">
        ${field("email", "Email Address", "email")}
        ${field("phone", "Phone Number", "tel")}
        ${field("address", "Business Address", "text")}
        ${field("stripe_payment_link", "Stripe Payment Link", "url")}
        ${field("instagram", "Instagram URL", "url")}
        ${field("facebook", "Facebook URL", "url")}
      </div>
    </div>

    <div id="wl-footer">
      <button id="wl-save">Save Changes</button>
      <div id="wl-status"></div>
      <button id="wl-logout-btn">Log out</button>
    </div>
  `;
  document.body.appendChild(panel);

  // Toggle button (outside panel so it stays visible when collapsed)
  const toggle = document.createElement("button");
  toggle.id = "wl-toggle";
  toggle.textContent = "◀";
  toggle.title = "Toggle edit panel";
  document.body.appendChild(toggle);

  // ── Populate fields from config ─────────────────────────────────────────────

  function populateFields() {
    panel.querySelectorAll("[data-key]").forEach(el => {
      const key = el.dataset.key;
      if (config[key] === undefined) return;

      if (el.type === "color") {
        el.value = config[key] || "#000000";
        const hex = el.closest(".wl-color-row")?.querySelector(".wl-color-hex");
        if (hex) hex.value = config[key] || "#000000";
      } else {
        el.value = config[key];
      }
    });

    if (config.logo_url) {
      const preview = document.getElementById("wl-logo-preview");
      preview.src = config.logo_url;
      preview.classList.add("visible");
    }
  }

  populateFields();

  // ── Live preview via applyConfig() ─────────────────────────────────────────

  function livePreview() {
    if (typeof window.applyConfig === "function") {
      window.applyConfig(config);
    }
  }

  // ── Input listeners ─────────────────────────────────────────────────────────

  panel.querySelectorAll("[data-key]").forEach(el => {
    el.addEventListener("input", () => {
      config[el.dataset.key] = el.value;
      // Keep color swatch and hex input in sync
      if (el.type === "color") {
        const hex = el.closest(".wl-color-row")?.querySelector(".wl-color-hex");
        if (hex) hex.value = el.value;
      }
      if (el.classList.contains("wl-color-hex")) {
        const swatch = el.closest(".wl-color-row")?.querySelector("input[type=color]");
        if (swatch && /^#[0-9a-f]{6}$/i.test(el.value)) swatch.value = el.value;
      }
      livePreview();
    });
  });

  // ── Logo upload ─────────────────────────────────────────────────────────────

  document.getElementById("wl-logo-file").addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;

    const statusEl = document.getElementById("wl-logo-status");
    statusEl.textContent = "Uploading…";

    const fd = new FormData();
    fd.append("logo", file);
    fd.append("slug", slug);

    try {
      const res = await fetch(`${API_BASE}/api/upload-logo`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      config.logo_url = data.url;
      const preview = document.getElementById("wl-logo-preview");
      preview.src = data.url;
      preview.classList.add("visible");
      statusEl.textContent = "Logo uploaded";
      livePreview();
    } catch (err) {
      statusEl.textContent = "Upload failed: " + err.message;
    }
  });

  // ── Tab switching ───────────────────────────────────────────────────────────

  panel.querySelectorAll(".wl-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      panel.querySelectorAll(".wl-tab").forEach(t => t.classList.remove("active"));
      panel.querySelectorAll(".wl-section").forEach(s => s.classList.remove("active"));
      tab.classList.add("active");
      panel.querySelector(`[data-section="${tab.dataset.tab}"]`).classList.add("active");
    });
  });

  // ── Panel collapse toggle ───────────────────────────────────────────────────

  toggle.addEventListener("click", () => {
    const collapsed = panel.classList.toggle("wl-collapsed");
    toggle.textContent = collapsed ? "▶" : "◀";
    toggle.style.right = collapsed ? "0" : "320px";
  });

  // ── Save ────────────────────────────────────────────────────────────────────

  const saveBtn = document.getElementById("wl-save");
  const statusEl = document.getElementById("wl-status");

  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    statusEl.textContent = "";
    statusEl.className = "";

    try {
      const res = await fetch(`${API_BASE}/api/config/${slug}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      statusEl.textContent = "Saved successfully!";
      statusEl.className = "ok";
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.className = "err";
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  });

  // ── Logout ──────────────────────────────────────────────────────────────────

  document.getElementById("wl-logout-btn").addEventListener("click", async () => {
    await fetch(`${API_BASE}/api/logout`, { method: "POST", credentials: "include" });
    location.reload();
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function field(key, label, type = "text") {
    return `
      <div class="wl-field">
        <label class="wl-label" for="wl-${key}">${label}</label>
        <input class="wl-input" type="${type}" id="wl-${key}" data-key="${key}"
          placeholder="${label}">
      </div>`;
  }

  function colorField(key, label) {
    return `
      <div class="wl-field">
        <label class="wl-label">${label}</label>
        <div class="wl-color-row">
          <input type="color" data-key="${key}" id="wl-color-${key}">
          <input class="wl-input wl-color-hex" type="text" data-key="${key}"
            placeholder="#000000" maxlength="7">
        </div>
      </div>`;
  }
})();
