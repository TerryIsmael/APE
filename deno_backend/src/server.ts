import { Application } from "./deps.ts";
import router from "./routes/routes.ts";
import connectDB from "./utils/connectDB.ts";

const app = new Application();
export const client = await connectDB();
  
app.use(async (ctx, next) => {
    ctx.response.headers.set('Access-Control-Allow-Origin', '*');
    ctx.response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    ctx.response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    await next();
  });

app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server running on port 8000");
console.log("Access to server at http://localhost:8000");
await app.listen({ port: 8000 });

