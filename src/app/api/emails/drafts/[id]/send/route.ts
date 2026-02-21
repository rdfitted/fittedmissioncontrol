import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/emails/drafts/:id/send
 * 
 * Send an approved draft:
 * 1. Call Google Workspace API to send the email
 * 2. Move the draft file from approved/ to sent/
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const basePath = path.join(process.cwd(), '..', 'data', 'email-drafts');
    const approvedPath = path.join(basePath, 'approved', `${id}.json`);
    const sentPath = path.join(basePath, 'sent', `${id}.json`);

    // Read the approved draft
    let draft: any;
    try {
      const content = await fs.readFile(approvedPath, 'utf-8');
      draft = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: 'Approved draft not found' },
        { status: 404 }
      );
    }

    // Call Google Workspace API to SEND the email
    const gwToken = 'hex-gw-de367888df121a87e8156750';
    const gwUrl = 'https://script.google.com/macros/s/AKfycbzQe1ixyONJL5ipupjqy8PNHete7dNR9Eh6hTHX8LoJXYKFIdzsqltNqPuKSHC1Pg5_Rw/exec';
    
    const params = new URLSearchParams({
      token: gwToken,
      action: 'gmail.send',
      to: draft.recipient.email,
      subject: draft.subject,
      body: draft.draftBody,
    });

    try {
      const response = await fetch(`${gwUrl}?${params.toString()}`);
      const result = await response.json();
      
      if (!result.ok && !result.success) {
        return NextResponse.json(
          { error: 'Failed to send email', details: result },
          { status: 500 }
        );
      }
    } catch (gwError) {
      console.error('Error sending email:', gwError);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    // Update draft status
    const updatedDraft = {
      ...draft,
      status: 'sent',
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Ensure sent directory exists
    await fs.mkdir(path.join(basePath, 'sent'), { recursive: true });

    // Write to sent folder
    await fs.writeFile(sentPath, JSON.stringify(updatedDraft, null, 2), 'utf-8');

    // Remove from approved
    await fs.unlink(approvedPath);

    return NextResponse.json({
      success: true,
      draft: updatedDraft,
    });
  } catch (error) {
    console.error('Error sending draft:', error);
    return NextResponse.json(
      { error: 'Failed to send draft' },
      { status: 500 }
    );
  }
}
