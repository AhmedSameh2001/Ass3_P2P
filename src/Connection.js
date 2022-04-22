const WS = require("ws");
const server = new WS.Server({ port: 4000 });
server.on("connection", async (socket, req)=>{})

const socket = new WS();
socket.on("open", ()=>{

})
socket.on("close", ()=>{

})
socket.on("message", message=>{

})