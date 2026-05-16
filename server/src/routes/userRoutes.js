import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { authorize } from "../middleware/auth.js";
import { createUserSchema } from "../validation/schemas.js";

const router = Router();

router.get("/", authorize("admin"), (req, res) => {
  const users = db
    .prepare("SELECT id, username, full_name, role, created_at FROM users ORDER BY id DESC")
    .all();
  res.json(users);
});

router.post("/", authorize("admin"), (req, res, next) => {
  try {
    const payload = createUserSchema.parse(req.body);
    const result = db
      .prepare(
        "INSERT INTO users (username, full_name, password_hash, role) VALUES (@username, @full_name, @password_hash, @role)"
      )
      .run({
        ...payload,
        password_hash: bcrypt.hashSync(payload.password, 10)
      });

    const created = db
      .prepare("SELECT id, username, full_name, role, created_at FROM users WHERE id = ?")
      .get(result.lastInsertRowid);
    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
});

export default router;
