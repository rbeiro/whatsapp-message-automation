import { Page } from "puppeteer";
import { clickAttachAndSelect } from "./click-attach-and-select";
import { delay } from "../../utils";

export async function attachAndSendContact(
  currentPage: Page,
  attachedContact: string
) {
  if (attachedContact) {
    clickAttachAndSelect(currentPage, "contact");

    //Select the search bar within the attach contact modal
    await currentPage.locator(`div[role="textbox"][tabindex="3"]`).click();

    await currentPage.keyboard.type(attachedContact);

    console.log("After keyboard type - attachAndSendContact");

    //Selected the first option
    await currentPage
      .locator(
        'div[style="z-index: 1; transition: none; height: 72px; transform: translateY(72px);"]'
      )
      .click();

    //Need to send twice
    await currentPage.locator('span[data-icon="send"]').click();
    await currentPage.locator('span[data-icon="send"]').click();

    console.log("done - attachAndSendContact");

    await delay(50);
  }
}
