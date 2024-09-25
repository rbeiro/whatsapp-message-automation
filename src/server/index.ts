import puppeteer from "puppeteer";
import os from "os";
import path from "path";
import Bun from "bun";

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const textToSend = `Sou Policial Militar há 19 anos, trabalhando durante 13 anos no 24° Batalhão de Diadema ( ABC Paulista) , 2 anos no 50° Batalhão do interior ( São Roque e Mairinque) , e em Sorocaba no policiamento comunitário com motos, também por alguns anos, realizamos um trabalho forte e com muito comprometimento no combate a criminalidade e também na área social ajudando centenas de pessoas em situação de vulnerabilidade, pela região do Éden, Cajuru, Aparecidinha, Vitória Régia, Alpes de Sorocaba, Laranjeiras, Paineiras, sendo este trabalho amplamente divulgado em minhas redes sociais, alcançando muitas pessoas de outras regiões de Sorocaba, ficando conhecido como " Cabo Lucas Fracazzi". Este reconhecimento nos fez conquistar vários amigos em todas as áreas, inclusive de políticos da nossa região, entre eles o nosso secretário de segurança pública do estado de São Paulo " Guilherme Derrite" , que em setembro de 2023 me convidou para compor sua equipe de confiança, onde assumi o cargo de assessor militar, permanecendo no cargo até participar de uma reunião com o presidente do partido político PL 🇧🇷 ( Danilo Balas) onde obtive apoio e aval do nosso secretário Guilherme Derrite, decidi partir para essa missão em Sorocaba, me colocando a disposição da população de bem , na posição de candidato a vereador em Sorocaba com o número 22190, onde vamos lutar por segurança pública de qualidade, promovendo uma parceria entre o município e Estado com fiscalizações diárias e combate aos Pancadões, Pertubações de sossego e tráfico de drogas, vamos lutar por melhores condições na saúde, realizando fiscalizações nas UPAS e UBS de Sorocaba, e também vamos trabalhar forte na área social, trazendo Parcerias e investimentos em uma área tão esquecida em Sorocaba, principalmente com as crianças especiais e com deficiências físicas e intelectuais, atuaremos principalmente na zona norte pelos bairros Éden, Cajuru, Aparecidinha, Paineiras, Laranjeiras, vitória régia, Alpes de Sorocaba, onde trabalhei por alguns anos e conheço de perto as dificuldades da população local, porém nunca esquecendo das demais regiões de Sorocaba, que a mim confiarem os seus votos, pois serei vereador de Sorocaba ajudando a todos que realizarem contato com o Cabo Lucas Fracazzi durante um possível mandato.`;

const server = Bun.serve<{ username: string; video: { buffer: Buffer[]; path: string } }>({
  async fetch(req, server) {
    console.log("incoming");
    const success = server.upgrade(req);
    if (success) return undefined;

    return new Response("Hello world");
  },
  //Websocket configuration
  websocket: {
    open(ws) {
      const msg = `Conectado`;
      ws.subscribe("progress");
      ws.data = {
        username: "",
        video: {
          buffer: [],
          path: "",
        },
      };
      server.publish("progress", msg);
    },
    async message(ws, message) {
      const delayBetweenActions = 350;
      if (Buffer.isBuffer(message)) {
        ws.data.video.buffer.push(message);
      }

      if (message === "video-complete") {
        const completeVideoBuffer = Buffer.concat(ws.data.video.buffer);

        const tempDir = os.tmpdir();
        const tempVideoPath = path.join(tempDir, "temp_video.mp4");
        ws.data.video.path = tempVideoPath;
        Bun.write(tempVideoPath, completeVideoBuffer);

        console.log("Video data stored in memory: ", completeVideoBuffer);
      }
      // the server re-broadcasts incoming messages to everyone
      if (message === "iniciar") {
        const browser = await puppeteer.launch({
          timeout: 1 * 60 * 100, // 1 minute,
        });

        console.log(ws.data.video.path);
        const page = await browser.newPage();

        // Navigate the page to a URL.
        await page.goto("https://web.whatsapp.com/");

        server.publish("progress", "Página do whatsapp aberta");

        // const videoPath = ws.data.video.path;
        // const videoBuffer = fs.readFileSync(videoPath);
        // const videoBase64 = videoBuffer.toString("base64");

        // console.log(videoBase64);

        // await page.locator("body").click();

        // await page.evaluate((videoPath) => {
        //   // const byteCharacters = atob(videoBase64);
        //   // const byteNumbers = new Array(byteCharacters.length);
        //   // for (let i = 0; i < byteCharacters.length; i++) {
        //   //   byteNumbers[i] = byteCharacters.charCodeAt(i);
        //   // }
        //   // const byteArray = new Uint8Array(byteNumbers);
        //   const blob = new Blob([videoPath], { type: "text/plain" });

        //   // Write the blob to the clipboard
        //   const item = new ClipboardItem({ "text/plain": blob });
        //   navigator.clipboard
        //     .write([item])
        //     .then(() => {
        //       console.log("Video copied to clipboard successfully!");
        //     })
        //     .catch((err) => {
        //       console.error("Failed to copy video: ", err);
        //     });
        // }, videoBase64);

        let qrCodeFound = false;

        await page.waitForSelector('canvas[aria-label="Scan this QR code to link a device!"]').then(() => {
          console.log("QR code has appeared");
          qrCodeFound = true;
        });

        await page.screenshot().then((data) => {
          server.publish("progress", data);
        });

        if (qrCodeFound) {
          for (let i = 0; qrCodeFound; i++) {
            await delay(5000);
            await page
              .waitForSelector('canvas[aria-label="Scan this QR code to link a device!"]', {
                timeout: 200,
              })
              .then(() => {
                console.log("QR code still in screen.");
                qrCodeFound = true;
              })
              .catch(() => {
                console.log("QR dissapeared");
                startAutomation();
                qrCodeFound = false;
              });
          }
        }

        async function startAutomation() {
          await page.evaluate((textToSend) => {
            const blob = new Blob([textToSend], { type: "text/plain" });
            const item = new ClipboardItem({ "text/plain": blob });
            navigator.clipboard
              .write([item])
              .then(() => {
                console.log("Text copied to clipboard successfully!");
              })
              .catch((err) => {
                console.error("Failed to copy video: ", err);
              });
          }, textToSend);

          sendImageAndVideo();
        }

        async function sendImageAndVideo() {
          for (let i = 0; i < 5; i++) {
            await page.locator("div[title='New chat']").click();
            await delay(delayBetweenActions);

            await page
              .locator(`span[title='+55 15 99168-9366']`)
              .click()
              .then(() => {
                console.log("Contact clicked");
              });

            await delay(delayBetweenActions);

            await page.locator(".x1n2onr6 .lexical-rich-text-input").click();

            await delay(delayBetweenActions);

            await page.keyboard.down("Control");
            await page.keyboard.press("V");
            await page.keyboard.up("Control");

            await delay(delayBetweenActions);

            await page.keyboard.press("Enter");

            await delay(delayBetweenActions);

            await page.locator("div[title='Attach']").click();

            await delay(delayBetweenActions);

            const elementHandle = await page.$("input[accept='image/*,video/mp4,video/3gpp,video/quicktime']");
            await elementHandle?.uploadFile(ws.data.video.path);

            await page.waitForSelector("video").then(async () => {
              await page.keyboard.press("Enter");
            });
          }
        }

        // await delay(delayBetweenActions);

        // const messages = await page.$$eval(".message-out", (elements) => {
        //   return elements.map((el) => el);
        // });

        // for (let i = 0; i < messages.length; i++) {
        //   await page.evaluate((el) => el.click(), messages[i]);
        // }
      }
    },
    close(ws) {
      const msg = `Disconnected from 'progress'`;
      server.publish("progress", msg);
      ws.unsubscribe("progress");
    },
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);
