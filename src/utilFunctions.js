import { matchedData } from "express-validator";
import { verifyToken } from "./sessionManager.js";

export function getUsernameFromToken(req) {
  const value = matchedData(req).authorization;
  const payload = verifyToken(value.replace(/^Bearer\s/, ""));
  if (payload.authorizedFor === undefined) {
    return undefined;
  } else {
    return payload.authorizedFor;
  }
}

export const authValidation = {
  username: {
    errorMessage: "Invalid username",
    notEmpty: true,
    isLength: {
      options: {
        min: 1,
        max: 20,
      },
      errorMessage: "Username must be between 1 and 20 characters",
    },
  },
  password: {
    errorMessage: "Invalid password",
    notEmpty: true,
    isLength: {
      options: {
        min: 8,
        max: 128,
      },
      errorMessage: "Password must be between 8 and 128 characters",
    },
  },
};

export const protectedRoute = {
  authorization: {
    in: ["headers"],
    exists: {
      errorMessage: "Authorization header is required.",
      bail: true,
    },
    matches: {
      options: /^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$/,
      errorMessage: "Authorization header must be a valid Bearer token.",
      bail: true,
    },
    custom: {
      options: async (value) => {
        const token = value.replace(/^Bearer\s/, "");
        try {
          if (await verifyToken(token) !== false) {
            return true;
          } else {
            throw new Error("Invalid token");
          }
        } catch (err) {
          throw new Error("Invalid token");
        }
      },
    },
  },
};

export const saveRoute = {
  saveData: {
    errorMessage: "saveData is required.",
    notEmpty: true,
    isLength: {
      options: {
        max: 5000,
      },
      errorMessage: "saveData cannot exceed 5000 characters",
    },
  },
};
