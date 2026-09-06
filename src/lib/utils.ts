export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function normalizeTopic(topic: string): string {
  if (!topic) return '';
  
  // Convert to lowercase, replace spaces and underscores with hyphens
  let normalized = topic.toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  
  // Handle special cases: unit1 -> unit-1, unit2 -> unit-2, etc.
  normalized = normalized.replace(/^unit(\d+)$/i, 'Unit-$1');
  
  // Capitalize first letter of each word separated by hyphens
  normalized = normalized
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-');
  
  // Handle known patterns
  const unitMatch = normalized.match(/^Unit-(\d+)$/i);
  if (unitMatch) {
    return `Unit-${unitMatch[1]}`;
  }
  
  return normalized;
}
