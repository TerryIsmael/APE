import WebSocket from 'ws';

const usersByWorkspace: Map<string, string[]> = new Map();
const connectionByUser: Map<string, WebSocket> = new Map();

const wsServer = new WebSocket.Server({ noServer: true });

wsServer.on('connection', (ws) => {

  ws.on('message', (message) => {
    const parsedMessage = JSON.parse(message.toString());
    if (parsedMessage.type === 'workspaceIdentification') {
      const workspaceId = parsedMessage.workspaceId;
      const userId = parsedMessage.userId;
      if (!workspaceId || !userId) {
        ws.close();
        return;
      }
      if (!usersByWorkspace.has(workspaceId)) {
        usersByWorkspace.set(workspaceId, []);
      }

      usersByWorkspace.forEach((users, _) => {
        const index = users.indexOf(userId);
        if (index !== -1) {
          users.splice(index, 1);
        }
      });

      usersByWorkspace.get(workspaceId)?.push(userId);

     if (!connectionByUser.has(userId)) {
        connectionByUser.set(userId, ws);
      } else {
        if (connectionByUser.get(userId) !== ws) {
          connectionByUser.get(userId)?.close();
          connectionByUser.set(userId, ws);
        }
      }
    }
  });

  ws.on('close', () => {
    const userId = [...connectionByUser.entries()].find(([_, socket]) => socket === ws)?.[0];
    if (userId) {
      const workspaceEntry = [...usersByWorkspace.entries()].find(([_, users]) => users.includes(userId));
      if (workspaceEntry) {
        const [_, users] = workspaceEntry;
        const index = users.indexOf(userId);
        if (index !== -1) {
          users.splice(index, 1);
        }
      }
      connectionByUser.delete(userId);
    }
  });
});

function sendMessageToWorkspace(workspaceId: string, message: any) {
  const workspaceUsers = usersByWorkspace.get(workspaceId);
  if (workspaceUsers && workspaceUsers.length > 0) {
    const workspaceConnections = workspaceUsers.map(userId => connectionByUser.get(userId)).filter(Boolean) as WebSocket[];
    for (const ws of workspaceConnections) {
      ws.send(JSON.stringify(message));
    }
  }
}

function sendMessageToUsers(users: string[], message: any) {
  const conns = users.map((userId: string) => connectionByUser.get(userId)) as WebSocket[];
  for (const ws of conns) {
    ws?.send(JSON.stringify(message));
  }
}

function sendMessageToUser(userId: string, message: any) {
  const ws = connectionByUser.get(userId);
  ws?.send(JSON.stringify(message));
}

export { wsServer, sendMessageToWorkspace, sendMessageToUsers, sendMessageToUser };
