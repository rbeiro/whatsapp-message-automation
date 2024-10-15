import { Page } from "puppeteer";
import { clickAttachAndSelect } from "./click-attach-and-select";
//import { delay } from "../../utils";
import { checkSelectorUntilExists } from "../../utils/selector-exists";
import { delay } from "../../utils";
import { generateRandomNumber } from "../../utils/random-number-generator";

type Args = {
  currentPage: Page;
  videoPath: string;
  delayBetweenActions?: number;
};

export async function attachAndSendVideo({
  currentPage,
  videoPath,
  delayBetweenActions = 0,
}: Args): Promise<void> {
  console.log("begin of attachAndSendVideo");
  const elemntHandle = await clickAttachAndSelect(currentPage, "video");

  console.log("after clickAttachAndSelect");
  await delay(delayBetweenActions);

  await elemntHandle?.uploadFile(videoPath).catch((err) => {
    console.log("Video upload error ❌");
    console.log(err);
    return Promise.reject({
      code: 500,
      reload: true,
      message: `Upload do vídeo falhou ❌`,
      err,
    });
  });
  //This is necessary because the .catch with uploadFile doesn't alwats work
  //TODO: check if it's bad code or what

  await delay(delayBetweenActions);
  const isVideoReady = await checkSelectorUntilExists({
    page: currentPage,
    selector: 'img[alt="Preview"]',
    selectorName: "uploaded video",
    numberOfTries: 30,
    iterationDelay: 500,
  });

  console.log("isVideoReady: ", isVideoReady);

  if (!isVideoReady) {
    return Promise.reject({
      code: 500,
      reload: true,
      message: `Upload do vídeo falhou ❌`,
    });
  }
  // //TODO: Refactor isVideoReady, this also checks true if there's a video is within any part of the screen.
  // const isVideoReady = await currentPage.evaluate(async () => {
  //   function delay(ms: number) {
  //     return new Promise((resolve) => {
  //       setTimeout(resolve, ms);
  //     });
  //   }

  //   let video = document.querySelectorAll("video");
  //   let isVideoReady = false;

  //   console.log("videos found: ", video.length);
  //   while (video.length === 0) {
  //     await delay(100);
  //     video = document.querySelectorAll("video");
  //   }

  //   while (isVideoReady === false) {
  //     await delay(100);
  //     isVideoReady = video[0].readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  //   }
  //   console.log("video is ready: ", isVideoReady);

  //   return Promise.resolve(true);
  // });

  if (isVideoReady) {
    console.log("video sent! - attachAndSendVideo ✅");

    //await delay(100);
    await delay(delayBetweenActions);
    await currentPage.waitForSelector(
      "div[aria-label='Send'][aria-disabled='false']"
    );

    await delay(200 * generateRandomNumber(1, 3));

    await currentPage
      .locator("div[aria-label='Send'][aria-disabled='false']")
      .click();

    return Promise.resolve();
  }
}
