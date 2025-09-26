import express from "express";
import { checkSchema, validationResult, matchedData } from "express-validator";
import { createServer } from "node:http";
import { createUser, database, deleteUser, userExists } from "./database.js";
import argon2 from "argon2";
import {
  authValidation,
  protectedRoute,
  getUsernameFromToken,
  saveRoute,
} from "./utilFunctions.js";
import { startSession } from "./sessionManager.js";
import { exit } from "node:process";
import { rateLimit } from "express-rate-limit";

console.log("Starting JohnConnect");

const app = express();
app.disable("x-powered-by");

// Realistically this could be much lower, average client should make only like 3 requests per game session
// And then some more depending on how often the game saves data
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 50,
  standardHeaders: "draft-8",
  ipv6Subnet: 48,
  handler: (_, res) => {
    return res.status(429).send({ message: "Rate limit exceeded" });
  },
});

app.use(express.json({ limit: "5kb" }));
app.use(limiter);
// Reject invalid JSON with an error message instead of spitting the client our entire traceback
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error("Bad JSON format:", err.message);
    return res
      .status(400)
      .json({ message: "Invalid JSON format in request body" });
  }
  next(err);
});

// Middleware to reject requests that fail validation
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({
      errors: errors.errors,
    });
  } else {
    return next();
  }
}

const server = createServer(app);

app.get("/", (req, res) => {
  res.send("JohnConnect v1.0.0");
});

app.post(
  "/api/v1/account/register",
  [checkSchema(authValidation), validate],
  async (req, res) => {
    // Reject this request if we're not configured for open registration
    if (process.env.REGISTRATION_MODE !== "OPEN") {
      return res
        .status(403)
        .send({ message: "Server is not accepting registrations" });
    }

    const { username, password } = req.body;
    // Check if this username already exists
    const { exists, err } = await userExists(username)
      .then((exists) => {
        return { exists, undefined };
      })
      .catch((err) => {
        console.error(err);
        return { undefined, err };
      });

    if (err !== undefined) {
      return res.status(500).send({ message: "Internal server error" });
    }
    if (exists !== undefined) {
      return res.status(400).send({ message: "Username in use" });
    }

    // Create the new user
    await createUser(username, password).catch((err) => {
      console.error(err);
      return res.status(500).send({ message: "Internal server error" });
    });

    // At this point the user should be properly registered in the database, and we can safely grant a token
    const token = startSession(username);
    return res.send({ message: "Authorized", token: token });
  }
);

app.post(
  "/api/v1/account/login",
  [checkSchema(authValidation), validate],
  async (req, res) => {
    const { username, password } = req.body;

    // Check if this user even exists before we compute hashes
    const { user, err } = await userExists(username)
      .then((user) => {
        return { user, undefined };
      })
      .catch((err) => {
        console.error(err);
        return { undefined, err };
      });

    if (err !== undefined) {
      return res.status(500).send({ message: "Internal server error" });
    }
    if (user === undefined) {
      return res
        .status(401)
        .send({ message: "Invalid username and/or password" });
    }

    // Verify password
    try {
      const match = await argon2.verify(user.password, password);
      if (match) {
        // Login success
        return res.send({
          message: "Authorized",
          token: startSession(username),
        });
      } else {
        // Password does not match
        return res
          .status(401)
          .send({ message: "Invalid username and/or password" });
      }
    } catch (verifyError) {
      // Something's turbo fucked
      console.error(verifyError);
      return res.status(500).send({ message: "Internal server error" });
    }
  }
);

app.delete(
  "/api/v1/account",
  [checkSchema(protectedRoute), validate],
  async (req, res) => {
    const user = getUsernameFromToken(req);
    await deleteUser(user)
      .then(() => {
        return res.send({ message: "Account closed successfully. Goodbye!" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).send({ message: "Internal server error" });
      });
  }
);

app.get(
  "/api/v1/saveData",
  [checkSchema(protectedRoute), validate],
  (req, res) => {
    const user = getUsernameFromToken(req);
    const saveData = database.prepare(
      "SELECT savedata FROM users WHERE username = (?)"
    );
    saveData.get(user, (err, save) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: "Internal server error" });
      }
      return res.send({ message: "Found", saveData: save });
    });
  }
);

app.post(
  "/api/v1/saveData",
  [checkSchema(protectedRoute), checkSchema(saveRoute), validate],
  (req, res) => {
    const user = getUsernameFromToken(req);
    const saveData = database.prepare(
      "UPDATE users SET savedata = (?) WHERE username = (?)"
    );
    saveData.run(JSON.stringify(matchedData(req).saveData), user, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: "Internal server error" });
      }
      return res.send({ message: "Data saved" });
    });
  }
);

process.on("SIGTERM", () => {
  console.log("Shutting down JohnConnect");
  database.close();
  server.close((err) => {
    if (err) {
      console.error("Error while shutting down express");
      console.error(err);
      exit(3);
    }
  });
});

process.on("SIGINT", () => {
  console.log("Shutting down JohnConnect");
  database.close();
  exit(0);
});

server.listen(process.env.PORT, process.env.BIND_ADDRESS, () => {
  console.log(
    `Server listening on ${process.env.BIND_ADDRESS}, port ${process.env.PORT}`
  );
});
