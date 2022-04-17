import path from 'path';
import { config, isScope } from '../utils/conf.js';

export type Chapters = {
  from?: string;
  to?: string;
  relative?: string;
  href?: string;
  current?: string;
  label?: string;
  isFolder?: boolean;
  active?: boolean;
};

export function formatChapters(arr: Array<Record<string, string>> = [], current?: string): Chapters[] {
  const findScope = config.data.scope.find((item) => isScope(current, item));
  const chapters = arr.map((item) => {
    const obj: Chapters = {};
    Object.keys(item).forEach((key) => {
      obj.from = path.resolve(config.data.dir, key).split(path.sep).join('/');
      obj.to = path
        .resolve(config.data.output, key)
        .replace(/\.(md|markdown)/i, '.html')
        .split(path.sep)
        .join('/')
        .replace(/\/(README).html$/i, '/index.html');
      obj.relative = key.replace(/\/$/, '');
      obj.label = item[key];
      obj.isFolder = !obj.to.endsWith('.html');
      obj.active = current === obj.to;
      obj.href = path
        .relative(path.dirname(current), obj.to)
        .split(path.sep)
        .join('/')
        .replace(/\/(README).(html|md|markdown)$/i, '/index.html');
    });
    if (!isScope(obj.to, findScope) && config.data.scope.length > 0) {
      return;
    }
    return obj;
  });
  return [...chapters].filter(Boolean);
}