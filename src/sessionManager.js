import jwt from "jsonwebtoken";
import { userExists } from "./database.js";

const jwtSigningKey = process.env.JWT_SIGNING_KEY;

export function startSession(username) {
  const sessionToken = jwt.sign({ authorizedFor: username }, jwtSigningKey, {
    expiresIn: process.env.JWT_EXPIRY_TIME,
  });
  return sessionToken;
}

export async function verifyToken(token) {
  // *RECIEVES TOKEN*
  var payload;
  try {
    // *VERIFIES IT*
    payload = jwt.verify(token, jwtSigningKey, { algorithms: ['HS256'] });
  } catch (err) {
    // Invalid signature
    return false;
  }
  if (payload.authorizedFor) {
    // *CHECKS FOR THE USER*
    const { exists, err } = await userExists(username)
      .then((exists) => {
          return [ exists, undefined ]
        })
      .catch((err) => {
        console.error(err);
        return [ undefined, err ]
      });
    console.log(exists);
    if (err !== undefined) {
      console.error("Database error while verifying token");
      console.error(err);
      return false;
    }
    if (exists !== undefined) {
      // *AUTHENTICATES THEM*
      // *W JOHNCONNECT* ❤
      return payload;
    } else {
      console.log(
        `Recieved an authentic token for user "${payload.authorizedFor}", but they do not exist in the database!`
      );
      return false; // User does not exist in the database
    }
  } else {
    console.warn("Provided JWT is authentic, but authorizedFor is invalid or missing!");
    return false;
  }
}

export function createPartyToken(username, partyId) {
  const partyToken = jwt.sign({ memberAuth: username, partyId: partyId }, jwtSigningKey, {
    expiresIn: process.env.JWT_EXPIRY_TIME,
  });
  return partyToken;
}