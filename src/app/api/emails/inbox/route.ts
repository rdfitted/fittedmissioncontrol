import { NextRequest, NextResponse } from 'next/server';
import { callGWAPI, parseEmailFrom, getMessages } from '@/lib/gw-api';

export async function GET(request: NextRequest) {
  try {
    const result = await callGWAPI('gmail.search', { q: 'is:unread', max: '15' });

    const emails = getMessages(result).map((email: any) => {
      const from = parseEmailFrom(email.from);
      return {
        id: email.id || email.messageId,
        threadId: email.threadId || email.id,
        from,
        subject: email.subject || '(No subject)',
        snippet: email.snippet || email.preview || '',
        date: email.date || email.receivedAt || new Date().toISOString(),
        unread: email.isUnread !== false,
        labels: (email.labels || []).filter(Boolean),
      };
    });

    return NextResponse.json({ emails, count: emails.length });
  } catch (error) {
    console.error('Error fetching inbox:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inbox', emails: [] },
      { status: 500 }
    );
  }
}
