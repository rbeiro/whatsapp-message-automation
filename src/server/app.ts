import puppeteer, { Page } from "puppeteer";
import os from "os";
import path from "path";
import ngrok from "@ngrok/ngrok";
import { addUserInputToClipboard } from "./actions";
import {
  findWhatsappQrcode,
  waitWhatsappQrcodeRead,
} from "./actions/wait-whatsapp-qrcode-read";
import { checkIfChatPageLoaded } from "./actions/check-if-chat-page-loaded";
import { disconnectFromWhatsApp } from "./actions/disconnect-from-whatsapp";
import { sendUserMessage } from "./actions/with-chat-in-view";
import { MessageError } from "./actions/with-chat-in-view/send-user-message";

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type messageData = {
  action:
    | "load-data-text"
    | "start-automation"
    | "load-data-phone"
    | "load-data-attached-contact"
    | "check-status"
    | "send-video";
  payload: string;
  status: "processing" | "success" | "error" | "sending";
};

type LoadContactsAction = {
  action: "load-data-contacts";
  payload: {
    name: string;
    number: string;
  }[];
  status: "processing" | "success" | "error" | "sending";
};

type MessageDataType = messageData | LoadContactsAction;

type WebsocketData = {
  username: string;
  video: { buffer: Buffer[]; path: string };
  text: string;
  contacts: { name: string; number: string }[];
  contactToAttach?: string;
  senderNumber: string;
};

const server = Bun.serve<WebsocketData>({
  port: 4040,
  async fetch(req, server) {
    console.log("incoming");
    const success = server.upgrade(req);
    if (success) return undefined;

    return new Response("Hello world");
  },
  //Websocket configuration
  websocket: {
    open(ws) {
      const msg = JSON.stringify({ action: "connection", status: "success" });
      ws.subscribe("progress");
      ws.data = {
        username: "",
        video: {
          buffer: [],
          path: "",
        },
        text: "",
        contacts: [],
        senderNumber: "",
      };
      server.publish("progress", msg);
    },
    async message(ws, message) {
      //const delayBetweenActions = 50;

      if (Buffer.isBuffer(message)) {
        ws.data.video.buffer.push(message);
        return;
      }

      const messageData: MessageDataType = JSON.parse(message);
      console.log(messageData);

      if (!Buffer.isBuffer(message)) {
        if (typeof messageData.payload === "string") {
          if (messageData.action === "load-data-text") {
            ws.data.text = messageData.payload;
          }

          if (messageData.action === "load-data-phone") {
            ws.data.senderNumber = messageData.payload;
          }
          if (messageData.action === "load-data-attached-contact") {
            ws.data.contactToAttach = messageData.payload;
          }
        } else {
          if (messageData.action === "load-data-contacts") {
            console.log("received contacts");
            ws.data.contacts = messageData.payload;
          }

          if (
            messageData.action === "send-video" &&
            messageData.status === "sending"
          ) {
            ws.data.video.buffer.push(JSON.parse(messageData.payload));
          }
          if (
            messageData.action === "send-video" &&
            messageData.status === "success"
          ) {
            const completeVideoBuffer = Buffer.concat(ws.data.video.buffer);

            const tempDir = os.tmpdir();
            const tempVideoPath = path.join(tempDir, "temp_video.mp4");
            ws.data.video.path = tempVideoPath;
            Bun.write(tempVideoPath, completeVideoBuffer);

            console.log("Video data stored in memory");

            console.log({ ...ws.data, video: { buffer: [] } });

            server.publish(
              "progress",
              JSON.stringify({
                action: "check-status",
                status: "success",
              })
            );
          }
        }
      }

      //Start automation
      if (messageData.action === "start-automation") {
        const browser = await puppeteer.launch({
          headless: false,
          browser: "chrome",
          args: [
            "--lang=en-US,en",
            "--incognito",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--no-zygote",
            "--log-level=3",
            "--disable-site-isolation-trials",
            "--no-experiments",
            "--ignore-gpu-blacklist",
            "--ignore-certificate-errors",
            "--ignore-certificate-errors-spki-list",
            "--disable-gpu",
            "--disable-extensions",
            "--disable-default-apps",
            "--enable-features=NetworkService",
            "--disable-setuid-sandbox",
            "--disable-databases",
            "--no-sandbox",
            "--disable-webgl",
            "--disable-infobars",
            "--window-position=0,0",
            "--ignore-certifcate-errors",
            "--ignore-certifcate-errors-spki-list",
            "--disable-threaded-animation",
            "--disable-threaded-scrolling",
            "--disable-in-process-stack-traces",
            "--disable-histogram-customizer",
            "--disable-gl-extensions",
            "--disable-composited-antialiasing",
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36",
            "--disable-background-networking",
            "--enable-features=NetworkService,NetworkServiceInProcess",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-breakpad",
            "--disable-client-side-phishing-detection",
            "--disable-component-extensions-with-background-pages",
            "--disable-dev-shm-usage",
            "--disable-features=Translate",
            "--disable-hang-monitor",
            "--disable-ipc-flooding-protection",
            "--disable-popup-blocking",
            "--disable-prompt-on-repost",
            "--disable-renderer-backgrounding",
            "--disable-sync",
            "--force-color-profile=srgb",
            "--metrics-recording-only",
            "--no-first-run",
            "--enable-automation",
            "--password-store=basic",
            "--use-mock-keychain",
            "--enable-blink-features=IdleDetection",
            "--export-tagged-pdf",
            "--aggressive-cache-discard",
            "--disable-cache",
            "--disable-application-cache",
            "--disable-offline-load-stale-cache",
            "--disable-gpu-shader-disk-cache",
            "--media-cache-size=0",
            "--disk-cache-size=0",
          ],
          ignoreDefaultArgs: ["--disable-extensions"],
          userDataDir: "/dev/null",
        });

        try {
          //console.log(ws.data.video.path);

          let context = await browser.createBrowserContext();

          let activePage = await context.newPage();

          await activePage.setCacheEnabled(false);

          await beforeAutomationChecks(activePage);

          try {
            await startAutomation();
          } catch (err) {
            console.log("OCORREU UM ERRO");
            console.log(err);

            await disconnectFromWhatsApp(activePage);

            await delay(2000);

            browser.close();
          }

          async function startAutomation() {
            let wave = 1;
            let interationNumberWhenRestarted = 0;

            await sendUserMessage({
              currentPage: activePage,
              data: {
                contact: {
                  name: "Gabriel",
                  number: "15991689366",
                },
                attachedContact: ws.data.contactToAttach,
                image: undefined,
                text: ws.data.text,
                videoPath: ws.data.video.path,
              },
            });

            await delay(5000);
            await takeAndPublishScreenshot();

            //Set page to offline to send messages.
            await activePage.setOfflineMode(true);

            //Loop through all contacts
            for (let c = 1; c <= ws.data.contacts.length; c++) {
              //Every x amount of iterations set page to online so whatsapp can send the messages
              if (c % 250 === 0) {
                await activePage.setOfflineMode(false);
                console.log("ESPERANDO ENVIO DO WHATSAPP...");
                await delay(25 * 1000); // 25 seconds
                console.log("Espera acabou continuando...");
                await activePage.setOfflineMode(true);
              }

              //Every x amount of iterations close the page so disk usage is not through the roof as freezes the server.
              if (c % 1000 === 0 && c !== 4000) {
                await disconnectFromWhatsApp(activePage);
                await context.close();

                context = await browser.createBrowserContext();
                console.log("created new context");
                activePage = await context.newPage();
                console.log("openend new page");

                console.log("beofre findWhatsAppQrCodeAndWaitForRead");

                await findWhatsappQrcode(activePage);
                await waitWhatsappQrcodeRead(activePage);

                await addUserInputToClipboard({
                  page: activePage,
                  text: ws.data.text,
                });
                wave++;
              }

              let currentMessageId = crypto.randomUUID().toString();

              console.log(wave);

              for (let e = 0; e < 3; e++) {
                console.log(
                  `========= Starting to send message ${c} =========`
                );
                server.publish(
                  "progress",
                  JSON.stringify({
                    action: "message-sent",
                    id: currentMessageId,
                    status: "sending",
                  })
                );
                await sendUserMessage({
                  currentPage: activePage,
                  data: {
                    contact: {
                      name: ws.data.contacts[c - 1].name.toString(),
                      number: ws.data.contacts[c - 1].number,
                    },
                    attachedContact: ws.data.contactToAttach,
                    image: undefined,
                    text: ws.data.text,
                    videoPath: ws.data.video.path,
                  },
                  options: {
                    messageIdRetry: currentMessageId,
                  },
                })
                  .then((success) => {
                    server.publish(
                      "progress",
                      JSON.stringify({
                        action: "message-sent",
                        id: success.message.id,
                        payload: success.message.content,
                        status: "success",
                      })
                    );

                    e = 3; //TODO: check if there's a better way to break this loop
                  })
                  .catch(async (error: MessageError) => {
                    console.log("We got to the top");
                    console.log("Erro ao enviar mensagem ❌", {
                      reload: error.reload,
                      errMessage: error.message,
                    });

                    server.publish(
                      "progress",
                      JSON.stringify({
                        action: "message-sent",
                        id: error.message.id,
                        payload: error.message.content,
                        status: "error",
                      })
                    );

                    //TODO: Handle other cases where message wasn't send successfully

                    currentMessageId = error.message.id;
                    if (error.reload) {
                      const awaitAmount =
                        (c - interationNumberWhenRestarted) * 1000; // 1 second per message

                      console.log(
                        "trying to reload page -------------------------------------"
                      );
                      //Delete last text message since video wasn't sent
                      const allMessagesOut = await activePage.$$(
                        "div.message-out"
                      );

                      const lastMessage =
                        allMessagesOut[allMessagesOut.length - 1];

                      await lastMessage.hover();

                      await activePage
                        .locator("div[aria-label='Context menu']")
                        .click();
                      await activePage
                        .locator("div[aria-label='Delete']")
                        .click();

                      await activePage.locator("button.x14v0smp").click();

                      //Connect page to internet so previous messages can be sent.
                      activePage.setOfflineMode(false);
                      //Delete cookies and localStorage so language is correct.

                      await activePage.deleteCookie({
                        name: "wa_web_lang_pref",
                        domain: ".web.whatsapp.com",
                      });

                      await activePage.evaluate(() => {
                        window.localStorage.removeItem("WALangPhonePref");
                      });

                      await delay(awaitAmount);
                      interationNumberWhenRestarted = c;

                      await activePage
                        .reload({
                          waitUntil: ["domcontentloaded"],
                        })
                        .then(async () => {
                          console.log(
                            "++++++++++++++++++++++++++++++++= PAGE RELOAD ++++++++++++++++++++++++++++++++++++++++++="
                          );
                          await checkIfChatPageLoaded(activePage);

                          await delay(5000);
                          await activePage.deleteCookie({
                            name: "wa_web_lang_pref",
                          });

                          await activePage.evaluate(() => {
                            window.localStorage.removeItem("WALangPhonePref");
                          });
                          activePage.setOfflineMode(true);
                        });
                    }
                  });

                // await sendTextAndVideo(
                //   activePage,
                //   {
                //     contact: {
                //       name: "Gabriel",
                //       number: ws.data.contacts[c - 1].number,
                //     },
                //     attachedContact: ws.data.contactToAttach,
                //   },
                //   { iterationNumber: c, wave, messageIdRetry: currentMessageId }
                // )
                //   .then(() => {
                //     console.log(
                //       "breaking the loop ----------------------------------------------"
                //     );
                //     e = 3;
                //   })
                //   .catch(async (messageId) => {
                //     console.log(messageId);
                //     currentMessageId = messageId;
                //     await activePage.deleteCookie();

                //     await activePage.deleteCookie({
                //       name: "wa_web_lang_pref",
                //       domain: ".web.whatsapp.com",
                //     });

                //     await activePage.evaluate(() => {
                //       window.localStorage.removeItem("WALangPhonePref");
                //     });

                //     await delay(2000);

                //     await activePage
                //       .reload({
                //         waitUntil: ["domcontentloaded"],
                //       })
                //       .then(async () => {
                //         console.log(
                //           "++++++++++++++++++++++++++++++++= PAGE RELOAD ++++++++++++++++++++++++++++++++++++++++++="
                //         );
                //         activePage.setOfflineMode(false);
                //         await delay(5000);
                //         activePage.setOfflineMode(true);
                //         await activePage.deleteCookie({
                //           name: "wa_web_lang_pref",
                //         });

                //         await checkIfChatPageLoaded(activePage);
                //       });
                //   });
              }

              console.log("Out of inside loop");
            }

            await activePage.setOfflineMode(false);

            console.log("BEFORE FINAL SCREENSHOT");

            console.log("finalizado");

            await delay(15000);

            await takeAndPublishScreenshot();

            await disconnectFromWhatsApp(activePage);

            await delay(2000);

            browser.close();
          }

          // async function sendTextAndVideo(
          //   currentPage: Page,
          //   data: {
          //     contact: {
          //       name: string;
          //       number: string;
          //     };
          //     attachedContact?: string;
          //   },
          //   options?: {
          //     iterationNumber: number;
          //     wave: number;
          //     messageIdRetry?: string;
          //   }
          // ) {
          //   console.log("========= START OF sendTextAndVideo =========");
          //   //await addUserInputToClipboard(currentPage);
          //   const messageId = options?.messageIdRetry ?? crypto.randomUUID();

          //   server.publish(
          //     "progress",
          //     JSON.stringify({
          //       action: "message-sent",
          //       status: "sending",
          //       id: messageId,
          //     })
          //   );

          //   await currentPage
          //     .locator("div[title='New chat']")
          //     .click()
          //     .then(async () => {
          //       console.log("click on 'New chat'");
          //       await currentPage
          //         .locator('div[aria-owns="emoji-suggestion"]')
          //         .click();
          //       // await delay(delayBetweenActions);

          //       await currentPage.keyboard.type(data.contact.number);
          //       console.log("typed number");
          //     });

          //   // await delay(delayBetweenActions);
          //   console.log("trying to find Contact");

          //   const firstContactSelector = `div[style="z-index: 0; transition: none; height: 72px; transform: translateY(72px);"]`;

          //   await delay(250);
          //   const contact = await currentPage.$(firstContactSelector);

          //   if (!contact) {
          //     await currentPage.locator('div[aria-label="Back"]').click();
          //     server.publish(
          //       "progress",
          //       JSON.stringify({
          //         action: "message-sent",
          //         payload: `${data.contact.number} não encontrado ❌`,
          //         status: "error",
          //         id: messageId,
          //       })
          //     );

          //     return;
          //   }

          //   await currentPage
          //     .locator(firstContactSelector)
          //     .click()
          //     .then(() => {
          //       console.log("Contact clicked");
          //     });

          //   // await delay(delayBetweenActions);

          //   await attachAndSendContact(currentPage, data.attachedContact);

          //   await currentPage
          //     .locator("div[aria-placeholder='Type a message']")
          //     .click();

          //   await currentPage.evaluate(async () => {
          //     function delay(ms: number) {
          //       return new Promise((resolve) => {
          //         setTimeout(resolve, ms);
          //       });
          //     }
          //     while (
          //       document.activeElement?.ariaPlaceholder !== "Type a message"
          //     ) {
          //       const element = document.querySelector(
          //         "div[aria-placeholder='Type a message']"
          //       ) as HTMLElement;
          //       element.click();
          //       await delay(500);
          //     }
          //   });

          //   await delay(delayBetweenActions);

          //   console.log(` ${options?.iterationNumber} wave: ${options?.wave}`);

          //   // await delay(delayBetweenActions);

          //   await currentPage.keyboard.press("Enter");

          //   await delay(delayBetweenActions);

          //   await attachAndSendVideo(currentPage, messageId);

          //   server.publish(
          //     "progress",
          //     JSON.stringify({
          //       action: "message-sent",
          //       id: messageId,
          //       payload: `Mensagem para ${data.contact.number} enviada com sucesso!  ✅`,
          //       status: "success",
          //     })
          //   );

          //   console.log("Mensagem enviada");

          //   return Promise.resolve(
          //     `Mensagem para ${data.contact.number} enviada com sucesso!`
          //   );
          // }

          // async function attachAndSendVideo(
          //   currentPage: Page,
          //   messageId: string
          // ) {
          //   console.log("trying to find Attach");

          //   await currentPage.locator("div[title='Attach']").click();

          //   console.log("clicked on Attach");

          //   await delay(delayBetweenActions);

          //   await elementHandle
          //     ?.uploadFile(ws.data.video.path)
          //     .then(async () => {
          //       const isVideoReady = await currentPage.evaluate(async () => {
          //         function delay(ms: number) {
          //           return new Promise((resolve) => {
          //             setTimeout(resolve, ms);
          //           });
          //         }

          //         let video = document.querySelectorAll("video");
          //         let isVideoReady = false;

          //         console.log("videos found: ", video.length);
          //         while (video.length === 0) {
          //           await delay(100);
          //           video = document.querySelectorAll("video");
          //         }

          //         while (isVideoReady === false) {
          //           await delay(100);
          //           isVideoReady =
          //             video[0].readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
          //         }
          //         console.log("video is ready: ", isVideoReady);

          //         return Promise.resolve(true);
          //       });

          //       if (isVideoReady) {
          //         console.log("SENT VIDEO");
          //         await currentPage.keyboard.press("Enter");
          //       }
          //     })
          //     .catch(() => {
          //       console.log("File not uploaded");
          //       server.publish(
          //         "progress",
          //         JSON.stringify({
          //           action: "message-sent",
          //           payload:
          //             "Erro ao fazer o upload do vídeo, fazendo nova tentativa",
          //           status: "error",
          //           id: messageId,
          //         })
          //       );
          //       Promise.reject(messageId);
          //     });
          // }

          async function takeAndPublishScreenshot() {
            await activePage.screenshot({ fullPage: true }).then((data) => {
              server.publish("progress", data);
            });
          }

          async function beforeAutomationChecks(page: Page) {
            await takeAndPublishScreenshot();

            await page.goto("https://web.whatsapp.com/");

            await addUserInputToClipboard({
              page: activePage,
              text: ws.data.text,
            });

            //Find qrcode and send a screenshot so the user can read
            await findWhatsappQrcode(page);

            await takeAndPublishScreenshot();

            //Wait for the use to read the Whatsapp QRcode
            await waitWhatsappQrcodeRead(page);

            //Check if the chat page is loaded by searching for the 'New Chat icon' and send screenshot to the user.
            await checkIfChatPageLoaded(page);

            await takeAndPublishScreenshot();

            await delay(15000);
          }

          // async function checkIfChatsPageLoaded(page: Page) {
          //   await delay(15000);
          //   newChatIconFound = false;

          //   console.log(
          //     "begin of checkIfChatsPageLoaded, newChatIconFound: ",
          //     newChatIconFound
          //   );

          //   if (!newChatIconFound) {
          //     console.log(
          //       "inside IF newCHatinconFOund, newChatIconFound: ",
          //       newChatIconFound
          //     );
          //     while (!newChatIconFound) {
          //       console.log(
          //         "trying to find chat, newChatIconFound: ",
          //         newChatIconFound
          //       );

          //       const newChatIcon = await page.$$("div[title='New chat']");

          //       console.log(newChatIcon.length > 0);
          //       if (newChatIcon.length > 0) {
          //         console.log("chat found");
          //         newChatIconFound = true;
          //       }

          //       console.log(
          //         "chat missing, newChatIconFound: ",
          //         newChatIconFound
          //       );
          //       await delay(2000);
          //     }
          //   }

          //   console.log(newChatIconFound);
          // }

          // async function findWhatsAppQrCodeAndWaitForRead(page: Page) {
          //   qrCodeFound = false;

          //   console.log("begin of findWhatsAppQrCodeAndWaitForRead");

          //   server.publish("progress", "Página do whatsapp aberta");

          //   await findQrCode();

          //   await page.screenshot({ fullPage: true }).then((data) => {
          //     server.publish("progress", data);
          //   });

          //   while (!qrCodeFound) {
          //     await findQrCode();
          //     await delay(2000);
          //   }
          //   console.log("BEFORE WHILE LOOP QR CODE STATUS: ", qrCodeFound);
          //   while (qrCodeFound) {
          //     console.log("Begin of Loop, QR CODE STATUS: ", qrCodeFound);

          //     console.log("Before QR CODE selector, qrCodeFound", qrCodeFound);

          //     await page
          //       .waitForSelector(
          //         'canvas[aria-label="Scan this QR code to link a device!"]',
          //         { timeout: 200 }
          //       )
          //       .then(() => {
          //         console.log("QR code still in screen.");
          //         qrCodeFound = true;
          //       })
          //       .catch(() => {
          //         console.log("QR dissapeared");
          //         qrCodeFound = false;
          //       })
          //       .finally(() => {
          //         console.log("QRCODE STATUS: ", qrCodeFound);
          //       });

          //     console.log("After QR CODE selector, qrCodeFound", qrCodeFound);

          //     await delay(2000);
          //   }
          // }
        } catch {
          browser.close();
        }
      }
    },
    close(ws) {
      const msg = JSON.stringify({ action: "connection", status: "end" });
      server.publish("progress", msg);
      ws.unsubscribe("progress");
    },
  },
});

// async function retry(
//   callback: () => Promise<void>,
//   { condition }: { condition?: boolean }
// ) {
//   callback();
//   console.log(condition);
// }

async function startNgrok() {
  try {
    const url = await ngrok.connect({
      addr: "http://localhost:4040/",
      region: "sa",
      authtoken: "2IOqa5GFPtPSjAUk5iLinicjSuO_7P8u9ix8SxKzV4UtZJ9BE",
      domain: "anemone-loved-mentally.ngrok-free.app",
    });

    console.log(`Ngrok tunnel established at ${url.url()}`);
  } catch (error) {
    console.error("Error starting ngrok tunnel:", error);
  }
}

startNgrok();

console.log(`Listening on ${server.hostname}:${server.port}`);
