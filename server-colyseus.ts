// @ts-nocheck
const { createServer } = require("http");
const { Server } = require("colyseus");
const { BasketballRoom } = require("./lib/colyseus/BasketballRoom");

const port = parseInt(process.env.PORT || "8080", 10);

const httpServer = createServer((req, res) => {
  res.writeHead(200);
  res.end("Colyseus Basketball Server running");
});

const gameServer = new Server({ server: httpServer });
gameServer.define("basketball", BasketballRoom);

httpServer.listen(port, "0.0.0.0", () => {
  console.log("Colyseus ready on port " + port);
  console.log("Room: basketball registered");
});
