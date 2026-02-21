import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/emails/drafts/:id/approve
 * 
 * Approve a draft:
 * 1. Call Google Workspace API to create Gmail draft
 * 2. Move the draft file from pending/ to sent/
 * 3. Update the draft with gmailDraftId
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const basePath = path.join(process.cwd(), '..', 'data', 'email-drafts');
    const pendingPath = path.join(basePath, 'pending', `${id}.json`);
    const sentPath = path.join(basePath, 'sent', `${id}.json`);

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

    // Call Google Workspace API to create Gmail draft
    const gwToken = 'hex-gw-de367888df121a87e8156750';
    const gwUrl = 'https://script.google.com/macros/s/AKfycbzQe1ixyONJL5ipupjqy8PNHete7dNR9Eh6hTHX8LoJXYKFIdzsqltNqPuKSHC1Pg5_Rw/exec';
    
    const params = new URLSearchParams({
      token: gwToken,
      action: 'gmail.draft',
      to: draft.recipient.email,
      subject: draft.subject,
      body: draft.draftBody,
    });

    let gmailDraftId = null;
    try {
      const response = await fetch(`${gwUrl}?${params.toString()}`);
      const result = await response.json();
      
      if ((result.success || result.ok) && result.draftId) {
        gmailDraftId = result.draftId;
      } else {
        console.warn('Gmail draft creation warning:', result);
      }
    } catch (gwError) {
      console.error('Error calling Google Workspace API:', gwError);
      // Continue even if Gmail API fails - we still want to move the file
    }

    // Update draft status
    const updatedDraft = {
      ...draft,
      status: 'sent',
      updatedAt: new Date().toISOString(),
      gmailDraftId,
    };

    // Ensure sent directory exists
    await fs.mkdir(path.join(basePath, 'sent'), { recursive: true });

    // Write to sent folder
    await fs.writeFile(sentPath, JSON.stringify(updatedDraft, null, 2), 'utf-8');

    // Remove from pending
    await fs.unlink(pendingPath);

    return NextResponse.json({
      success: true,
      draft: updatedDraft,
      gmailDraftId,
    });
  } catch (error) {
    console.error('Error approving draft:', error);
    return NextResponse.json(
      { error: 'Failed to approve draft' },
      { status: 500 }
    );
  }
}
