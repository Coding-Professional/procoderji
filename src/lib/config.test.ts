import { test } from "node:test";
import assert from "node:assert/strict";
import nextConfig, { securityHeaders } from "../../next.config.ts";

test("security headers are applied to every route", async () => {
	const rules = (await nextConfig.headers?.()) ?? [];
	assert.equal(rules.length, 1);
	assert.equal(rules[0].source, "/:path*");
	assert.deepEqual(rules[0].headers, securityHeaders);
});

test("the expected baseline headers are present", () => {
	const map = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));
	assert.equal(map["X-Content-Type-Options"], "nosniff");
	assert.equal(map["X-Frame-Options"], "DENY");
	assert.equal(map["Referrer-Policy"], "strict-origin-when-cross-origin");
	assert.match(map["Permissions-Policy"], /camera=\(\)/);
});

test("staging sends noindex headers while retaining security headers", async () => {
	const previous = process.env.DEPLOYMENT_ENVIRONMENT;
	try {
		process.env.DEPLOYMENT_ENVIRONMENT = "staging";
		const rules = (await nextConfig.headers?.()) ?? [];
		assert.deepEqual(rules[0].headers, [...securityHeaders, { key: "X-Robots-Tag", value: "noindex, nofollow" }]);
	} finally {
		if (previous === undefined) delete process.env.DEPLOYMENT_ENVIRONMENT;
		else process.env.DEPLOYMENT_ENVIRONMENT = previous;
	}
});

test("the framework is not advertised in an X-Powered-By header", () => {
	assert.equal(nextConfig.poweredByHeader, false);
});

test("the old /courses reader permanently redirects to the matching dashboard page", async () => {
	const rules = (await nextConfig.redirects?.()) ?? [];
	assert.deepEqual(rules, [
		{ source: "/courses", destination: "/dashboard", permanent: true },
		{ source: "/courses/:path*", destination: "/dashboard/:path*", permanent: true },
	]);
});
