import { Page } from "puppeteer";

type Props = {
  page: Page;
  text: string;
};

export const addUserInputToClipboard = async ({ page, text }: Props) => {
  console.log("begin of addUserInputToClipboard");
  //const userText = ws.data.text;
  await page.evaluate((text) => {
    const blob = new Blob([text], { type: "text/plain" });
    const item = new ClipboardItem({ "text/plain": blob });
    navigator.clipboard
      .write([item])
      .then(() => {
        console.log("Text copied to clipboard successfully!");
      })
      .catch((err) => {
        console.error("Failed to copy video: ", err);
      });
  }, text);
  console.log("end of addUserInputToClipboard");
};
