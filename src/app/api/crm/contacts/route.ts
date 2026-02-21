import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import initSqlJs from 'sql.js';

const DB_PATH = path.join(process.cwd(), '..', 'data', 'crm-intel.db');

interface Contact {
  id: number;
  name: string;
  email: string | null;
  company: string | null;
  title: string | null;
  phone: string | null;
  warmth_score: number | null;
  client_tag: string | null;
  last_interaction_date: string | null;
}

/**
 * GET /api/crm/contacts
 * Query params: ?company=GVB&search=tim&minScore=50&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const search = searchParams.get('search')?.toLowerCase();
    const minScore = searchParams.get('minScore');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Check if database exists
    try {
      await fs.access(DB_PATH);
    } catch {
      return NextResponse.json({ 
        contacts: [], 
        note: 'CRM database not yet initialized' 
      });
    }

    const buffer = await fs.readFile(DB_PATH);
    const SQL = await initSqlJs();
    const db = new SQL.Database(buffer);

    // Build query
    let query = `
      SELECT 
        c.id,
        c.name,
        c.email,
        co.name as company,
        c.title,
        c.phone,
        COALESCE(cs.relationship_score, 0) as warmth_score,
        c.client_tag,
        cs.last_interaction_date
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN contact_summaries cs ON c.id = cs.contact_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (company) {
      query += ` AND co.name LIKE ?`;
      params.push(`%${company}%`);
    }

    if (search) {
      query += ` AND (LOWER(c.name) LIKE ? OR LOWER(c.email) LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (minScore) {
      query += ` AND COALESCE(cs.relationship_score, 0) >= ?`;
      params.push(parseInt(minScore, 10));
    }

    query += ` ORDER BY c.name LIMIT ?`;
    params.push(limit);

    const stmt = db.prepare(query);
    stmt.bind(params);

    const contacts: Contact[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      contacts.push({
        id: row.id as number,
        name: row.name as string,
        email: row.email as string | null,
        company: row.company as string | null,
        title: row.title as string | null,
        phone: row.phone as string | null,
        warmth_score: row.warmth_score as number | null,
        client_tag: row.client_tag as string | null,
        last_interaction_date: row.last_interaction_date as string | null,
      });
    }
    stmt.free();
    db.close();

    return NextResponse.json({ contacts, total: contacts.length });
  } catch (err) {
    console.error('Error querying contacts:', err);
    return NextResponse.json({ 
      error: String(err),
      contacts: [],
      note: 'Error querying database - check if tables exist'
    }, { status: 500 });
  }
}

/**
 * POST /api/crm/contacts
 * Body: { name, email, company?, title?, phone?, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, title, phone, notes } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'name and email required' }, { status: 400 });
    }

    // Check if database exists
    try {
      await fs.access(DB_PATH);
    } catch {
      return NextResponse.json({ 
        error: 'CRM database not yet initialized' 
      }, { status: 503 });
    }

    const buffer = await fs.readFile(DB_PATH);
    const SQL = await initSqlJs();
    const db = new SQL.Database(buffer);

    // Find or create company if provided
    let companyId: number | null = null;
    if (company) {
      // Try to find existing company
      const findCompany = db.prepare('SELECT id FROM companies WHERE name = ? LIMIT 1');
      findCompany.bind([company]);
      if (findCompany.step()) {
        companyId = findCompany.getAsObject().id as number;
      }
      findCompany.free();

      // If not found, create it
      if (!companyId) {
        const domain = email.split('@')[1] || null;
        db.run('INSERT INTO companies (name, domain, status) VALUES (?, ?, ?)', [company, domain, 'prospect']);
        const getLastId = db.prepare('SELECT last_insert_rowid() as id');
        getLastId.step();
        companyId = getLastId.getAsObject().id as number;
        getLastId.free();
      }
    }

    // Insert contact
    db.run(
      'INSERT INTO contacts (name, email, company_id, title, phone, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [name, email, companyId, title || null, phone || null, notes || null]
    );

    const getLastId = db.prepare('SELECT last_insert_rowid() as id');
    getLastId.step();
    const contactId = getLastId.getAsObject().id as number;
    getLastId.free();

    // Save database
    const data = db.export();
    db.close();
    await fs.writeFile(DB_PATH, data);

    return NextResponse.json({ 
      success: true, 
      id: contactId,
      message: 'Contact created successfully' 
    }, { status: 201 });
  } catch (err) {
    console.error('Error creating contact:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
