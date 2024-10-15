import { ElementHandle, Page } from "puppeteer";
import { delay } from "../../utils";

type AttachButtonOptions = "contact" | "video" | "image";

type AttachButtonReturn<T> = T extends "contact" | "image"
  ? Promise<void>
  : T extends "video"
  ? Promise<ElementHandle<HTMLInputElement>> | null
  : never;

export async function clickAttachAndSelect<T extends AttachButtonOptions>(
  page: Page,
  whichButton: T,
  delayBetweenActions: number = 0
): Promise<AttachButtonReturn<T>> {
  try {
    await page.locator("div[title='Attach']").click();
    await delay(delayBetweenActions);

    console.log("clicked on Attach");

    if (whichButton === "contact") {
      // await page
      //   .locator('path[fill="var(--attachment-type-contacts-color)"]')
      //   .click();
      // console.log("clicked on Contact icon");
      // return Promise.resolve() as AttachButtonReturn<T>;
    }

    if (whichButton === "image") {
      //TODO: Image attachment logic
    }

    if (whichButton === "video") {
      await delay(delayBetweenActions);
      await page
        .waitForSelector(
          "input[accept='image/*,video/mp4,video/3gpp,video/quicktime']"
        )
        .catch(() => Promise.reject());
      const elementHandle = await page.$(
        "input[accept='image/*,video/mp4,video/3gpp,video/quicktime']"
      );

      return Promise.resolve(elementHandle) as AttachButtonReturn<T>;
    }

    return Promise.reject(
      "No type second parameter was given "
    ) as AttachButtonReturn<T>;
  } catch {
    return Promise.reject() as AttachButtonReturn<T>;
  }
}
