export const EXPERTISE_TAGS = [
  // Returnable packaging & container management
  'Returnable Packaging',
  'Reusable Containers',
  'Fleet Management',
  'Container Planning',
  'Container Programs',
  // Expendable packaging
  'Expendable Packaging',
  'Corrugated',
  'Wood Packaging',
  'Foam Packaging',
  'Expendable Systems',
  'One-Way Packaging',
  'Export Packaging',
  // Packaging materials & technologies
  'Packaging Materials',
  'Plastics',
  'Films',
  'Paper',
  'Metals',
  'Coatings',
  'Emerging Materials',
  // Manufacturing & conversion
  'Packaging Manufacturing',
  'Thermoforming',
  'Fabrication',
  'Converting',
  'Molding',
  'Rack Manufacturing',
  'Dunnage',
  'Packaging Production',
  // Logistics & material flow
  'Logistics Engineering',
  'Material Flow',
  'Line-Side Delivery',
  'Warehousing',
  'Inbound Logistics',
  // Transportation & distribution
  'Freight',
  'Transportation Planning',
  'Distribution',
  'Shipping Density',
  'Freight Optimization',
  // Supply chain
  'Supply Chain',
  'Supply Chain Engineering',
  'Supply Chain Planning',
  'Supplier Coordination',
  'Supply Chain Strategy',
  // Procurement & sourcing
  'Packaging Procurement',
  'Commodity Management',
  'Strategic Sourcing',
  'Supplier Negotiations',
  // Sustainability
  'Circular Packaging',
  'Reuse',
  'Recycling',
  'Waste Reduction',
  'Circular Systems',
  'Carbon Reduction',
  'Sustainable Packaging',
  // Optimization & cost
  'Cube Utilization',
  'Packaging Efficiency',
  'Material Reduction',
  'Cost Reduction',
  // Operations & program management
  'Program Management',
  'Project Management',
  'Manufacturing Operations',
  'Launches',
  'APQP',
  'Implementation',
  // Automation, data & digital
  'Packaging Automation',
  'Tracking',
  'Software',
  'Data Analytics',
  'Systems Engineering',
  'Digital Supply Chain',
  // Sales & customer solutions
  'Technical Sales',
  'Account Management',
  'Strategic Accounts',
  'Business Development',
  'Customer Solutions',
  // Leadership, consulting & education
  'Executive Leadership',
  'Strategy',
  'Consulting',
  'Research',
  'Academia',
  'Industry Education',
] as const;

export type ExpertiseTag = (typeof EXPERTISE_TAGS)[number];

export function normalizeExpertiseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(EXPERTISE_TAGS);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const tag = String(item || '').trim();
    if (!tag || !allowed.has(tag) || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}
