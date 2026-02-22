import { NextRequest, NextResponse } from 'next/server';
import { openDB, dbExists } from '@/lib/sql';

interface Company {
  id: number;
  name: string;
  domain: string | null;
  client_tag: string | null;
  status: string | null;
  contact_count: number;
  avg_relationship_score: number | null;
}

/**
 * GET /api/crm/companies
 * Query params: ?status=client&search=gvb&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase();
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    if (!(await dbExists())) {
      return NextResponse.json({ companies: [], note: 'CRM database not yet initialized' });
    }

    const db = await openDB();

    // Build query
    let query = `
      SELECT 
        co.id,
        co.name,
        co.domain,
        co.client_tag,
        co.status,
        COUNT(DISTINCT c.id) as contact_count,
        AVG(cs.relationship_score) as avg_relationship_score
      FROM companies co
      LEFT JOIN contacts c ON c.company_id = co.id
      LEFT JOIN contact_summaries cs ON c.id = cs.contact_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ` AND co.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (LOWER(co.name) LIKE ? OR LOWER(co.domain) LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` GROUP BY co.id ORDER BY co.name LIMIT ?`;
    params.push(limit);

    const stmt = db.prepare(query);
    stmt.bind(params);

    const companies: Company[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      companies.push({
        id: row.id as number,
        name: row.name as string,
        domain: row.domain as string | null,
        client_tag: row.client_tag as string | null,
        status: row.status as string | null,
        contact_count: row.contact_count as number,
        avg_relationship_score: row.avg_relationship_score as number | null,
      });
    }
    stmt.free();
    db.close();

    return NextResponse.json({ companies, total: companies.length });
  } catch (err) {
    console.error('Error querying companies:', err);
    return NextResponse.json({ 
      error: String(err),
      companies: [],
      note: 'Error querying database - check if tables exist'
    }, { status: 500 });
  }
}
