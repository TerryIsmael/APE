import initDB from "./utils/populateDB.ts";

await (initDB());
console.log("Database populated successfully");
