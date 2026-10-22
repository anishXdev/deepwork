import { TaskPriority } from '../types';

const PRIORITY_TOKEN = /(^|\s)-\s*(urgent|high|normal|low|u|h|n|l)\b/ig;

export function parsePriorityShortcut(value: string): { title: string; priority?: TaskPriority } {
  let priority: TaskPriority | undefined;
  const title = value.replace(PRIORITY_TOKEN, (_match, space: string, token: string) => {
    const normalized = token.toLowerCase();
    priority = normalized === 'u' || normalized === 'urgent' ? 'urgent'
      : normalized === 'h' || normalized === 'high' ? 'high'
      : normalized === 'l' || normalized === 'low' ? 'low' : 'normal';
    return space;
  }).replace(/\s{2,}/g, ' ').trim();
  return { title, priority };
}
