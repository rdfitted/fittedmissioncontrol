/**
 * Shared Google Workspace API client
 * 
 * Single source of truth for URL, token, and response parsing.
 * All API routes should import from here instead of hardcoding.
 */

const GW_API_URL = 'https://script.google.com/macros/s/AKfycbzQe1ixyONJL5ipupjqy8PNHete7dNR9Eh6hTHX8LoJXYKFIdzsqltNqPuKSHC1Pg5_Rw/exec';
const GW_API_TOKEN = 'hex-gw-de367888df121a87e8156750';

export interface GWResponse {
  ok?: boolean;
  success?: boolean;
  error?: string;
  [key: string]: any;
}

/**
 * Call the Google Workspace API
 * 
 * @param action - API action (gmail.search, gmail.unread, gmail.draft, gmail.send, calendar.today, etc.)
 * @param params - Additional query parameters
 * @returns Parsed JSON response
 */
export async function callGWAPI(action: string, params: Record<string, string> = {}): Promise<GWResponse> {
  const queryParams = new URLSearchParams({
    token: GW_API_TOKEN,
    action,
    ...params,
  });

  const response = await fetch(`${GW_API_URL}?${queryParams.toString()}`);
  const result = await response.json();

  // Check for explicit errors (some actions don't return ok/success)
  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Parse a "from" field that can be either:
 * - A string like "Name <email@example.com>"
 * - An object like { name: "Name", email: "email@example.com" }
 */
export function parseEmailFrom(from: any): { name: string; email: string } {
  if (typeof from === 'string') {
    const match = from.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    return { name: from, email: from };
  }
  if (from && typeof from === 'object') {
    return { name: from.name || 'Unknown', email: from.email || '' };
  }
  return { name: 'Unknown', email: '' };
}

/**
 * Check if a GW API response indicates success.
 * Different actions return different shapes — this handles all of them.
 */
export function isSuccess(result: GWResponse): boolean {
  if (result.error) return false;
  // Some actions return ok, some return success, some return neither (just data)
  return result.ok !== false && result.success !== false;
}

/**
 * Get messages/emails from a GW API response.
 * Handles both "messages" and "emails" keys.
 */
export function getMessages(result: GWResponse): any[] {
  return result.messages || result.emails || [];
}
