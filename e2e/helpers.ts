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
  if (tab === "schedule") {
    await page.getByRole("button", { name: "Lịch thi đấu & Yêu thích" }).click();
  } else {
    await page.getByRole("button", { name: "Mô phỏng" }).click();
  }
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

export function groupCard(page: Page, letter: string) {
  return page.getByTestId(`group-card-${letter}`);
}

/** Kéo thả tương thích @dnd-kit (PointerSensor distance ≥ 6px). */
export async function dndKitDrag(
  page: Page,
  source: ReturnType<Page["getByTestId"]>,
  target: ReturnType<Page["getByTestId"]>
) {
  const sourceHandle = source.getByRole("button", { name: "Kéo để sắp xếp" });
  const targetHandle = target.getByRole("button", { name: "Kéo để sắp xếp" });
  const sourceBox = await sourceHandle.boundingBox();
  const targetBox = await targetHandle.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Không lấy được vị trí phần tử kéo thả");

  const sx = sourceBox.x + sourceBox.width / 2;
  const sy = sourceBox.y + sourceBox.height / 2;
  const tx = targetBox.x + targetBox.width / 2;
  const ty = targetBox.y + targetBox.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx, sy + 12, { steps: 3 });
  await page.mouse.move(tx, ty, { steps: 20 });
  await page.mouse.up();
}

export async function assertNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  expect(hasOverflow).toBe(false);
}
