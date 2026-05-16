import { Router } from "express";
import { db } from "../db.js";
import { authorize } from "../middleware/auth.js";
import { createAssetSchema, updateAssetSchema } from "../validation/schemas.js";

const router = Router();

router.get("/", authorize("admin", "engineer", "viewer"), (req, res) => {
  const assets = db
    .prepare(
      `SELECT a.*, u.full_name as owner_name
       FROM assets a
       LEFT JOIN users u ON u.id = a.owner_id
       ORDER BY a.id DESC`
    )
    .all();
  res.json(assets);
});

router.post("/", authorize("admin", "engineer"), (req, res, next) => {
  try {
    const payload = createAssetSchema.parse(req.body);
    const result = db
      .prepare(
        "INSERT INTO assets (name, type, status, location, owner_id) VALUES (@name, @type, @status, @location, @owner_id)"
      )
      .run({
        ...payload,
        owner_id: payload.owner_id ?? null
      });
    const created = db.prepare("SELECT * FROM assets WHERE id = ?").get(result.lastInsertRowid);
    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
});

router.put("/:id", authorize("admin", "engineer"), (req, res, next) => {
  try {
    const payload = updateAssetSchema.parse(req.body);
    const id = Number(req.params.id);
    const current = db.prepare("SELECT * FROM assets WHERE id = ?").get(id);
    if (!current) {
      return res.status(404).json({ message: "Asset не найден" });
    }

    const updated = {
      ...current,
      ...payload,
      owner_id: payload.owner_id === undefined ? current.owner_id : payload.owner_id
    };

    db.prepare(
      `UPDATE assets
       SET name = @name, type = @type, status = @status, location = @location, owner_id = @owner_id, updated_at = CURRENT_TIMESTAMP
       WHERE id = @id`
    ).run({ ...updated, id });

    return res.json(db.prepare("SELECT * FROM assets WHERE id = ?").get(id));
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", authorize("admin"), (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare("DELETE FROM assets WHERE id = ?").run(id);
  if (result.changes === 0) {
    return res.status(404).json({ message: "Asset не найден" });
  }
  return res.status(204).send();
});

export default router;
