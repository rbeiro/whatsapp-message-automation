import { Page } from "puppeteer";
import { delay } from "../utils";

export async function checkIfChatPageLoaded(page: Page) {
  console.log("begin of checkIfChatPageLoaded");

  await page.waitForNetworkIdle();
  await page.setOfflineMode(false);
  let isNewChatIconInDisplay = false;

  while (!isNewChatIconInDisplay) {
    await delay(2000);
    const newChatIcon = await page.$("div[title='New chat']");

    if (newChatIcon !== null) {
      isNewChatIconInDisplay = true;
      console.log("Chats page loaded ✅");
      return Promise.resolve(true);
    }

    console.log("Still waiting for New Chat icon... ❌");
  }

  console.log("end of checkIfChatPageLoaded");
}
