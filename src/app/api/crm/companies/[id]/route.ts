import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import initSqlJs from 'sql.js';

const DB_PATH = path.join(process.cwd(), '..', 'data', 'crm-intel.db');

interface CompanyDetail {
  id: number;
  name: string;
  domain: string | null;
  client_tag: string | null;
  status: string | null;
  industry: string | null;
  size: string | null;
  notes: string | null;
  created_at: string;
  contacts: Array<{
    id: number;
    name: string;
    email: string | null;
    title: string | null;
    warmth_score: number | null;
  }>;
  recent_interactions: Array<{
    id: number;
    contact_name: string;
    type: string;
    subject: string | null;
    date: string;
  }>;
}

/**
 * GET /api/crm/companies/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = parseInt(id, 10);
    if (isNaN(companyId)) {
      return NextResponse.json({ error: 'Invalid company ID' }, { status: 400 });
    }

    // Check if database exists
    try {
      await fs.access(DB_PATH);
    } catch {
      return NextResponse.json({ 
        error: 'CRM database not yet initialized' 
      }, { status: 404 });
    }

    const buffer = await fs.readFile(DB_PATH);
    const SQL = await initSqlJs();
    const db = new SQL.Database(buffer);

    // Get company details
    const companyStmt = db.prepare(`
      SELECT 
        id,
        name,
        domain,
        client_tag,
        status,
        industry,
        size,
        notes,
        created_at
      FROM companies
      WHERE id = ?
    `);
    companyStmt.bind([companyId]);

    if (!companyStmt.step()) {
      companyStmt.free();
      db.close();
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const row = companyStmt.getAsObject();
    companyStmt.free();

    // Get contacts
    const contacts: Array<{
      id: number;
      name: string;
      email: string | null;
      title: string | null;
      warmth_score: number | null;
    }> = [];
    const contactStmt = db.prepare(`
      SELECT 
        c.id,
        c.name,
        c.email,
        c.title,
        COALESCE(cs.relationship_score, 0) as warmth_score
      FROM contacts c
      LEFT JOIN contact_summaries cs ON c.id = cs.contact_id
      WHERE c.company_id = ?
      ORDER BY c.name
    `);
    contactStmt.bind([companyId]);
    while (contactStmt.step()) {
      const c = contactStmt.getAsObject();
      contacts.push({
        id: c.id as number,
        name: c.name as string,
        email: c.email as string | null,
        title: c.title as string | null,
        warmth_score: c.warmth_score as number | null,
      });
    }
    contactStmt.free();

    // Get recent interactions across all contacts
    const interactions: Array<{
      id: number;
      contact_name: string;
      type: string;
      subject: string | null;
      date: string;
    }> = [];
    const intStmt = db.prepare(`
      SELECT 
        i.id,
        c.name as contact_name,
        i.interaction_type as type,
        i.subject,
        i.interaction_date as date
      FROM interactions i
      JOIN contacts c ON i.contact_id = c.id
      WHERE c.company_id = ?
      ORDER BY i.interaction_date DESC
      LIMIT 20
    `);
    intStmt.bind([companyId]);
    while (intStmt.step()) {
      const i = intStmt.getAsObject();
      interactions.push({
        id: i.id as number,
        contact_name: i.contact_name as string,
        type: i.type as string,
        subject: i.subject as string | null,
        date: i.date as string,
      });
    }
    intStmt.free();
    db.close();

    const company: CompanyDetail = {
      id: row.id as number,
      name: row.name as string,
      domain: row.domain as string | null,
      client_tag: row.client_tag as string | null,
      status: row.status as string | null,
      industry: row.industry as string | null,
      size: row.size as string | null,
      notes: row.notes as string | null,
      created_at: row.created_at as string,
      contacts,
      recent_interactions: interactions,
    };

    return NextResponse.json({ company });
  } catch (err) {
    console.error('Error querying company detail:', err);
    return NextResponse.json({ 
      error: String(err),
      note: 'Error querying database - check if tables exist'
    }, { status: 500 });
  }
}
