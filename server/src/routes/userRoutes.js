import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { authorize } from "../middleware/auth.js";
import { createUserSchema } from "../validation/schemas.js";

const router = Router();

router.get("/", authorize("admin"), async (req, res, next) => {
  try {
    const result = await query("SELECT id, username, full_name, role, created_at FROM users ORDER BY id DESC");
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
});

router.post("/", authorize("admin"), async (req, res, next) => {
  try {
    const payload = createUserSchema.parse(req.body);
    const insertResult = await query(
      `INSERT INTO users (username, full_name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [payload.username, payload.full_name, bcrypt.hashSync(payload.password, 10), payload.role]
    );
    const createdId = insertResult.rows[0].id;
    const createdResult = await query(
      "SELECT id, username, full_name, role, created_at FROM users WHERE id = $1",
      [createdId]
    );
    const created = createdResult.rows[0];
    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
});

export default router;
