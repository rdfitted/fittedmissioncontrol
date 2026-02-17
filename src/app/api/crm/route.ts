import { NextRequest, NextResponse } from 'next/server';
import { getAllLeads, createLead, updateLead, deleteLead, addTouchpoint, bulkUpdateLeads } from '@/lib/crm';

/**
 * GET /api/crm — List all leads
 * Query: ?stage=new&assigned=Iris&search=keyword
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let leads = await getAllLeads();

    const stage = searchParams.get('stage');
    const assigned = searchParams.get('assigned');
    const priority = searchParams.get('priority');
    const source = searchParams.get('source');
    const search = searchParams.get('search')?.toLowerCase();
    const tag = searchParams.get('tag');

    if (stage) leads = leads.filter(l => l.stage === stage);
    if (assigned) leads = leads.filter(l => l.assigned?.toLowerCase() === assigned.toLowerCase());
    if (priority) leads = leads.filter(l => l.priority === priority);
    if (source) leads = leads.filter(l => l.source === source);
    if (tag) leads = leads.filter(l => l.tags.includes(tag));
    if (search) {
      leads = leads.filter(l => {
        const haystack = [
          l.company,
          l.notes,
          l.industry,
          ...l.tags,
          ...l.contacts.map(c => `${c.name} ${c.email} ${c.role}`),
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(search);
      });
    }

    return NextResponse.json({ leads, total: leads.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * POST /api/crm — Create lead, add touchpoint, or bulk update
 * Body: { action: 'create' | 'touchpoint' | 'bulk', ... }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || 'create';

    if (action === 'create') {
      const lead = await createLead(body);
      return NextResponse.json({ lead }, { status: 201 });
    }

    if (action === 'touchpoint') {
      const { leadId, touchpoint } = body;
      if (!leadId || !touchpoint) {
        return NextResponse.json({ error: 'leadId and touchpoint required' }, { status: 400 });
      }
      const lead = await addTouchpoint(leadId, touchpoint);
      if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      return NextResponse.json({ lead });
    }

    if (action === 'bulk') {
      const { ids, updates } = body;
      if (!ids?.length) return NextResponse.json({ error: 'ids required' }, { status: 400 });
      const count = await bulkUpdateLeads(ids, updates || {});
      return NextResponse.json({ updated: count });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * PUT /api/crm — Update a lead
 * Body: { id, ...updates }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const lead = await updateLead(id, updates);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    return NextResponse.json({ lead });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * DELETE /api/crm — Delete a lead
 * Body: { id }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const ok = await deleteLead(body.id);
    if (!ok) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
