import express from "express";

const app = express();
const port = process.env.PORT || 3001;

app.get("/api/start-automation", (_, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
