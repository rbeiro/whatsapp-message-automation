import { Page } from "puppeteer";
import { delay } from "../../utils";
//import { attachAndSendVideo } from "./attach-and-send-video";
import { attachAndSendContact } from "./attach-and-send-contact";
import { writeAndSendText } from "./write-and-send-text";
import { checkSelectorUntilExists } from "../../utils/selector-exists";
import { generateRandomNumber } from "../../utils/random-number-generator";

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
  const delayBetweenActions = 3000 * generateRandomNumber(1, 1.5);

  console.log(delayBetweenActions);

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
  await delay(delayBetweenActions * generateRandomNumber(1, 5));

  const doesContactExists = await checkSelectorUntilExists({
    page: currentPage,
    selector: firstOnListContactSelector,
    selectorName: data.contact.number,
    iterationDelay: 250,
    numberOfTries: 3,
  });

  //const contact = await currentPage.$(firstOnListContactSelector);

  //If the contact was not found, return function and go back to contacts list
  if (!doesContactExists) {
    await delay(delayBetweenActions * generateRandomNumber(1, 5));
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

  await delay(delayBetweenActions * generateRandomNumber(1, 5));

  //Click the found contact
  await currentPage
    .locator(firstOnListContactSelector)
    .click()
    .then(() => {
      console.log("Contact clicked");
    });

  await delay(delayBetweenActions * generateRandomNumber(1, 5));

  const { attachedContact, text } = data;

  if (attachedContact) {
    await attachAndSendContact(currentPage, attachedContact);
  }

  await delay(delayBetweenActions * generateRandomNumber(1, 5));

  if (text) {
    await writeAndSendText({
      page: currentPage,
      text,
      delayBetweenActions: delayBetweenActions * generateRandomNumber(1, 5),
    }).catch(() => {
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

  // if (videoPath) {
  //   await delay(delayBetweenActions * generateRandomNumber(1, 5));
  //   await attachAndSendVideo({ currentPage, videoPath }).catch(() => {
  //     return Promise.reject({
  //       code: 500,
  //       reload: true,
  //       message: {
  //         content: `Upload do vídeo falhou ❌`,
  //         id: messageId,
  //       },
  //     } as MessageError);
  //   });

  //   let isVideoLastMessage = false;

  //   let i = 0;

  //   while (!isVideoLastMessage) {
  //     if (i === 120) return Promise.reject();
  //     i++;

  //     const video = await currentPage.$('span[data-icon="video-pip"]');
  //     const loadingVideo = await currentPage.$("svg[role='status']");

  //     isVideoLastMessage = video !== null || loadingVideo !== null;

  //     if (!isVideoLastMessage) {
  //       console.log("Procurando vídeo como última mensagem... ❌");
  //     }

  //     await delay(500);
  //   }

  //   console.log(`✅ Last message is a video ✅`);

  //   await delay(220 * generateRandomNumber(1, 3));

  //   // await currentPage
  //   //   .evaluate(async () => {
  //   //     const delay = (ms: number) => {
  //   //       return new Promise((resolve) => {
  //   //         setTimeout(resolve, ms);
  //   //       });
  //   //     };

  //   //     let isVideoLastMessage = false;

  //   //     let i = 0;

  //   //     while (!isVideoLastMessage) {
  //   //       if (i === 360) return Promise.reject();
  //   //       i++;

  //   //       console.log("Verificando nova mensagem, ", i);

  //   //       const video = document.querySelectorAll(
  //   //         'span[data-icon="video-pip"]'
  //   //       );
  //   //       const messages = document.querySelectorAll("div.message-out");

  //   //       const lastMessage = messages[messages.length - 1];

  //   //       // console.log(messages);
  //   //       // console.log("video: ", video);
  //   //       // console.log(video.length);

  //   //       const spanWithDataIcon =
  //   //         video.length > 1 || video.length === 0
  //   //           ? lastMessage?.children[1]?.children[0]?.children[1]?.children[0]
  //   //               ?.children[0]?.children[0]?.children[0]?.children[0]
  //   //           : video[0];

  //   //       //console.log(spanWithDataIcon);

  //   //       // console.log({
  //   //       //   0: lastMessage,
  //   //       //   1: lastMessage?.children[1],
  //   //       //   2: lastMessage?.children[1]?.children[0],
  //   //       //   3: lastMessage?.children[1]?.children[0]?.children[1],
  //   //       //   4: lastMessage?.children[1]?.children[0]?.children[1]?.children[0],
  //   //       //   5: lastMessage?.children[1]?.children[0]?.children[1]?.children[0]
  //   //       //     ?.children[0],
  //   //       //   6: lastMessage?.children[1]?.children[0]?.children[1]?.children[0]
  //   //       //     ?.children[0]?.children[0],
  //   //       //   7: lastMessage?.children[1]?.children[0]?.children[1]?.children[0]
  //   //       //     ?.children[0]?.children[0]?.children[0],
  //   //       //   8: lastMessage?.children[1]?.children[0]?.children[1]?.children[0]
  //   //       //     ?.children[0]?.children[0]?.children[0]?.children[1],
  //   //       //   9: lastMessage?.children[1]?.children[0]?.children[1]?.children[0]?.children[0]?.children[0]?.children[0]?.children[0].getAttribute(
  //   //       //     "data-icon"
  //   //       //   ),
  //   //       // });

  //   //       isVideoLastMessage =
  //   //         spanWithDataIcon.getAttribute("data-icon") === "video-pip"
  //   //           ? true
  //   //           : spanWithDataIcon?.children[0]?.children[0]?.getAttribute(
  //   //               "role"
  //   //             ) === "status";
  //   //       // if (isVideoLastMessage) {
  //   //       //   return Promise.resolve(true);
  //   //       // }

  //   //       await delay(500);
  //   //     }
  //   //   })
  //   //   .catch(() => {
  //   //     console.log("Video não encontrado como última mensagem ❌");
  //   //     return Promise.reject({
  //   //       code: 500,
  //   //       reload: true,
  //   //       message: {
  //   //         content: `Video não enviado`,
  //   //         id: messageId,
  //   //       },
  //   //     } as MessageError);
  //   //   });
  // }

  return Promise.resolve({
    message: {
      content: `Mensagem para ${data.contact.number} enviada com sucesso! ✅`,
      id: messageId,
    },
    status: "success",
  });
};

//Helper functions
