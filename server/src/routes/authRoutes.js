import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db.js";
import { config } from "../config.js";
import { loginSchema } from "../validation/schemas.js";

const router = Router();

router.post("/login", (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = db
      .prepare("SELECT id, username, full_name, role, password_hash FROM users WHERE username = ?")
      .get(payload.username);

    if (!user || !bcrypt.compareSync(payload.password, user.password_hash)) {
      return res.status(401).json({ message: "Неверный логин или пароль" });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      },
      config.jwtSecret,
      { expiresIn: "8h" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
