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

    if (!result.success && !result.ok) {
      throw new Error(result.error || 'Gmail API returned error');
    }

    // Transform Gmail API response to our format
    const emails = (result.messages || result.emails || []).map((email: any) => {
      // Parse "from" — can be string like "Name <email>" or object
      let fromName = 'Unknown';
      let fromEmail = '';
      if (typeof email.from === 'string') {
        const match = email.from.match(/^(.+?)\s*<(.+?)>$/);
        if (match) {
          fromName = match[1].trim();
          fromEmail = match[2].trim();
        } else {
          fromName = email.from;
          fromEmail = email.from;
        }
      } else if (email.from) {
        fromName = email.from.name || 'Unknown';
        fromEmail = email.from.email || '';
      }

      return {
        id: email.id || email.messageId,
        threadId: email.threadId || email.id,
        from: { name: fromName, email: fromEmail },
        subject: email.subject || '(No subject)',
        snippet: email.snippet || email.preview || '',
        date: email.date || email.receivedAt || new Date().toISOString(),
        unread: email.isUnread !== false,
        labels: (email.labels || []).filter(Boolean),
      };
    });

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
