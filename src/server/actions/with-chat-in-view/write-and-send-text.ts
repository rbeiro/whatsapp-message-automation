import { Page } from "puppeteer";
import { addUserInputToClipboard } from "../add-user-input-to-clipboard";

type Props = {
  page: Page;
  text: string;
};

export const writeAndSendText = async ({ page, text }: Props) => {
  console.log("begin of writeAndSendText");
  await page.locator("div[aria-placeholder='Type a message']").click();

  await addUserInputToClipboard({ page, text });

  await page.keyboard.down("Control");
  await page.keyboard.press("V");
  await page.keyboard.up("Control");

  await page.keyboard.press("Enter");
  console.log("end of writeAndSendText");
};
