import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

// Accessibility smoke test for the shared design system (test-gate skill requirement). The showcase
// route is dev-only (see apps/web/app/dev/showcase/page.tsx) so this only runs against a dev server.
test('design system showcase has no automatically detectable accessibility violations', async ({
  page,
}) => {
  await page.goto('/dev/showcase');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
