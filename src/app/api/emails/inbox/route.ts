import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/emails/inbox
 * 
 * Proxy to Google Workspace API to fetch recent unread emails
 * Returns last 15 emails from Gmail
 */
export async function GET(request: NextRequest) {
  try {
    const gwToken = 'hex-gw-de367888df121a87e8156750';
    const gwUrl = 'https://script.google.com/macros/s/AKfycbzQe1ixyONJL5ipupjqy8PNHete7dNR9Eh6hTHX8LoJXYKFIdzsqltNqPuKSHC1Pg5_Rw/exec';
    
    const params = new URLSearchParams({
      token: gwToken,
      action: 'gmail.unread',
      max: '15',
    });

    const response = await fetch(`${gwUrl}?${params.toString()}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Gmail API returned error');
    }

    // Transform Gmail API response to our format
    const emails = (result.emails || []).map((email: any) => ({
      id: email.id || email.messageId,
      threadId: email.threadId || email.id,
      from: {
        name: email.from?.name || email.fromName || 'Unknown',
        email: email.from?.email || email.fromEmail || '',
      },
      subject: email.subject || '(No subject)',
      snippet: email.snippet || email.preview || '',
      date: email.date || email.receivedAt || new Date().toISOString(),
      unread: email.unread !== false, // Default to true
      labels: email.labels || [],
    }));

    return NextResponse.json({
      emails,
      count: emails.length,
    });
  } catch (error) {
    console.error('Error fetching inbox:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inbox', emails: [] },
      { status: 500 }
    );
  }
}
