import { Server } from "socket.io";
import { createPartyToken, verifyToken } from "./sessionManager";
import { randomUUID } from "node:crypto";
import { getUsernameFromToken } from "./utilFunctions";

class Member {
  constructor(username, key, joinToken, host) {
    this.username = username;
    this.key = key;
    this.joinToken = joinToken;
    this.host = host;

    verifyToken(this.joinToken).then((payload) => {
      if (payload === false) {
        throw new Error("Invalid join token");
      }
      if (payload.authorizedFor !== this.username) {
        throw new Error("Join token not authorized for this user");
      }
    });
  }

  get key() {
    return this.key;
  }

  get username() {
    return this.username;
  }

  get isHost() {
    return this.host;
  }
}

class Party {
  constructor(members) {
    this.members = members;
    this.partyId = randomUUID();
    valkey.set(this.partyId, this);
  }

  get members() {
    return this.members;
  }
}

const parties = io.of("/").adapter.rooms;

export async function startMultiplayer(express, app) {
  console.log("Initalizing multiplayer");

  const valkey = new Valkey();
  console.log("Valkey started");

  console.log("Generating server key (this may take a while)");
  // The server's key is only relevant to clients for as long as they're in a party (which they won't be if the server is down)
  const serverKey = await crypto.subtle.generateKey(
    { algorithm: "Ed25519" },
    false,
    ["sign"]
  );
  console.log("Server key done");

  const io = new Server(server);

  io.on("connection", (socket) => {
    console.log("New JohnConnect client");
    socket.send("_jc.server.introduction", serverKey);
    socket.on("_jc.party.create", (authToken, publicKey) => {
      const user = getUsernameFromToken(authToken);
      if (user == undefined) {
        return socket.send("_jc.server.error.user.auth");
      }
      const newParty = createParty(user, publicKey);
      socket.send("_jc.server.party.updated", newParty);

    });
    socket.join()


  });
}

export async function joinParty() {}

export async function createParty(username, key) {
  const party = new Party([new Member(username, key)]);
  return [party, createPartyToken(username, party.partyId)];
}
