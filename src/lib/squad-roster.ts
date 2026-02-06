// Static squad roster - shows all team members regardless of runtime state

export interface SquadMember {
  id: string;
  name: string;
  role: string;
  emoji?: string;
  children?: SquadMember[];
}

export const SQUAD_ROSTER: SquadMember[] = [
  {
    id: 'hex',
    name: 'Hex',
    role: 'Chief of Staff',
    emoji: '🔮',
    children: [
      {
        id: 'knox',
        name: 'Knox',
        role: 'Architect',
        emoji: '🏗️',
        children: [
          { id: 'aria', name: 'Aria', role: 'Frontend', emoji: '🎨' },
          { id: 'vault', name: 'Vault', role: 'Backend', emoji: '🗄️' },
          { id: 'scout', name: 'Scout', role: 'Junior Dev', emoji: '🔍' },
        ],
      },
      {
        id: 'sterling',
        name: 'Sterling',
        role: 'Marketing Director',
        emoji: '📈',
        children: [
          { id: 'slate', name: 'Slate', role: 'Blog Writer', emoji: '🖋️' },
          { id: 'pulse', name: 'Pulse', role: 'Social', emoji: '📱' },
          { id: 'reach', name: 'Reach', role: 'Outreach', emoji: '📧' },
          { id: 'iris', name: 'Iris', role: 'Inbound', emoji: '🎯' },
        ],
      },
      {
        id: 'recon',
        name: 'Recon',
        role: 'Research',
        emoji: '🔬',
      },
    ],
  },
];
