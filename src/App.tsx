import React from "react";

import "./App.css";

function App() {
  const [imageFromServer, setImageFromServer] = React.useState<string | null>(null);
  const [progressMessage, setProgressMessage] = React.useState<string>("Não iniciado.");
  const [webSocket, setWebSocket] = React.useState<WebSocket | null>(null);
  const [videoFile, setVideoFile] = React.useState<Blob | null>(null);

  React.useEffect(() => {
    console.log("connecting to web socket");
    const socket = new WebSocket("ws://localhost:3000");

    setWebSocket(socket);

    socket.onmessage = (event) => {
      console.log(event.data);
      if (event.data.constructor.name === "Blob") {
        console.log("IMAGE?");
        setImageFromServer(URL.createObjectURL(event.data));
        setProgressMessage("Scanei o QRcode abaixo");
        return;
      }

      setImageFromServer(null);
      setProgressMessage(event.data);
    };

    socket.onopen = (event) => {
      console.log(event);
    };

    socket.onerror = (event) => {
      console.log(event);
    };
  }, []);

  const displayImage = imageFromServer ? <img src={imageFromServer} /> : <span>No image yet</span>;

  function handleStartProcess() {
    webSocket?.send("iniciar");
  }
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    console.log(videoFile);

    const videoData: ArrayBuffer[] = [];

    if (videoFile) {
      const chunkSize = 1024 * 64;
      let offset = 0;

      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result !== "string") {
          webSocket?.send(e.target.result);
          videoData.push(e.target.result);
          offset += chunkSize;
          if (offset < videoFile.size) {
            readNextChunk();
          } else {
            webSocket?.send("video-complete");
          }
        }
      };

      const readNextChunk = () => {
        const slice = videoFile.slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(slice); // Read as binary data
      };

      readNextChunk();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files === null) return;

    setVideoFile(e.target.files[0]);
  }

  return (
    <>
      <button onClick={handleStartProcess}>Iniciar</button>
      <h1>{progressMessage}</h1>

      <form onSubmit={handleSubmit}>
        <input type="file" accept="video/*" onChange={handleFileChange} />
        <button type="submit">Upload Video</button>
      </form>

      {displayImage}
    </>
  );
}

export default App;
