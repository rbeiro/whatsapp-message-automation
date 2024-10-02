import { Page } from "puppeteer";
import { delay } from "../utils";

export async function disconnectFromWhatsApp(page: Page) {
  await page.locator('div[aria-label="Settings"]').click();

  await delay(250);

  await page.locator("span.xwc7gll").click();

  await delay(250);
  await page.locator("button.x14v0smp").click();
  await delay(250);

  await delay(2000);
}
