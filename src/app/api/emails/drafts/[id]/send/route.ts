import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { callGWAPI, isSuccess } from '@/lib/gw-api';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const basePath = path.join(process.cwd(), '..', 'data', 'email-drafts');
    const approvedPath = path.join(basePath, 'approved', `${id}.json`);
    const sentPath = path.join(basePath, 'sent', `${id}.json`);

    let draft: any;
    try {
      const content = await fs.readFile(approvedPath, 'utf-8');
      draft = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: 'Approved draft not found' }, { status: 404 });
    }

    try {
      const result = await callGWAPI('gmail.send', {
        to: draft.recipient.email,
        subject: draft.subject,
        body: draft.draftBody,
      });

      if (!isSuccess(result)) {
        return NextResponse.json({ error: 'Failed to send email', details: result }, { status: 500 });
      }
    } catch (gwError) {
      console.error('Error sending email:', gwError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    const updatedDraft = {
      ...draft,
      status: 'sent',
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await fs.mkdir(path.join(basePath, 'sent'), { recursive: true });
    await fs.writeFile(sentPath, JSON.stringify(updatedDraft, null, 2), 'utf-8');
    await fs.unlink(approvedPath);

    return NextResponse.json({ success: true, draft: updatedDraft });
  } catch (error) {
    console.error('Error sending draft:', error);
    return NextResponse.json({ error: 'Failed to send draft' }, { status: 500 });
  }
}
