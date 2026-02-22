import { NextRequest, NextResponse } from 'next/server';
import { openDB, dbExists } from '@/lib/sql';

interface ContactDetail {
  id: number;
  name: string;
  email: string | null;
  company: { id: number; name: string } | null;
  title: string | null;
  phone: string | null;
  linkedin_url: string | null;
  notes: string | null;
  client_tag: string | null;
  created_at: string;
  warmth_score: number | null;
  last_interaction_date: string | null;
  relationships: Array<{ id: number; name: string; type: string }>;
  interactions: Array<{
    id: number;
    type: string;
    subject: string | null;
    date: string;
    notes: string | null;
  }>;
}

/**
 * GET /api/crm/contacts/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contactId = parseInt(id, 10);
    if (isNaN(contactId)) {
      return NextResponse.json({ error: 'Invalid contact ID' }, { status: 400 });
    }

    if (!(await dbExists())) {
      return NextResponse.json({ error: 'CRM database not yet initialized' }, { status: 404 });
    }

    const db = await openDB();

    // Get contact details
    const contactStmt = db.prepare(`
      SELECT 
        c.id,
        c.name,
        c.email,
        c.title,
        c.phone,
        c.linkedin_url,
        c.notes,
        c.client_tag,
        c.created_at,
        co.id as company_id,
        co.name as company_name,
        COALESCE(cs.relationship_score, 0) as warmth_score,
        cs.last_interaction_date
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN contact_summaries cs ON c.id = cs.contact_id
      WHERE c.id = ?
    `);
    contactStmt.bind([contactId]);

    if (!contactStmt.step()) {
      contactStmt.free();
      db.close();
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const row = contactStmt.getAsObject();
    contactStmt.free();

    // Get relationships
    const relationships: Array<{ id: number; name: string; type: string }> = [];
    const relStmt = db.prepare(`
      SELECT 
        r.id,
        c2.name,
        r.type
      FROM relationships r
      JOIN contacts c2 ON r.to_contact_id = c2.id
      WHERE r.from_contact_id = ?
    `);
    relStmt.bind([contactId]);
    while (relStmt.step()) {
      const r = relStmt.getAsObject();
      relationships.push({
        id: r.id as number,
        name: r.name as string,
        type: r.type as string,
      });
    }
    relStmt.free();

    // Get recent interactions (last 20)
    const interactions: Array<{
      id: number;
      type: string;
      subject: string | null;
      date: string;
      notes: string | null;
    }> = [];
    const intStmt = db.prepare(`
      SELECT 
        id,
        type,
        subject,
        date,
        summary as notes
      FROM interactions
      WHERE contact_id = ?
      ORDER BY date DESC
      LIMIT 20
    `);
    intStmt.bind([contactId]);
    while (intStmt.step()) {
      const i = intStmt.getAsObject();
      interactions.push({
        id: i.id as number,
        type: i.type as string,
        subject: i.subject as string | null,
        date: i.date as string,
        notes: i.notes as string | null,
      });
    }
    intStmt.free();
    db.close();

    const contact: ContactDetail = {
      id: row.id as number,
      name: row.name as string,
      email: row.email as string | null,
      company: row.company_id ? {
        id: row.company_id as number,
        name: row.company_name as string,
      } : null,
      title: row.title as string | null,
      phone: row.phone as string | null,
      linkedin_url: row.linkedin_url as string | null,
      notes: row.notes as string | null,
      client_tag: row.client_tag as string | null,
      created_at: row.created_at as string,
      warmth_score: row.warmth_score as number | null,
      last_interaction_date: row.last_interaction_date as string | null,
      relationships,
      interactions,
    };

    return NextResponse.json({ contact });
  } catch (err) {
    console.error('Error querying contact detail:', err);
    return NextResponse.json({ 
      error: String(err),
      note: 'Error querying database - check if tables exist'
    }, { status: 500 });
  }
}
