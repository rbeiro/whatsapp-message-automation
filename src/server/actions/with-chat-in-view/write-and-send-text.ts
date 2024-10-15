import { Page } from "puppeteer";
import { addUserInputToClipboard } from "../add-user-input-to-clipboard";
import { delay } from "../../utils";

type Props = {
  page: Page;
  text: string;
  delayBetweenActions: number;
};

export const writeAndSendText = async ({
  page,
  text,
  delayBetweenActions = 0,
}: Props) => {
  console.log("begin of writeAndSendText");
  await page.locator("div[aria-placeholder='Type a message']").click();
  await delay(delayBetweenActions);

  await addUserInputToClipboard({ page, text });

  await page.keyboard.down("Control");
  await delay(delayBetweenActions);
  await page.keyboard.press("V");
  await delay(delayBetweenActions);
  await page.keyboard.up("Control");

  await delay(delayBetweenActions);

  await page.keyboard.press("Enter");
  console.log("end of writeAndSendText");
};
