import fs from 'fs/promises';
import path from 'path';

// Base directories for content (relative to project root, up one level)
const PROJECT_ROOT = path.join(process.cwd(), '..');

export const CONTENT_SOURCES = {
  blog: path.join(PROJECT_ROOT, 'squad', 'drafts', 'articles'),
  research: path.join(PROJECT_ROOT, 'squad', 'drafts', 'research'),
  social: path.join(PROJECT_ROOT, 'squad', 'deliverables', 'social'),
  content: path.join(PROJECT_ROOT, 'squad', 'deliverables', 'content'),
  outreach: path.join(PROJECT_ROOT, 'squad', 'deliverables', 'outreach'),
} as const;

export type ContentType = keyof typeof CONTENT_SOURCES;

// UI-friendly type alias (backwards compatibility)
export type ContentTypeUI = 'blog' | 'social' | 'research' | 'outreach';

export type ContentStatus = 'draft' | 'review' | 'approved' | 'published';

export interface ContentItem {
  id: string;           // Unique ID (hash of filepath)
  filename: string;     // Original filename
  filepath: string;     // Full path relative to project
  type: ContentType;    // Source type
  title: string;        // Extracted from content (H1 or filename)
  author?: string;      // From frontmatter, content, or inferred
  date?: string;        // ISO date string if found
  preview: string;      // First ~200 chars of content
  status: ContentStatus;
  createdAt: number;    // File creation time (Unix ms)
  modifiedAt: number;   // File modification time (Unix ms)
  size: number;         // File size in bytes
}

export interface ContentMetadata {
  status?: ContentStatus;
  reviewedBy?: string;
  reviewedAt?: number;
  approvedBy?: string;
  approvedAt?: number;
  publishedAt?: number;
  publishedUrl?: string;
}

// Metadata storage file
const METADATA_FILE = path.join(PROJECT_ROOT, 'squad', 'content-metadata.json');

// Known agent authors by directory/file patterns
const AUTHOR_PATTERNS: Record<string, string> = {
  'slate': 'Slate',
  'recon': 'Recon',
  'pulse': 'Pulse',
  'reach': 'Reach',
  'iris': 'Iris',
  'sterling': 'Sterling',
};

// ============ Helpers ============

function generateContentId(filepath: string): string {
  // Simple hash of filepath
  let hash = 0;
  for (let i = 0; i < filepath.length; i++) {
    const char = filepath.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `content-${Math.abs(hash).toString(36)}`;
}

function extractTitle(content: string, filename: string): string {
  // Try to find H1 heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  
  // Fall back to filename without extension
  return filename
    .replace(/\.(md|txt|json)$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function extractAuthor(content: string, filepath: string): string | undefined {
  // Check for author in frontmatter-style metadata
  const authorMatch = content.match(/^\*?(?:Author|By|Research by|Written by)[:\s]+(.+?)\*?$/mi);
  if (authorMatch) {
    return authorMatch[1].trim().replace(/^\*|\*$/g, '');
  }
  
  // Check filepath for known agent patterns
  const lowerPath = filepath.toLowerCase();
  for (const [pattern, author] of Object.entries(AUTHOR_PATTERNS)) {
    if (lowerPath.includes(pattern)) {
      return author;
    }
  }
  
  return undefined;
}

function extractDate(content: string, stats: { mtime: Date }): string | undefined {
  // Try to find date in content
  const datePatterns = [
    /^\*?(?:Date|Last updated|Published)[:\s]+(.+?)\*?$/mi,
    /\*([A-Z][a-z]+ \d{1,2}, \d{4})/m,  // *February 6, 2026
    /^(\d{4}-\d{2}-\d{2})/m,  // 2026-02-06
  ];
  
  for (const pattern of datePatterns) {
    const match = content.match(pattern);
    if (match) {
      try {
        const parsed = new Date(match[1].replace(/\*/g, '').trim());
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
      } catch {
        // Continue to next pattern
      }
    }
  }
  
  // Fall back to file modification date
  return stats.mtime.toISOString().split('T')[0];
}

function extractPreview(content: string, maxLength = 200): string {
  // Strip markdown formatting and get first paragraph after title
  let text = content
    .replace(/^#.*$/gm, '')  // Remove headings
    .replace(/^\*.*\*$/gm, '') // Remove emphasis lines (like date lines)
    .replace(/^---+$/gm, '')   // Remove horizontal rules
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links to text
    .replace(/[*_`]/g, '')     // Remove inline formatting
    .trim();
  
  // Get first substantial paragraph
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);
  const firstPara = paragraphs[0] || text;
  
  // Truncate and add ellipsis
  if (firstPara.length > maxLength) {
    return firstPara.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }
  
  return firstPara;
}

// ============ Metadata Storage ============

async function loadMetadata(): Promise<Record<string, ContentMetadata>> {
  try {
    const content = await fs.readFile(METADATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function saveMetadata(metadata: Record<string, ContentMetadata>): Promise<void> {
  const dir = path.dirname(METADATA_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

// ============ Content Discovery ============

async function scanDirectory(
  dir: string,
  type: ContentType,
  metadata: Record<string, ContentMetadata>
): Promise<ContentItem[]> {
  const items: ContentItem[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subItems = await scanDirectory(
          path.join(dir, entry.name),
          type,
          metadata
        );
        items.push(...subItems);
        continue;
      }
      
      // Only process markdown and text files
      if (!entry.name.match(/\.(md|txt)$/i)) {
        continue;
      }
      
      const filepath = path.join(dir, entry.name);
      const relativePath = path.relative(PROJECT_ROOT, filepath);
      
      try {
        const [content, stats] = await Promise.all([
          fs.readFile(filepath, 'utf-8'),
          fs.stat(filepath),
        ]);
        
        const id = generateContentId(relativePath);
        const itemMetadata = metadata[id] || {};
        
        items.push({
          id,
          filename: entry.name,
          filepath: relativePath.replace(/\\/g, '/'),
          type,
          title: extractTitle(content, entry.name),
          author: extractAuthor(content, relativePath),
          date: extractDate(content, stats),
          preview: extractPreview(content),
          status: itemMetadata.status || 'draft',
          createdAt: stats.birthtime.getTime(),
          modifiedAt: stats.mtime.getTime(),
          size: stats.size,
        });
      } catch (err) {
        console.error(`Error reading ${filepath}:`, err);
      }
    }
  } catch {
    // Directory doesn't exist, return empty
  }
  
  return items;
}

// ============ Public API ============

export interface GetContentOptions {
  type?: ContentType;
  status?: ContentStatus;
  author?: string;
  limit?: number;
  offset?: number;
}

export interface ContentListResult {
  items: ContentItem[];
  total: number;
  types: Record<ContentType, number>;
}

/**
 * Get all content items from all sources
 */
export async function getAllContent(options: GetContentOptions = {}): Promise<ContentListResult> {
  const metadata = await loadMetadata();
  let allItems: ContentItem[] = [];
  
  // Scan each source directory
  for (const [type, dir] of Object.entries(CONTENT_SOURCES)) {
    if (options.type && options.type !== type) {
      continue;
    }
    
    const items = await scanDirectory(dir, type as ContentType, metadata);
    allItems.push(...items);
  }
  
  // Apply filters
  if (options.status) {
    allItems = allItems.filter(item => item.status === options.status);
  }
  if (options.author) {
    const lowerAuthor = options.author.toLowerCase();
    allItems = allItems.filter(item => 
      item.author?.toLowerCase().includes(lowerAuthor)
    );
  }
  
  // Sort by modified date (newest first)
  allItems.sort((a, b) => b.modifiedAt - a.modifiedAt);
  
  // Calculate type counts before pagination
  const types: Record<ContentType, number> = {
    blog: 0,
    research: 0,
    social: 0,
    content: 0,
    outreach: 0,
  };
  for (const item of allItems) {
    types[item.type]++;
  }
  
  const total = allItems.length;
  
  // Apply pagination
  if (options.offset) {
    allItems = allItems.slice(options.offset);
  }
  if (options.limit) {
    allItems = allItems.slice(0, options.limit);
  }
  
  return { items: allItems, total, types };
}

/**
 * Get a single content item by ID
 */
export async function getContentById(id: string): Promise<ContentItem | null> {
  const { items } = await getAllContent();
  return items.find(item => item.id === id) || null;
}

/**
 * Get full content of an item
 */
export async function getContentFull(id: string): Promise<{ item: ContentItem; content: string } | null> {
  const { items } = await getAllContent();
  const item = items.find(i => i.id === id);
  
  if (!item) return null;
  
  try {
    const fullPath = path.join(PROJECT_ROOT, item.filepath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return { item, content };
  } catch {
    return null;
  }
}

/**
 * Update content metadata (status, reviewer, etc.)
 */
export async function updateContentStatus(
  id: string,
  status: ContentStatus,
  actor: string
): Promise<ContentItem | null> {
  const metadata = await loadMetadata();
  
  const item = await getContentById(id);
  if (!item) return null;
  
  const itemMeta: ContentMetadata = metadata[id] || {};
  const now = Date.now();
  
  itemMeta.status = status;
  
  switch (status) {
    case 'review':
      itemMeta.reviewedBy = actor;
      itemMeta.reviewedAt = now;
      break;
    case 'approved':
      itemMeta.approvedBy = actor;
      itemMeta.approvedAt = now;
      break;
    case 'published':
      itemMeta.publishedAt = now;
      break;
  }
  
  metadata[id] = itemMeta;
  await saveMetadata(metadata);
  
  return { ...item, status };
}
