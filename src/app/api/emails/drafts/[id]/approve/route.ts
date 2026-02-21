import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { callGWAPI, isSuccess } from '@/lib/gw-api';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const basePath = path.join(process.cwd(), '..', 'data', 'email-drafts');
    const pendingPath = path.join(basePath, 'pending', `${id}.json`);
    const approvedPath = path.join(basePath, 'approved', `${id}.json`);

    let draft: any;
    try {
      const content = await fs.readFile(pendingPath, 'utf-8');
      draft = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    let gmailDraftId = null;
    try {
      const result = await callGWAPI('gmail.draft', {
        to: draft.recipient.email,
        subject: draft.subject,
        body: draft.draftBody,
      });

      if (isSuccess(result) && result.draftId) {
        gmailDraftId = result.draftId;
      }
    } catch (gwError) {
      console.error('Error calling Google Workspace API:', gwError);
    }

    const updatedDraft = {
      ...draft,
      status: 'approved',
      updatedAt: new Date().toISOString(),
      gmailDraftId,
    };

    await fs.mkdir(path.join(basePath, 'approved'), { recursive: true });
    await fs.writeFile(approvedPath, JSON.stringify(updatedDraft, null, 2), 'utf-8');
    await fs.unlink(pendingPath);

    return NextResponse.json({ success: true, draft: updatedDraft, gmailDraftId });
  } catch (error) {
    console.error('Error approving draft:', error);
    return NextResponse.json({ error: 'Failed to approve draft' }, { status: 500 });
  }
}
