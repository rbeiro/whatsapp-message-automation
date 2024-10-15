import { Page } from "puppeteer";
import { delay } from "../utils";

type Props = {
  page: Page;
  selector: string;
  selectorName: string;
  numberOfTries?: number;
  iterationDelay?: number;
};

export const checkSelectorUntilExists = async ({
  page,
  selector,
  selectorName,
  numberOfTries,
  iterationDelay,
}: Props) => {
  let doesSelectorExists = false;

  let i = 1;

  while (!doesSelectorExists) {
    await delay(iterationDelay ?? 2000);
    if (i === numberOfTries) return Promise.resolve(false);
    console.log("iteration from selector: ", i);

    const element = await page.$(selector);

    if (element !== null) {
      doesSelectorExists = true;
      console.log(`${selectorName} found ✅`);
      return Promise.resolve(true);
    }

    if (numberOfTries) i++;
    console.log(`Still waiting for ${selectorName}... ❌`);
  }
};
