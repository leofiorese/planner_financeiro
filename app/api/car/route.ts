import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/utils/db';

async function query(sql: string, params: any[] = []): Promise<any[]> {
  const [rows] = await getDbConnection().execute(sql, params);
  return rows as any[];
}

function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);

  const newObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    let parsedValue = value;
    if (value instanceof Date) {
      // DATE-only columns (date, next_date) come back as midnight UTC.
      // Return just YYYY-MM-DD to avoid timezone-shift issues in the frontend.
      const iso = value.toISOString();
      parsedValue = iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
    } else if (key.startsWith('is_') || key === 'active') {
      if (typeof value === 'number') parsedValue = value === 1;
      else if (value instanceof Buffer) parsedValue = value[0] === 1;
    }
    newObj[newKey] = toCamelCase(parsedValue);
  }
  return newObj;
}

function toDbDate(val: any): string | null {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/** Converts a value to a DATE-only string (YYYY-MM-DD) for MySQL DATE columns.
 *  Returns null for any falsy/empty value so MySQL won't reject it. */
function toDbDateOnly(val: any): string | null {
  if (!val || String(val).trim() === '') return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Returns null for 0 or falsy numeric values (avoids inserting 0 into optional numeric columns). */
function nullIfZero(val: any): number | null {
  const n = Number(val);
  return n > 0 ? n : null;
}

// GET - Load all car data
export async function GET() {
  try {
    const [vehicles, fuelLogs, maintenanceLogs] = await Promise.all([
      query('SELECT * FROM car_vehicles ORDER BY created_at DESC'),
      query('SELECT * FROM car_fuel_logs ORDER BY date DESC'),
      query('SELECT * FROM car_maintenance_logs ORDER BY date DESC'),
    ]);

    const parseNumbers = (obj: any, fields: string[]) => {
      fields.forEach(f => { if (obj[f] !== undefined) obj[f] = Number(obj[f]) || 0; });
      return obj;
    };

    const parsedVehicles = vehicles.map(toCamelCase).map((v: any) =>
      parseNumbers(v, ['year', 'currentKm', 'averageKmL'])
    );
    const parsedFuelLogs = fuelLogs.map(toCamelCase).map((f: any) =>
      parseNumbers(f, ['liters', 'pricePerLiter', 'totalCost', 'odometer', 'kmL'])
    );
    const parsedMaintenanceLogs = maintenanceLogs.map(toCamelCase).map((m: any) =>
      parseNumbers(m, ['cost', 'odometer', 'nextOdometer', 'nextKmInterval'])
    );

    return NextResponse.json({ vehicles: parsedVehicles, fuelLogs: parsedFuelLogs, maintenanceLogs: parsedMaintenanceLogs });
  } catch (error) {
    console.error('Car API Error (GET):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST - Create/Update entities
export async function POST(request: NextRequest) {
  const connection = await getDbConnection().getConnection();
  try {
    const body = await request.json();
    const { type, data } = body;
    const now = toDbDate(new Date().toISOString());

    await connection.beginTransaction();

    if (type === 'vehicle') {
      if (data.id) {
        // Update
        await connection.execute(`
          UPDATE car_vehicles SET 
            name=?, brand=?, model=?, year=?, license_plate=?, current_km=?, average_km_l=?, notes=?, updated_at=?
          WHERE id=?
        `, [data.name, data.brand, data.model, data.year ?? null, data.licensePlate ?? null,
          data.currentKm ?? 0, data.averageKmL ?? 0, data.notes ?? null, now, data.id]);
      } else {
        const id = `vehicle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await connection.execute(`
          INSERT INTO car_vehicles (id, name, brand, model, year, license_plate, current_km, average_km_l, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, data.name, data.brand, data.model, data.year ?? null, data.licensePlate ?? null,
          data.currentKm ?? 0, data.averageKmL ?? 0, data.notes ?? null, now, now]);
        data.id = id;
      }
    } else if (type === 'fuelLog') {
      const currentOdometer = nullIfZero(data.odometer);
      const liters = Number(data.liters) || 0;

      // ── Calculate km/L server-side ──────────────────────────────────────
      // Find the previous fuel log for this vehicle that has an odometer reading
      // and comes before this one (by date or by odometer value).
      let calculatedKmL: number | null = null;
      if (currentOdometer && liters > 0) {
        const prevLogs = await query(
          `SELECT odometer FROM car_fuel_logs
           WHERE vehicle_id = ? AND odometer IS NOT NULL AND odometer < ?
           ORDER BY odometer DESC LIMIT 1`,
          [data.vehicleId, currentOdometer]
        );
        if (prevLogs.length > 0 && prevLogs[0].odometer) {
          const kmDriven = currentOdometer - Number(prevLogs[0].odometer);
          if (kmDriven > 0) {
            calculatedKmL = Math.round((kmDriven / liters) * 100) / 100;
          }
        }
      }

      if (data.id) {
        await connection.execute(`
          UPDATE car_fuel_logs SET 
            vehicle_id=?, date=?, liters=?, price_per_liter=?, total_cost=?,
            odometer=?, km_l=?, fuel_type=?, station=?, notes=?, updated_at=?
          WHERE id=?
        `, [data.vehicleId, data.date, liters, data.pricePerLiter, data.totalCost,
          currentOdometer, calculatedKmL, data.fuelType ?? 'gasoline',
          data.station || null, data.notes || null, now, data.id]);
      } else {
        const id = `fuel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await connection.execute(`
          INSERT INTO car_fuel_logs
            (id, vehicle_id, date, liters, price_per_liter, total_cost, odometer, km_l, fuel_type, station, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, data.vehicleId, data.date, liters, data.pricePerLiter, data.totalCost,
          currentOdometer, calculatedKmL, data.fuelType ?? 'gasoline',
          data.station || null, data.notes || null, now, now]);
        data.id = id;
        data.kmL = calculatedKmL;
      }

      // ── Update vehicle current_km and recalculate average km/L ──────────
      if (currentOdometer) {
        // Update current_km if this reading is the highest known
        await connection.execute(
          `UPDATE car_vehicles SET current_km = ?, updated_at = ? WHERE id = ? AND current_km < ?`,
          [currentOdometer, now, data.vehicleId, currentOdometer]
        );
      }
      // Recalculate average km/L from all logs with a valid km_l for this vehicle
      const avgRows = await query(
        `SELECT AVG(km_l) as avg_kml FROM car_fuel_logs WHERE vehicle_id = ? AND km_l IS NOT NULL AND km_l > 0`,
        [data.vehicleId]
      );
      if (avgRows.length > 0 && avgRows[0].avg_kml) {
        const newAvg = Math.round(Number(avgRows[0].avg_kml) * 100) / 100;
        await connection.execute(
          `UPDATE car_vehicles SET average_km_l = ?, updated_at = ? WHERE id = ?`,
          [newAvg, now, data.vehicleId]
        );
      }
    } else if (type === 'maintenanceLog') {
      // Sanitize optional date and numeric fields — empty string must become null
      const nextDate    = toDbDateOnly(data.nextDate);       // DATE column → null if empty
      const odometer    = nullIfZero(data.odometer);         // optional
      const nextOdo     = nullIfZero(data.nextOdometer);     // optional
      const nextKmInt   = nullIfZero(data.nextKmInterval);   // optional

      if (data.id) {
        await connection.execute(`
          UPDATE car_maintenance_logs SET 
            vehicle_id=?, date=?, type=?, description=?, cost=?,
            odometer=?, next_date=?, next_odometer=?, next_km_interval=?,
            workshop=?, notes=?, updated_at=?
          WHERE id=?
        `, [data.vehicleId, data.date, data.type, data.description, data.cost ?? 0,
          odometer, nextDate, nextOdo, nextKmInt,
          data.workshop || null, data.notes || null, now, data.id]);
      } else {
        const id = `maint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await connection.execute(`
          INSERT INTO car_maintenance_logs
            (id, vehicle_id, date, type, description, cost, odometer, next_date, next_odometer, next_km_interval, workshop, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, data.vehicleId, data.date, data.type, data.description, data.cost ?? 0,
          odometer, nextDate, nextOdo, nextKmInt,
          data.workshop || null, data.notes || null, now, now]);
        data.id = id;
      }
    } else {
      await connection.rollback();
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    await connection.commit();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    await connection.rollback();
    console.error('Car API Error (POST):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// DELETE - Remove entities
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    }

    const tableMap: Record<string, string> = {
      vehicle: 'car_vehicles',
      fuelLog: 'car_fuel_logs',
      maintenanceLog: 'car_maintenance_logs',
    };

    const table = tableMap[type];
    if (!table) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    await query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Car API Error (DELETE):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
