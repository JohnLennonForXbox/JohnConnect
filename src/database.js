import sqlite from "sqlite3";
import argon2 from "argon2";

sqlite.verbose();

export const database = new sqlite.Database("../db.sqlite", (err) => {
  if (err) {
    console.error("Fatal error initalizing database");
    console.error(err);
    exit(1);
  } else {
    // Initalize database
    database.run(
      `
        CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        savedata TEXT,
        CHECK(LENGTH(username) <= 20),
        CHECK(LENGTH(password) <= 128),
        CHECK(LENGTH(savedata) <= 5000));`, // may need to be expanded in the future depending on contents of future save data
      (err) => {
        if (err) console.error(err.message);
      }
    );
    console.log("Database ready");
  }
});

/* 
    Check if a JohnConnect user exists.
    username: string,

    Returns: Promise 
        Resolves to: boolean (on success, if user exists)
*/
export async function userExists(username) {
  return new Promise((resolve, reject) => {
    const stmt = database.prepare(
      "SELECT password FROM users WHERE username = ?"
    );
    stmt.get(username, (err, row) => {
      stmt.finalize();
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/* 
    Create a new JohnConnect user.
    username: string,
    password: string

    Returns: Promise 
        Resolves to: true (on success)
*/
export async function createUser(username, password) {
  const passHash = await argon2.hash(password);

  return new Promise((resolve, reject) => {
    const stmt = database.prepare(
      `INSERT INTO users (username, password) VALUES (?, ?)`
    );
    stmt.run(username, passHash, (err, row) => {
      stmt.finalize();
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
}
/*
    Delete a JohnConnect user.
    Be very careful.
    username: string
    
    Returns: Promise
        Resolves to: true (on success)
*/
export async function deleteUser(username) {
  return new Promise((resolve, reject) => {
    const stmt = database.prepare(`DELETE FROM users WHERE username = (?)`);
    stmt.run(username, (err) => {
      stmt.finalize();
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
}
