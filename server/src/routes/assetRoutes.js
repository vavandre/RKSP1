import { Router } from "express";
import { query } from "../db.js";
import { authorize } from "../middleware/auth.js";
import { createAssetSchema, updateAssetSchema } from "../validation/schemas.js";

const router = Router();

router.get("/", authorize("admin", "engineer", "viewer"), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT a.*, u.full_name AS owner_name
       FROM assets a
       LEFT JOIN users u ON u.id = a.owner_id
       ORDER BY a.id DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
});

router.post("/", authorize("admin", "engineer"), async (req, res, next) => {
  try {
    const payload = createAssetSchema.parse(req.body);
    const insertResult = await query(
      `INSERT INTO assets (name, type, status, location, owner_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [payload.name, payload.type, payload.status, payload.location, payload.owner_id ?? null]
    );
    const createdId = insertResult.rows[0].id;
    const createdResult = await query("SELECT * FROM assets WHERE id = $1", [createdId]);
    const created = createdResult.rows[0];
    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
});

router.put("/:id", authorize("admin", "engineer"), async (req, res, next) => {
  try {
    const payload = updateAssetSchema.parse(req.body);
    const id = Number(req.params.id);
    const currentResult = await query("SELECT * FROM assets WHERE id = $1", [id]);
    const current = currentResult.rows[0];
    if (!current) {
      return res.status(404).json({ message: "Asset не найден" });
    }

    const updated = {
      ...current,
      ...payload,
      owner_id: payload.owner_id === undefined ? current.owner_id : payload.owner_id
    };

    await query(
      `UPDATE assets
       SET name = $1, type = $2, status = $3, location = $4, owner_id = $5, updated_at = NOW()
       WHERE id = $6`,
      [updated.name, updated.type, updated.status, updated.location, updated.owner_id, id]
    );

    const updatedResult = await query("SELECT * FROM assets WHERE id = $1", [id]);
    return res.json(updatedResult.rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", authorize("admin"), async (req, res, next) => {
  const id = Number(req.params.id);
  try {
    const result = await query("DELETE FROM assets WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Asset не найден" });
    }
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
