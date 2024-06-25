import { wsServer } from './src/config/websocket.ts';
import app from './app.ts'

const serverPort: number = app.get('serverPort');

const server = app.listen(serverPort, () => {
  console.log(`Servidor iniciado en el puerto ${serverPort}`);
});

server.on('upgrade', (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, (ws) => {
    wsServer.emit('connection', ws, request);
  });
});

export default server;