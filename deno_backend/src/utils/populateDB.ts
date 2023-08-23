import connectDB from "../utils/connectDB.ts";

export default async function initDB(): Promise<void> {
    
    const client = await connectDB();
    const list: void |string[] = await client.listCollectionNames();
    list.includes("users") ? await client.collection("users").drop() : {};
    
    const data = await Deno.readTextFile("../resources/userData.json");
    const jsonData = JSON.parse(data);

    client.collection("users").insertMany(jsonData);
} 