import { Router } from "express";
import { query } from "../db.js";
import { authorize } from "../middleware/auth.js";
import { createTicketSchema, updateTicketSchema } from "../validation/schemas.js";

const router = Router();

router.get("/", authorize("admin", "engineer", "viewer"), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT t.*, a.name AS asset_name, u.full_name AS assignee_name
       FROM tickets t
       LEFT JOIN assets a ON a.id = t.asset_id
       LEFT JOIN users u ON u.id = t.assignee_id
       ORDER BY t.id DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
});

router.post("/", authorize("admin", "engineer"), async (req, res, next) => {
  try {
    const payload = createTicketSchema.parse(req.body);
    const insertResult = await query(
      `INSERT INTO tickets (title, description, priority, status, asset_id, assignee_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        payload.title,
        payload.description,
        payload.priority,
        payload.status,
        payload.asset_id,
        payload.assignee_id ?? null,
        req.user.sub
      ]
    );
    const createdId = insertResult.rows[0].id;
    const createdResult = await query("SELECT * FROM tickets WHERE id = $1", [createdId]);
    return res.status(201).json(createdResult.rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.put("/:id", authorize("admin", "engineer"), async (req, res, next) => {
  try {
    const payload = updateTicketSchema.parse(req.body);
    const id = Number(req.params.id);
    const currentResult = await query("SELECT * FROM tickets WHERE id = $1", [id]);
    const current = currentResult.rows[0];
    if (!current) {
      return res.status(404).json({ message: "Ticket не найден" });
    }

    const updated = {
      ...current,
      ...payload,
      assignee_id: payload.assignee_id === undefined ? current.assignee_id : payload.assignee_id
    };

    await query(
      `UPDATE tickets
       SET title = $1, description = $2, priority = $3, status = $4,
           asset_id = $5, assignee_id = $6, updated_at = NOW()
       WHERE id = $7`,
      [updated.title, updated.description, updated.priority, updated.status, updated.asset_id, updated.assignee_id, id]
    );

    const updatedResult = await query("SELECT * FROM tickets WHERE id = $1", [id]);
    return res.json(updatedResult.rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", authorize("admin"), async (req, res, next) => {
  const id = Number(req.params.id);
  try {
    const result = await query("DELETE FROM tickets WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Ticket не найден" });
    }
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
