import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateServiceAndSchedule } from '../server/order-guards.ts';
import calculateTotalHandler from '../api/calculate-total.ts';
import calebnetHandler from '../api/calebnet.ts';
import {
  BRAND_CONFIG,
  PRODUCTS_CONFIG,
  HISTORICAL_IMPACT_METRICS,
  VERIFIED_TESTIMONIALS,
} from '../src/config/brand.ts';

function createMockRes() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    headersSent: false,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
    end() {
      this.headersSent = true;
      return this;
    },
  };
}

async function run() {
  const repoRoot = process.cwd();

  console.log('1. Testing backend discontinuation guards (Food, Mart, CalebNet) & active Fashion...');
  const mockDb = {} as any;

  const foodGuard = await validateServiceAndSchedule(mockDb, { vertical: 'FOOD' });
  assert.equal(foodGuard.allowed, false);
  assert.equal(foodGuard.httpStatus, 410);
  assert.equal(foodGuard.code, 'FOOD_DISCONTINUED');

  const martGuard = await validateServiceAndSchedule(mockDb, { vertical: 'MART' });
  assert.equal(martGuard.allowed, false);
  assert.equal(martGuard.httpStatus, 410);
  assert.equal(martGuard.code, 'MART_DISCONTINUED');

  const fashionGuard = await validateServiceAndSchedule(mockDb, { vertical: 'FASHION' });
  assert.equal(fashionGuard.allowed, true);

  // calculate-total blocks FOOD and MART with 410
  const calcFoodRes = createMockRes();
  await calculateTotalHandler(
    { method: 'POST', headers: {}, socket: { remoteAddress: '127.0.0.1' }, body: { orderType: 'FOOD', plates: [{ id: '1' }] } } as any,
    calcFoodRes as any
  );
  assert.equal(calcFoodRes.statusCode, 410);
  assert.equal(calcFoodRes.body?.error, 'FOOD_DISCONTINUED');

  const calcMartRes = createMockRes();
  await calculateTotalHandler(
    { method: 'POST', headers: {}, socket: { remoteAddress: '127.0.0.1' }, body: { orderType: 'MART', items: [{ id: '1' }] } } as any,
    calcMartRes as any
  );
  assert.equal(calcMartRes.statusCode, 410);
  assert.equal(calcMartRes.body?.error, 'MART_DISCONTINUED');

  // CalebNet purchase & verify-payment return 410
  const cnPurchaseRes = createMockRes();
  await calebnetHandler({ query: { path: 'purchase' }, url: '/api/calebnet/purchase', method: 'POST' } as any, cnPurchaseRes as any);
  assert.equal(cnPurchaseRes.statusCode, 410);
  assert.equal(cnPurchaseRes.body?.error, 'CALEBNET_DISCONTINUED');

  const cnVerifyRes = createMockRes();
  await calebnetHandler({ query: { path: 'verify-payment' }, url: '/api/calebnet/verify-payment', method: 'POST' } as any, cnVerifyRes as any);
  assert.equal(cnVerifyRes.statusCode, 410);
  assert.equal(cnVerifyRes.body?.error, 'CALEBNET_DISCONTINUED');
  console.log('   PASSED: Food, Mart & CalebNet blocked (410); Fashion remains allowed');

  console.log('2. Testing brand configuration, verified metrics & testimonials integrity...');
  assert.equal(BRAND_CONFIG.name, 'CalebDeck');
  assert.equal(PRODUCTS_CONFIG.fashion.status, 'ACTIVE');
  assert.equal(PRODUCTS_CONFIG.fashion.path, '/fashion');
  assert.equal(PRODUCTS_CONFIG.business.status, 'ACTIVE');
  assert.equal(PRODUCTS_CONFIG.business.path, '/business');
  assert.equal(PRODUCTS_CONFIG.gaming.name, 'Caleb Life');
  assert.equal(PRODUCTS_CONFIG.gaming.status, 'COMING_SOON');
  assert.equal(HISTORICAL_IMPACT_METRICS.length, 2);
  assert.equal(HISTORICAL_IMPACT_METRICS[0].value, '1,000+');
  assert.equal(HISTORICAL_IMPACT_METRICS[1].value, '₦3M+');
  assert.ok(VERIFIED_TESTIMONIALS.length >= 3);
  console.log('   PASSED: Brand architecture & historical metrics verified');

  console.log('3. Testing SEO metadata, JSON-LD validity, sitemap.xml & robots.txt...');
  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('CalebDeck | Fashion, Business Showcase &amp; Gaming Experiences'));
  assert.ok(!indexHtml.includes('CalebDeck Mart'));
  assert.ok(!indexHtml.includes('student data plans'));

  // Parse every <script type="application/ld+json"> block in index.html
  const ldBlocks = [...indexHtml.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)];
  assert.ok(ldBlocks.length >= 4, 'Expected at least 4 JSON-LD blocks in index.html');
  for (const [, rawJson] of ldBlocks) {
    const parsed = JSON.parse(rawJson);
    assert.equal(parsed['@context'], 'https://schema.org');
    assert.ok(parsed['@type']);
  }

  const sitemap = fs.readFileSync(path.join(repoRoot, 'public', 'sitemap.xml'), 'utf8');
  assert.ok(sitemap.includes('<loc>https://calebdeck.com/</loc>'));
  assert.ok(sitemap.includes('<loc>https://calebdeck.com/fashion</loc>'));
  assert.ok(sitemap.includes('<loc>https://calebdeck.com/business</loc>'));
  assert.ok(!sitemap.includes('/cafeteria'));
  assert.ok(!sitemap.includes('/mart'));
  assert.ok(!sitemap.includes('/calebnet'));
  assert.ok(!sitemap.includes('/gadgets'));

  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public', 'manifest.json'), 'utf8'));
  assert.equal(manifest.name, 'CalebDeck');
  assert.ok(!manifest.description.toLowerCase().includes('grocery'));

  const robots = fs.readFileSync(path.join(repoRoot, 'public', 'robots.txt'), 'utf8');
  assert.ok(robots.includes('Allow: /fashion'));
  assert.ok(robots.includes('Sitemap: https://calebdeck.com/sitemap.xml'));
  console.log('   PASSED: HTML SEO, JSON-LD schemas, sitemap, manifest & robots.txt valid');

  console.log('\nALL BRAND EVOLUTION & SEO REPOSITIONING TESTS PASSED!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
