import { Application } from "./deps.ts";
import router from "./routes/routes.ts";
import connectDB from "./utils/connectDB.ts"; 
const app = new Application();

export const client = await connectDB();
app.use(router.routes());
app.use(router.allowedMethods());
console.log("Server running on port 8000");
await app.listen({ port: 8000 });

