import { NextResponse } from "next/server";
import { getDbConnection } from "@/utils/db";

export async function GET() {
  try {
    const pool = getDbConnection();
    const [rows] = await pool.query(
      "SELECT * FROM wishlist WHERE is_active = 1 ORDER BY created_at DESC"
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch wishlist" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    return NextResponse.json({ 
      success: true, 
      data: { id: (result as any).insertId, name, price, target_date, description, brand, link1, link2, link3 } 
    });
  } catch (error) {
    console.error("Error creating wishlist item:", error);
    return NextResponse.json({ success: false, error: "Failed to create wishlist item" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, price, target_date, description, brand, links } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
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

    return NextResponse.json({ success: true, message: "Item updated successfully" });
  } catch (error) {
    console.error("Error updating wishlist item:", error);
    return NextResponse.json({ success: false, error: "Failed to update wishlist item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    const pool = getDbConnection();
    // Soft delete
    await pool.query("UPDATE wishlist SET is_active = 0 WHERE id = ?", [id]);

    return NextResponse.json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting wishlist item:", error);
    return NextResponse.json({ success: false, error: "Failed to delete wishlist item" }, { status: 500 });
  }
}
