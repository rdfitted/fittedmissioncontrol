import { NextRequest, NextResponse } from 'next/server';
import { openDB, dbExists } from '@/lib/sql';

interface SearchResult {
  type: 'contact' | 'company';
  id: number;
  name: string;
  subtitle: string | null;
  score: number | null;
}

/**
 * GET /api/crm/search?q=...
 * Unified search across contacts and companies
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase();

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    if (!(await dbExists())) {
      return NextResponse.json({ results: [], note: 'CRM database not yet initialized' });
    }

    const db = await openDB();

    const results: SearchResult[] = [];

    // Search contacts
    const contactStmt = db.prepare(`
      SELECT 
        c.id,
        c.name,
        c.email,
        co.name as company,
        c.title,
        COALESCE(cs.relationship_score, 0) as score
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN contact_summaries cs ON c.id = cs.contact_id
      WHERE LOWER(c.name) LIKE ? OR LOWER(c.email) LIKE ?
      LIMIT 10
    `);
    contactStmt.bind([`%${query}%`, `%${query}%`]);
    while (contactStmt.step()) {
      const row = contactStmt.getAsObject();
      const subtitle = [row.title, row.company].filter(Boolean).join(' at ');
      results.push({
        type: 'contact',
        id: row.id as number,
        name: row.name as string,
        subtitle: subtitle || (row.email as string),
        score: row.score as number | null,
      });
    }
    contactStmt.free();

    // Search companies
    const companyStmt = db.prepare(`
      SELECT 
        co.id,
        co.name,
        co.domain,
        COUNT(DISTINCT c.id) as contact_count,
        AVG(cs.relationship_score) as avg_score
      FROM companies co
      LEFT JOIN contacts c ON c.company_id = co.id
      LEFT JOIN contact_summaries cs ON c.id = cs.contact_id
      WHERE LOWER(co.name) LIKE ? OR LOWER(co.domain) LIKE ?
      GROUP BY co.id
      LIMIT 10
    `);
    companyStmt.bind([`%${query}%`, `%${query}%`]);
    while (companyStmt.step()) {
      const row = companyStmt.getAsObject();
      const contactCount = row.contact_count as number;
      const subtitle = contactCount > 0 
        ? `${contactCount} contact${contactCount !== 1 ? 's' : ''}`
        : (row.domain as string | null);
      results.push({
        type: 'company',
        id: row.id as number,
        name: row.name as string,
        subtitle: subtitle || null,
        score: row.avg_score as number | null,
      });
    }
    companyStmt.free();
    db.close();

    return NextResponse.json({ results, total: results.length });
  } catch (err) {
    console.error('Error in unified search:', err);
    return NextResponse.json({ 
      error: String(err),
      results: [],
      note: 'Error querying database - check if tables exist'
    }, { status: 500 });
  }
}
