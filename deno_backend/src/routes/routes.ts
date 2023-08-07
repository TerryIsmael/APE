import { Router } from "../deps.ts";
import * as indexCtrl from "../controllers/user.controller.ts";

const router = new Router();

router.get("/", (ctx) => {
    ctx.response.body = "Hola María";
});

router
  .get("/users", indexCtrl.getUsers)
  .post("/users", indexCtrl.createUser)
  .get("/users/:id", indexCtrl.getUser)
  .put("/users/:id", indexCtrl.updateUser)
  .delete("/users/:id", indexCtrl.deleteUser);

export default router;