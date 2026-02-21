import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

/**
 * POST /api/emails/draft
 * 
 * Trigger draft generation workflow
 * This is a placeholder that creates a sample draft
 * In production, this would trigger the full workflow with LLM generation
 * 
 * Body:
 * {
 *   query: string  // e.g., "Billy QuickBooks" or "reply to Criscia"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body.query || '';

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Generate draft ID
    const timestamp = new Date().toISOString().split('T')[0];
    const randomId = Math.random().toString(36).substring(2, 8);
    const draftId = `draft-${timestamp}-${randomId}`;

    // TODO: In production, this would:
    // 1. Search Gmail via GW API
    // 2. Pull context from Podio/client memory
    // 3. Call LLM to generate reply
    // 4. Save to pending/ folder
    
    // For now, create a placeholder draft
    const draft = {
      id: draftId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      query,
      recipient: {
        name: extractNameFromQuery(query),
        email: 'placeholder@example.com',
        client: null,
      },
      subject: `Re: ${query}`,
      originalThread: 'Original thread context would be here...',
      contextUsed: ['Gmail search', 'Query extraction'],
      draftBody: `Hi,\n\nThis is a placeholder draft generated from query: "${query}"\n\nIn production, this would be an AI-generated reply based on:\n- Recent Gmail thread\n- Contact/client context\n- Your communication style\n\nBest regards,\nRyan`,
      gmailDraftId: null,
      rejectedReason: null,
    };

    // Ensure pending directory exists
    const basePath = path.join(process.cwd(), '..', 'data', 'email-drafts');
    await fs.mkdir(path.join(basePath, 'pending'), { recursive: true });

    // Write draft to pending folder
    const draftPath = path.join(basePath, 'pending', `${draftId}.json`);
    await fs.writeFile(draftPath, JSON.stringify(draft, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      draft,
      message: 'Draft created (placeholder mode)',
    });
  } catch (error) {
    console.error('Error creating draft:', error);
    return NextResponse.json(
      { error: 'Failed to create draft' },
      { status: 500 }
    );
  }
}

// Simple name extraction from query
function extractNameFromQuery(query: string): string {
  // Remove common words
  const cleaned = query.replace(/\b(reply to|draft|email|from|to)\b/gi, '').trim();
  
  // Take first capitalized word or first word
  const words = cleaned.split(/\s+/);
  const capitalized = words.find(w => /^[A-Z]/.test(w));
  
  return capitalized || words[0] || 'Unknown';
}
