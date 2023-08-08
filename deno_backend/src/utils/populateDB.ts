import {client} from "../server.ts";

export default async function initDB(): Promise<void> {
    
    const list: void |string[] = await client.listCollectionNames();
    list.includes("users") ? await client.collection("users").drop() : {};
    
    const data = await Deno.readTextFile("../static/resources/userData.json");
    const jsonData = JSON.parse(data);

    client.collection("users").insertMany(jsonData);
} 