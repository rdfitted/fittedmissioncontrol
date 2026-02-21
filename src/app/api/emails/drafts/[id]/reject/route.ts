import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/emails/drafts/:id/reject
 * 
 * Reject a draft:
 * 1. Move the draft file from pending/ to rejected/
 * 2. Update the draft with rejection reason
 * 
 * Body:
 * {
 *   reason: string
 * }
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const reason = body.reason || 'No reason provided';

    const basePath = path.join(process.cwd(), '..', 'data', 'email-drafts');
    const pendingPath = path.join(basePath, 'pending', `${id}.json`);
    const rejectedPath = path.join(basePath, 'rejected', `${id}.json`);

    // Read the draft
    let draft: any;
    try {
      const content = await fs.readFile(pendingPath, 'utf-8');
      draft = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      );
    }

    // Update draft status
    const updatedDraft = {
      ...draft,
      status: 'rejected',
      updatedAt: new Date().toISOString(),
      rejectedReason: reason,
    };

    // Ensure rejected directory exists
    await fs.mkdir(path.join(basePath, 'rejected'), { recursive: true });

    // Write to rejected folder
    await fs.writeFile(rejectedPath, JSON.stringify(updatedDraft, null, 2), 'utf-8');

    // Remove from pending
    await fs.unlink(pendingPath);

    return NextResponse.json({
      success: true,
      draft: updatedDraft,
    });
  } catch (error) {
    console.error('Error rejecting draft:', error);
    return NextResponse.json(
      { error: 'Failed to reject draft' },
      { status: 500 }
    );
  }
}
