import { expect, type Page } from "@playwright/test";

export async function clearSimulationStorage(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem("wc2026-simulation");
  });
}

export async function gotoFresh(page: Page) {
  await clearSimulationStorage(page);
  await page.goto("/");
  await page.getByRole("heading", { name: "WC 2026 Simulator" }).waitFor();
}

export async function goToTab(
  page: Page,
  tab: "groups" | "schedule" | "third" | "knockout"
) {
  await page.getByTestId(`tab-${tab}`).click();
}

export function knockoutTab(page: Page) {
  return page.getByTestId("tab-knockout");
}

export async function openGroupDetail(page: Page, letter: string) {
  await page.getByTestId(`group-detail-btn-${letter}`).click();
  await page.getByTestId(`group-detail-modal-${letter}`).waitFor();
}

export function groupDetailModal(page: Page, letter: string) {
  return page.getByTestId(`group-detail-modal-${letter}`);
}

export async function assertNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  expect(hasOverflow).toBe(false);
}