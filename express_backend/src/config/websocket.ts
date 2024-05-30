import WebSocket from 'ws';

const connectionsByWorkspace: Map<string, WebSocket[]> = new Map();

const wsServer = new WebSocket.Server({ noServer: true });

wsServer.on('connection', (ws) => {

  let workspaceId: string | undefined;

  ws.on('message', (message) => {  
    const parsedMessage = JSON.parse(message.toString());
    if (parsedMessage.type === 'workspaceIdentification') {
      workspaceId = parsedMessage.workspaceId;
      if (!workspaceId) {
        return;
      }
      if (!connectionsByWorkspace.has(workspaceId)) {
        connectionsByWorkspace.set(workspaceId, []);
      }
      connectionsByWorkspace.get(workspaceId)?.push(ws);
    } else {
      // Aquí puedes manejar otros tipos de mensajes
    }
  });

  ws.on('close', () => {
    console.log('Cliente WebSocket desconectado');
    if (workspaceId && connectionsByWorkspace.has(workspaceId)) {
      const workspaceConnections = connectionsByWorkspace.get(workspaceId);
      if (!workspaceConnections) {
        return;
      }
      const index = workspaceConnections.indexOf(ws);
      if (index !== -1) {
        workspaceConnections?.splice(index, 1);
        if (workspaceConnections.length === 0) {
          connectionsByWorkspace.delete(workspaceId);
        }
      }
    }
  });
});

function sendMessageToWorkspace(workspaceId: string, message: any) {
  const workspaceConnections = connectionsByWorkspace.get(workspaceId);
  if (workspaceConnections) {
    for (const ws of workspaceConnections) {
      ws.send(JSON.stringify(message));
    }
  }
}

export { wsServer, sendMessageToWorkspace };
