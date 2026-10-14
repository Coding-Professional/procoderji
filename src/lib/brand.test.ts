import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p));

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Width, height and colour type read straight from the PNG header (no image library needed). */
function png(p: string) {
	const b = read(p);
	assert.ok(b.subarray(0, 8).equals(PNG_SIGNATURE), `${p} must be a PNG file`);
	return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25], bytes: b.length };
}

test("the supplied ProCoderJii logo is kept untouched as the brand master", () => {
	const m = png("public/brand/procoderji-logo.png");
	assert.deepEqual([m.width, m.height], [1024, 1024]);
	assert.equal(m.colorType, 6, "the master has an alpha channel (transparent background)");
});

test("the site logo and app icon are square, transparent PNGs", () => {
	for (const p of ["public/logo.png", "src/app/icon.png"]) {
		const i = png(p);
		assert.equal(i.width, i.height, `${p} must be square`);
		assert.ok(i.width >= 192, `${p} should be at least 192px`);
		assert.equal(i.colorType, 6, `${p} should keep transparency`);
	}
});

test("the Apple touch icon is 180x180 and opaque-friendly", () => {
	const i = png("src/app/apple-icon.png");
	assert.deepEqual([i.width, i.height], [180, 180]);
});

test("the social-sharing image is 1200x630 and reasonably small", () => {
	const i = png("public/og.png");
	assert.deepEqual([i.width, i.height], [1200, 630]);
	assert.ok(i.bytes < 400_000, `og.png is ${i.bytes} bytes; keep it under 400 KB`);
});

test("favicon.ico is a valid icon file with 16, 32 and 48 px PNG images", () => {
	const b = read("src/app/favicon.ico");
	assert.equal(b.readUInt16LE(0), 0, "reserved field");
	assert.equal(b.readUInt16LE(2), 1, "type 1 = icon");
	const count = b.readUInt16LE(4);
	assert.equal(count, 3);
	const sizes: number[] = [];
	for (let n = 0; n < count; n++) {
		const e = 6 + n * 16;
		sizes.push(b[e]);
		const length = b.readUInt32LE(e + 8);
		const offset = b.readUInt32LE(e + 12);
		assert.ok(offset + length <= b.length, "image data lies inside the file");
		assert.ok(b.subarray(offset, offset + 8).equals(PNG_SIGNATURE), "image data is a PNG");
	}
	assert.deepEqual(sizes, [16, 32, 48]);
});

test("the old RGPV logo is gone and nothing references it", () => {
	assert.ok(!fs.existsSync(path.join(ROOT, "public/logo.svg")), "public/logo.svg (old RGPV logo) must not return");
	const hits: string[] = [];
	const walk = (dir: string) => {
		for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, e.name);
			if (e.isDirectory()) walk(full);
			else if (/\.(tsx?|css|json|mdx?)$/.test(e.name) && !/\.test\.ts$/.test(e.name) && /logo\.svg/.test(fs.readFileSync(full, "utf8"))) hits.push(path.relative(ROOT, full));
		}
	};
	walk(path.join(ROOT, "src"));
	assert.deepEqual(hits, []);
});

test("every component that shows the logo uses the ProCoderJii logo file", () => {
	const users = ["src/components/landing/navbar.tsx", "src/components/app-sidebar.tsx", "src/components/floating-logo.tsx", "src/components/site-shell.tsx", "src/components/legal/legal-layout.tsx"];
	for (const f of users) assert.match(read(f).toString("utf8"), /\/logo\.png/, `${f} should use /logo.png`);
});
