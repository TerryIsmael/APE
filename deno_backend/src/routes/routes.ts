import { Router, send } from "../deps.ts";
import * as userController from "../controllers/userController.ts";

const router = new Router();
const root = `${Deno.cwd()}`.substring(0,`${Deno.cwd()}`.lastIndexOf("\\"))

router.get("/", async (ctx) => {
  await send(ctx, ctx.request.url.pathname, {
    root: `${root.toString()}/static`,
    index: "index.html",
  });
});

router
  .get("/users", userController.getUsers)
  .post("/users", userController.createUser)
  .get("/users/:id", userController.getUser)
  .put("/users/:id", userController.updateUser)
  .delete("/users/:id", userController.deleteUser);

export default router;