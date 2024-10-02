import { Page } from "puppeteer";
import { delay } from "../../utils";
import { attachAndSendVideo } from "./attach-and-send-video";
import { attachAndSendContact } from "./attach-and-send-contact";
import { writeAndSendText } from "./write-and-send-text";
import { checkSelectorUntilExists } from "../../utils/selector-exists";

type SendUserMessageProps = {
  currentPage: Page;
  data: {
    contact: {
      name: string;
      number: string;
    };
    attachedContact?: string;
    videoPath?: string;
    text?: string;
    image?: string;
  };
  options?: {
    iterationNumber?: number;
    wave?: number;
    messageIdRetry?: string;
  };
};

type MessageFulfilled = {
  message: { id: string; content: string };
  status: "error" | "success";
};

export type MessageError = {
  code: 500 | 404;
  message: {
    content: string;
    id: string;
  };
  reload: boolean;
};

export const sendUserMessage: (
  props: SendUserMessageProps
) => Promise<MessageFulfilled> = async ({ currentPage, data, options }) => {
  const messageId = options?.messageIdRetry ?? crypto.randomUUID();

  //Click the 'New chat' button and search for the contact
  await currentPage
    .locator("div[title='New chat']")
    .click()
    .then(async () => {
      console.log("Clicked on New Chat.");

      //Click the search bar
      await currentPage.locator('div[aria-owns="emoji-suggestion"]').click();

      await currentPage.keyboard.type(data.contact.number);
      console.log("Contact typed on search bar.");
    });

  console.log("Trying to find contact.");

  const firstOnListContactSelector = `div[style="z-index: 0; transition: none; height: 72px; transform: translateY(72px);"]`;

  //Delay necessary because whatsapp takes a little to display the contact.
  await delay(250);

  const doesContactExists = await checkSelectorUntilExists({
    page: currentPage,
    selector: firstOnListContactSelector,
    selectorName: data.contact.number,
    iterationDelay: 250,
    numberOfTries: 5,
  });

  //const contact = await currentPage.$(firstOnListContactSelector);

  //If the contact was not found, return function and go back to contacts list
  if (!doesContactExists) {
    await currentPage.locator('div[aria-label="Back"]').click();
    return Promise.reject({
      code: 404,
      reload: false,
      message: {
        content: `${data.contact.number} não encontrado ❌`,
        id: messageId,
      },
    } as MessageError);
  }

  //Click the found contact
  await currentPage
    .locator(firstOnListContactSelector)
    .click()
    .then(() => {
      console.log("Contact clicked");
    });

  const { attachedContact, videoPath, text } = data;

  if (attachedContact) {
    await attachAndSendContact(currentPage, attachedContact);
  }

  if (text) {
    await writeAndSendText({ page: currentPage, text }).catch(() => {
      return Promise.reject({
        code: 500,
        reload: true,
        message: {
          content: `Envio da mensagem falhou ❌`,
          id: messageId,
        },
      } as MessageError);
    });
  }

  if (videoPath) {
    await attachAndSendVideo({ currentPage, videoPath }).catch(() => {
      return Promise.reject({
        code: 500,
        reload: true,
        message: {
          content: `Upload do vídeo falhou ❌`,
          id: messageId,
        },
      } as MessageError);
    });

    const isVideoLastMessage = await currentPage.evaluate(async () => {
      const messages = document.querySelectorAll("div.message-out");

      const lastMessage = messages[messages.length - 1];

      const delay = (ms: number) => {
        return new Promise((resolve) => {
          setTimeout(resolve, ms);
        });
      };

      let isVideoLastMessage = false;

      while (!isVideoLastMessage) {
        console.log("checking if video was sent");
        await delay(500);
        const thing =
          lastMessage?.children[1]?.children[0]?.children[1]?.children[0]
            ?.children[0]?.children[0]?.children[0]?.children[0];
        isVideoLastMessage = thing?.getAttribute("data-icon") === "video-pip";

        return Promise.resolve(true);
      }
    });
    console.log("isVideoLastMessage: ", isVideoLastMessage);
  }

  return Promise.resolve({
    message: {
      content: `Mensagem para ${data.contact.number} enviada com sucesso! ✅`,
      id: messageId,
    },
    status: "success",
  });
};

//Helper functions
