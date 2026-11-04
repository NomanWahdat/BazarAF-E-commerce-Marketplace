import { test, expect } from '@playwright/test';

test('root stays local and language survives refresh with RTL on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/**', route => route.fulfill({ json: { results: [], count: 0 } }));
  await page.goto('/login');
  await page.getByRole('combobox').first().selectOption('fa');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
  await page.getByRole('combobox').first().selectOption('ps');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ps');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('invalid login remains on the form and displays the server error', async ({ page }) => {
  await page.route('**/api/auth/login/', route => route.fulfill({ status: 401, json: { message: 'Invalid email/phone or password' } }));
  await page.goto('/login');
  await page.locator('input').filter({ visible: true }).first().fill('0709990001');
  await page.locator('input[type=password]').fill('wrong-password');
  await page.locator('button[type=submit]').click();
  await expect(page.getByText('Invalid email/phone or password', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('tracking never displays a sample order to a signed-out visitor', async ({ page }) => {
  await page.goto('/order-tracking/ORD-UNKNOWN');
  await expect(page.getByText('Sign in to securely view your order.')).toBeVisible();
  await expect(page.getByText('Ahmed Hassan')).toHaveCount(0);
});

test('new translation dictionaries cover all English keys', async ({ page }) => {
  await page.goto('/login');
  const missing = await page.evaluate(async () => {
    const { default: i18n } = await import('/src/i18n.ts');
    const en = Object.keys(i18n.getResourceBundle('en', 'translation'));
    return ['fa', 'ps'].flatMap(lang => en.filter(key => !Object.prototype.hasOwnProperty.call(i18n.getResourceBundle(lang, 'translation'), key)).map(key => `${lang}:${key}`));
  });
  expect(missing).toEqual([]);
});

test('real checkout creates an order with server prices and tracks it', async ({ page, request }) => {
  test.skip(!process.env.BAZAAR_E2E_LIVE, 'Requires isolated Bazar.e2e_settings backend.');
  const login = await request.post('http://127.0.0.1:8001/api/auth/login/', { data: { phone: '+93709990001', password: 'E2eOnly!Password123' } });
  expect(login.ok()).toBeTruthy();
  const auth = await login.json();
  const products = await request.get('http://127.0.0.1:8001/api/products/');
  const product = (await products.json()).results.find((p: { slug: string }) => p.slug === 'e2e-tea');
  await page.addInitScript(({ auth, product }) => {
    localStorage.setItem('access_token', auth.tokens.access);
    localStorage.setItem('refresh_token', auth.tokens.refresh);
    localStorage.setItem('user', JSON.stringify(auth.user));
    localStorage.setItem('cart', JSON.stringify([{ id: product.id, name: product.name, price: 1, quantity: 2, image: '/placeholder.svg', seller: { name: 'Kabul Test Shop' } }]));
  }, { auth, product });
  await page.goto('/checkout');
  await page.locator('#full_name').fill('E2E Buyer');
  await page.locator('#phone').fill('+93709990001');
  await page.locator('#province').fill('Kabul');
  await page.locator('#city').fill('Kabul');
  await page.locator('#address').fill('District 3, test landmark');
  await page.getByRole('button', { name: /continue|confirm/i }).first().click();
  await expect(page.getByText(/250/).first()).toBeVisible();
  await page.getByRole('button', { name: /place|confirm order/i }).first().click();
  await expect(page).toHaveURL(/\/order-tracking\/ORD-/);
  await expect(page.getByText('Afghan green tea')).toBeVisible();
  await expect(page.getByText(/250/).first()).toBeVisible();
});
