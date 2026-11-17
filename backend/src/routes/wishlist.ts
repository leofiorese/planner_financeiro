/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, type Request, type Response } from "express";
import { route, methodNotAllowed, queryParam } from "../http/handlers";
import { getDbConnection } from "../db/connection";

export async function GET(_req: Request, res: Response) {
  try {
    const pool = getDbConnection();
    const [rows] = await pool.query(
      "SELECT * FROM wishlist WHERE is_active = 1 ORDER BY created_at DESC"
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch wishlist" });
  }
}

export async function POST(req: Request, res: Response) {
  try {
    const body = req.body;
    const { name, price, target_date, description, brand, links } = body;

    const link1 = links && links.length > 0 ? links[0] : null;
    const link2 = links && links.length > 1 ? links[1] : null;
    const link3 = links && links.length > 2 ? links[2] : null;

    const pool = getDbConnection();
    const [result] = await pool.query(
      `INSERT INTO wishlist (name, price, target_date, description, brand, link1, link2, link3)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, price, target_date || null, description || null, brand || null, link1, link2, link3]
    );

    return res.json({
      success: true, 
      data: { id: (result as any).insertId, name, price, target_date, description, brand, link1, link2, link3 } 
    });
  } catch (error) {
    console.error("Error creating wishlist item:", error);
    return res.status(500).json({ success: false, error: "Failed to create wishlist item" });
  }
}

export async function PUT(req: Request, res: Response) {
  try {
    const body = req.body;
    const { id, name, price, target_date, description, brand, links } = body;

    if (!id) {
      return res.status(400).json({ success: false, error: "ID is required" });
    }

    const link1 = links && links.length > 0 ? links[0] : null;
    const link2 = links && links.length > 1 ? links[1] : null;
    const link3 = links && links.length > 2 ? links[2] : null;

    const pool = getDbConnection();
    await pool.query(
      `UPDATE wishlist 
       SET name = ?, price = ?, target_date = ?, description = ?, brand = ?, link1 = ?, link2 = ?, link3 = ?
       WHERE id = ?`,
      [name, price, target_date || null, description || null, brand || null, link1, link2, link3, id]
    );

    return res.json({ success: true, message: "Item updated successfully" });
  } catch (error) {
    console.error("Error updating wishlist item:", error);
    return res.status(500).json({ success: false, error: "Failed to update wishlist item" });
  }
}

export async function DELETE(req: Request, res: Response) {
  try {
    const id = queryParam(req, 'id');

    if (!id) {
      return res.status(400).json({ success: false, error: "ID is required" });
    }

    const pool = getDbConnection();
    // Soft delete
    await pool.query("UPDATE wishlist SET is_active = 0 WHERE id = ?", [id]);

    return res.json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting wishlist item:", error);
    return res.status(500).json({ success: false, error: "Failed to delete wishlist item" });
  }
}

export const wishlistRouter = Router();
wishlistRouter.get("/", route(GET));
wishlistRouter.post("/", route(POST));
wishlistRouter.put("/", route(PUT));
wishlistRouter.delete("/", route(DELETE));
wishlistRouter.all("/", methodNotAllowed(["GET", "POST", "PUT", "DELETE"]));
