import { Router } from "express";
import { db } from "../db.js";
import { authorize } from "../middleware/auth.js";
import { createTicketSchema, updateTicketSchema } from "../validation/schemas.js";

const router = Router();

router.get("/", authorize("admin", "engineer", "viewer"), (req, res) => {
  const tickets = db
    .prepare(
      `SELECT t.*, a.name as asset_name, u.full_name as assignee_name
       FROM tickets t
       LEFT JOIN assets a ON a.id = t.asset_id
       LEFT JOIN users u ON u.id = t.assignee_id
       ORDER BY t.id DESC`
    )
    .all();
  res.json(tickets);
});

router.post("/", authorize("admin", "engineer"), (req, res, next) => {
  try {
    const payload = createTicketSchema.parse(req.body);
    const result = db
      .prepare(
        `INSERT INTO tickets (title, description, priority, status, asset_id, assignee_id, created_by)
         VALUES (@title, @description, @priority, @status, @asset_id, @assignee_id, @created_by)`
      )
      .run({
        ...payload,
        assignee_id: payload.assignee_id ?? null,
        created_by: req.user.sub
      });

    return res.status(201).json(db.prepare("SELECT * FROM tickets WHERE id = ?").get(result.lastInsertRowid));
  } catch (err) {
    return next(err);
  }
});

router.put("/:id", authorize("admin", "engineer"), (req, res, next) => {
  try {
    const payload = updateTicketSchema.parse(req.body);
    const id = Number(req.params.id);
    const current = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);
    if (!current) {
      return res.status(404).json({ message: "Ticket не найден" });
    }

    const updated = {
      ...current,
      ...payload,
      assignee_id: payload.assignee_id === undefined ? current.assignee_id : payload.assignee_id
    };

    db.prepare(
      `UPDATE tickets
       SET title = @title, description = @description, priority = @priority, status = @status,
           asset_id = @asset_id, assignee_id = @assignee_id, updated_at = CURRENT_TIMESTAMP
       WHERE id = @id`
    ).run({ ...updated, id });

    return res.json(db.prepare("SELECT * FROM tickets WHERE id = ?").get(id));
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", authorize("admin"), (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare("DELETE FROM tickets WHERE id = ?").run(id);
  if (result.changes === 0) {
    return res.status(404).json({ message: "Ticket не найден" });
  }
  return res.status(204).send();
});

export default router;
