import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const users = {}; // Store connected users


io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on("register", (userId) => {
    // Store the userId and socket ID in the users object
    users[userId] = socket.id;
    console.log("Users after registration:", users);
  });

  socket.on("sendMessage", ({ sender,senderName, receiver, message }) => {
    const receiverSocket = users[receiver];
    console.log("Receiver socket ID:", receiverSocket);

    if (receiverSocket) {
      console.log("✅ Sending notification...", senderName, receiver, message);
      io.to(receiverSocket).emit("notification", {
        senderName,
        message,
        type: "dm",
      });
    } else {
      console.log("❌ Receiver not found or not connected.");
    }
  });

  socket.on("sendGroupMessage", ({ sender, senderName, groupName, members, message }) => {
    console.log(`Group Message from ${senderName} to Group ${groupName}`);
  
    members.forEach((memberId) => {
      if (memberId !== sender) {
        const memberSocket = users[memberId];
        if (memberSocket) {
          io.to(memberSocket).emit("notification", {
            senderName,
            message,
            groupName,
            type: "group",
          });
        }
      }
    });
  });
  
  socket.on("typing", ({ chatType, sender, receiver, groupId, members }) => {
    console.log(chatType, sender, receiver, groupId, members);
  
    if (chatType === "dm") {
      const receiverSocket = users[receiver];
      if (receiverSocket) {
        io.to(receiverSocket).emit("typing", { sender });
      }
    } else if (chatType === "group") {
      if (!members || members.length === 0) {
        console.log("No members found for group:", groupId);
        return;
      }
  
      members.forEach((memberId) => {
        if (memberId !== sender) {
          const memberSocket = users[memberId];
          if (memberSocket) {
            io.to(memberSocket).emit("typing", { sender, groupId });
          } else {
            console.log(`Member ${memberId} is not connected`);
          }
        }
      });
    }
  });
  
  socket.on("stopTyping", ({ chatType, receiver, groupId, members,sender }) => {
    if (chatType === "dm") {
      const receiverSocket = users[receiver];
      if (receiverSocket) {
        io.to(receiverSocket).emit("stopTyping");
      }
    } else if (chatType === "group") {
      if (!members || members.length === 0) {
        console.log("No members found for group:", groupId);
        return;
      }
  
      members.forEach((memberId) => {
        if (memberId !== sender) {
          const memberSocket = users[memberId];
          if (memberSocket) {
            io.to(memberSocket).emit("stopTyping");
          }
        }
      });
    }
  });
  
  
  socket.on("disconnect", () => { 
    console.log(`User disconnected: ${socket.id}`);
    Object.keys(users).forEach((key) => {
      if (users[key] === socket.id) delete users[key];
    });
    console.log("Users after disconnection:", users);
  });
});

server.listen(4000, () => console.log("WebSocket Server Running on port 4000"));
