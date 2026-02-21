import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * PUT /api/emails/drafts/:id
 * 
 * Update a draft (pending or approved):
 * - Accepts: { subject?, recipientEmail?, recipientName?, draftBody? }
 * - Updates only the provided fields
 * - Sets updatedAt to now
 * - If editing an approved draft, moves it back to pending (requires re-approval)
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    const { subject, recipientEmail, recipientName, draftBody } = body;

    const basePath = path.join(process.cwd(), '..', 'data', 'email-drafts');
    
    // Try to find the draft in pending or approved folders
    let draftPath: string | null = null;
    let currentStatus: 'pending' | 'approved' | null = null;
    
    const pendingPath = path.join(basePath, 'pending', `${id}.json`);
    const approvedPath = path.join(basePath, 'approved', `${id}.json`);
    
    try {
      await fs.access(pendingPath);
      draftPath = pendingPath;
      currentStatus = 'pending';
    } catch {
      try {
        await fs.access(approvedPath);
        draftPath = approvedPath;
        currentStatus = 'approved';
      } catch {
        return NextResponse.json(
          { error: 'Draft not found' },
          { status: 404 }
        );
      }
    }

    // Read the current draft
    const content = await fs.readFile(draftPath, 'utf-8');
    const draft = JSON.parse(content);

    // Update only provided fields
    const updatedDraft = {
      ...draft,
      ...(subject !== undefined && { subject }),
      ...(draftBody !== undefined && { draftBody }),
      updatedAt: new Date().toISOString(),
    };

    // Update recipient if provided
    if (recipientEmail !== undefined || recipientName !== undefined) {
      updatedDraft.recipient = {
        ...draft.recipient,
        ...(recipientEmail !== undefined && { email: recipientEmail }),
        ...(recipientName !== undefined && { name: recipientName }),
      };
    }

    // If editing an approved draft, move it back to pending
    if (currentStatus === 'approved') {
      updatedDraft.status = 'pending';
      updatedDraft.gmailDraftId = null; // Clear stale Gmail draft
      
      const newPendingPath = path.join(basePath, 'pending', `${id}.json`);
      
      // Ensure pending directory exists
      await fs.mkdir(path.join(basePath, 'pending'), { recursive: true });
      
      // Write to pending folder
      await fs.writeFile(newPendingPath, JSON.stringify(updatedDraft, null, 2), 'utf-8');
      
      // Remove from approved folder
      await fs.unlink(approvedPath);
      
      return NextResponse.json({
        success: true,
        draft: updatedDraft,
        movedToPending: true,
      });
    }

    // For pending drafts, just update in place
    await fs.writeFile(draftPath, JSON.stringify(updatedDraft, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      draft: updatedDraft,
    });
  } catch (error) {
    console.error('Error updating draft:', error);
    return NextResponse.json(
      { error: 'Failed to update draft' },
      { status: 500 }
    );
  }
}
