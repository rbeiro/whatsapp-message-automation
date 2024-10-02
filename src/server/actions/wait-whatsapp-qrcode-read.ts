import { Page } from "puppeteer";
import { delay } from "../utils";

export const waitWhatsappQrcodeRead = async (page: Page) => {
  console.log("begin of waitWhatsappQrcodeRead");
  let qrCodeInScreen = true;

  await page.waitForSelector(
    'canvas[aria-label="Scan this QR code to link a device!"]'
  );

  console.log("After wait for selector");

  while (qrCodeInScreen) {
    await delay(2000);
    const qrCodeIcon = await page.$(
      'canvas[aria-label="Scan this QR code to link a device!"]'
    );

    if (qrCodeIcon === null) {
      qrCodeInScreen = false;
      console.log("qrcode was read ✅");
      return Promise.resolve(true);
    }

    console.log("Still waiting for QR code read... ❌");
  }
};

export const findWhatsappQrcode = async (page: Page) => {
  await page
    .waitForSelector('canvas[aria-label="Scan this QR code to link a device!"]')
    .then(() => {
      console.log("QR code found - findWhatsappQrcode ✅");
      Promise.resolve(true);
    })
    .catch((err) => console.log(err));
};
