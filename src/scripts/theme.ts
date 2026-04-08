import { getSettings, saveSettings } from './storage';

export function initTheme(): void {
  const { theme } = getSettings();
  applyTheme(theme);
}

export function applyTheme(theme: 'dark' | 'light'): void {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}

export function toggleTheme(): 'dark' | 'light' {
  const { theme } = getSettings();
  const next: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark';
  saveSettings({ theme: next });
  applyTheme(next);
  return next;
}
