#!/usr/bin/env node
/**
 * بیلد آوا — همه‌چیز را در یک فایل HTML جمع می‌کند
 * ─────────────────────────────────────────────────
 * • فونت متغیر وزیرمتن را base64 می‌کند و در @font-face می‌گذارد
 * • اندازه‌ی واقعی JS و کل فایل را اندازه می‌گیرد و در بخش آمار می‌نویسد
 * • تاریخ شمسی بیلد را روی پانویس می‌گذارد
 * • خروجی را بازرسی می‌کند: نه منبع بیرونی، نه جای‌نگهدار باقی‌مانده
 *
 * اجرا:  node build.mjs      (یا)  npm run build
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, "src");
const DIST = path.join(here, "dist");

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const fa = (v) => String(v).replace(/\d/g, (d) => FA_DIGITS[+d]);

/* ── تاریخ شمسی (الگوریتم استاندارد جلالی) ───────────────────────── */
function toJalali(gy, gm, gd) {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    gdm[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

const now = new Date();
const [jy, jm, jd] = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
const stamp = `${fa(jd)} ${MONTHS[jm - 1]} ${fa(jy)}`;

/* ── خواندن منابع ───────────────────────────────────────────────── */
const html = fs.readFileSync(path.join(SRC, "index.html"), "utf8");
const fontBuf = fs.readFileSync(path.join(SRC, "assets", "Vazirmatn-var.woff2"));
const fontB64 = `data:font/woff2;base64,${fontBuf.toString("base64")}`;

const jsSource = (html.match(/<script>([\s\S]*?)<\/script>/) || [, ""])[1];
const cssSource = (html.match(/<style>([\s\S]*?)<\/style>/) || [, ""])[1];

if (!html.includes("__FONT_B64__")) throw new Error("جای‌نگهدار فونت در src/index.html پیدا نشد.");

/* ── تزریق ─────────────────────────────────────────────────────── */
let out = html.replace("__FONT_B64__", fontB64);

// اندازه‌ی کل، پس از جاسازی فونت سنجیده می‌شود (اعداد در حد چند بایت خطا دارند)
const totalKB = Math.round(Buffer.byteLength(out, "utf8") / 1024);
const jsKB = Math.round(Buffer.byteLength(jsSource, "utf8") / 1024);

out = out.replace("__KB_TOTAL__", fa(totalKB)).replace("__KB_JS__", fa(Math.max(jsKB, 1))).replace("__STAMP__", stamp);

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, "index.html"), out, "utf8");
// یک نسخه‌ی آماده در ریشه‌ی پوشه، برای باز کردن سریع با دوبار کلیک
fs.writeFileSync(path.join(here, "index.html"), out, "utf8");

/* ── بازرسی خروجی ──────────────────────────────────────────────── */
const bytes = Buffer.byteLength(out, "utf8");
const gzip = zlib.gzipSync(out, { level: 9 }).length;
const leftovers = [...out.matchAll(/__[A-Z_]{3,}__/g)].map((m) => m[0]);
const external = [...out.matchAll(/(?:src|href)\s*=\s*["'](https?:)?\/\//g)].map((m) => m[0]);
const cssRules = (cssSource.match(/\{/g) || []).length;

const line = "─".repeat(58);
console.log(`\n  آوا · بیلد تک‌فایل\n${line}`);
console.log(`  خروجی          index.html + dist/index.html`);
console.log(`  حجم کل         ${(bytes / 1024).toFixed(1)} KB   (gzip: ${(gzip / 1024).toFixed(1)} KB)`);
console.log(`  فونت وزیرمتن   ${(fontBuf.length / 1024).toFixed(1)} KB  →  base64: ${(fontB64.length / 1024).toFixed(0)} KB`);
console.log(`  جاوااسکریپت    ${(Buffer.byteLength(jsSource, "utf8") / 1024).toFixed(1)} KB`);
console.log(`  CSS            ${(Buffer.byteLength(cssSource, "utf8") / 1024).toFixed(1)} KB  ·  ${cssRules} قاعده`);
console.log(`  خطوط           ${out.split("\n").length}`);
console.log(`  تاریخ بیلد     ${stamp}  (${now.toISOString().slice(0, 10)})`);
console.log(`${line}`);
console.log(`  ${leftovers.length ? "✗ جای‌نگهدار باقی‌مانده: " + leftovers.join(", ") : "✓ بدون جای‌نگهدار باقی‌مانده"}`);
console.log(`  ${external.length ? "✗ منبع بیرونی: " + external.join(", ") : "✓ بدون منبع بیرونی (تصویر، فونت، اسکریپت)"}`);
console.log(`  ✓ فایل مستقل است — با دوبار کلیک باز می‌شود\n`);

if (leftovers.length || external.length) process.exitCode = 1;
