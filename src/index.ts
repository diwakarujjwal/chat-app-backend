import { WebSocket, WebSocketServer } from "ws";
const Rooms = new Map();
const wss = new WebSocketServer({
  port: 8080,
});

wss.on("error", console.error);

wss.on("connection", (socket: WebSocket) => {
  socket.on("message", (data) => {
    const parsed = JSON.parse(data.toString());
    switch (parsed.type) {
      case "create": {
        handleCreateRoom(socket);
        break;
      }
      case "join": {
        handleJoinRoom(socket, parsed.payload.roomId, parsed.payload.username);
        break;
      }
      case "message": {
        handleMessage(parsed.payload.message, parsed.payload.roomId, socket);
        break;
      }
    }
  });
  socket.on("close", () => {
    for (const [roomId, users] of Rooms) {
      const idx = users.indexOf(socket);
      if (idx !== -1) {
        users.splice(idx, 1);

        const username = (socket as any).username;

        users.forEach((user:WebSocket) => {
          if (user.readyState === WebSocket.OPEN) {
            user.send(
              JSON.stringify({
                type: "userLeft",
                payload: { username },
              })
            );
          }
        });

        if (users.length === 0) {
          Rooms.delete(roomId);
        }
        break;
      }
    }
  });
});

wss.on("listening", () => {
  console.log("Websocket is Listening on Port 8080");
});

// function broadcast(msg: string, sender: WebSocket | null) {
//   console.log(msg);
//   wss.clients.forEach(function each(client) {
//     if (
//       (sender === null || client !== sender) &&
//       client.readyState === WebSocket.OPEN
//     ) {
//       client.send(msg);
//     }
//   });
// }

function handleCreateRoom(socket: WebSocket) {
  const generatedRoomId = generateRoomId();
  Rooms.set(generatedRoomId, [socket]);
  socket.send(
    JSON.stringify({
      type: "createdRoom",
      payload: {
        roomId: generatedRoomId,
      },
    })
  );
}

function handleJoinRoom(socket: WebSocket, roomId: string, username: string) {
  if (Rooms.has(roomId)) {
    const users = Rooms.get(roomId);
    (socket as any).username = username;

    users.push(socket);

    socket.send(
      JSON.stringify({
        type: "joinedRoom",
        payload: { roomId, username },
      })
    );

    users.forEach((user: WebSocket) => {
      if (user !== socket && user.readyState === WebSocket.OPEN) {
        user.send(
          JSON.stringify({
            type: "userJoined",
            payload: { username },
          })
        );
      }
    });
  } else {
    socket.send(
      JSON.stringify({
        type: "error",
        payload: {
          errorMessage: "Room doesn't exist. Create a new Room instead.",
        },
      })
    );
  }
}

function handleMessage(message: string, roomId: string, sender: WebSocket) {
  if (!message || !Rooms.has(roomId)) {
    return;
  }
  let UsersInRoom = Rooms.get(roomId);
  if (!UsersInRoom) {
    return;
  }
  UsersInRoom.forEach((user: WebSocket) => {
    if (user != sender && user.readyState === WebSocket.OPEN) {
      user.send(
        JSON.stringify({
          type: "message",
          payload: {
            message,
          },
        })
      );
    }
  });
}

function generateRoomId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
