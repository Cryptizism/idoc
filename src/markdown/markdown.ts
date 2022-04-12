import path from 'path';
import fs from 'fs-extra';
import { render, Data } from 'ejs';
import { Options } from '@wcj/markdown-to-html';
import formatter from '@uiw/formatter';
import { IFileDirStat } from 'recursive-readdir-files';
import autolinkHeadings from 'rehype-autolink-headings';
import markdownToHTML from '@wcj/markdown-to-html';
import ignore from 'rehype-ignore';
import slug from 'rehype-slug';
import { config, MenuData } from '../utils/conf.js';
import rehypeUrls from './rehype-urls.js';

export type TemplateData = {
  RELATIVE_PATH?: string;
  version?: string;
  idocVersion?: string;
  markdown?: string;
  openSource?: string;
  editButton?: {
    label: string;
    url: string;
  };
  edit?: string;
  title?: string;
  site?: string;
  menus?: MenuData[];
  fileStat: Partial<IFileDirStat> & {
    atimeStr?: string;
    mtimeStr?: string;
    ctimeStr?: string;
  };
  toc?: Toc[];
};

type Toc = {
  label?: string;
  href?: string;
  class?: string;
};

export async function createHTML(str: string = '', from: string, to: string) {
  const mdOptions: Options = {};
  const tocs: Toc[] = [];
  mdOptions.rehypePlugins = [
    [
      ignore,
      {
        openDelimiter: 'idoc:ignore:start',
        closeDelimiter: 'idoc:ignore:end',
      },
    ],
    [slug],
    [autolinkHeadings],
  ];

  mdOptions.rewrite = (node, index, parent) => {
    rehypeUrls(node);
    if (
      node.type == 'element' &&
      /h(1|2|3|4|5|6)/.test(node.tagName) &&
      node.children &&
      Array.isArray(node.children) &&
      node.children.length > 0
    ) {
      const tocItem: Toc = {};
      tocItem.class = `toc-${node.tagName}`;
      tocItem.href = node.properties.id as string;
      node.children = node.children.map((item) => {
        if (item.type === 'element' && item.tagName === 'a') {
          item.properties.class = 'anchor';
        }
        if (item.type === 'text') {
          tocItem.label = item.value;
        }
        return item;
      });
      tocs.push(tocItem);
    }
  };
  const mdHtml = (await markdownToHTML(str, mdOptions)) as string;
  const tempPath = path.resolve(config.data.theme, 'markdown.ejs');
  const tmpStr = await fs.readFile(tempPath);
  const data: Data & TemplateData = { fileStat: {}, tocs };
  data.markdown = mdHtml;
  data.site = config.data.site || 'idoc';
  data.title = config.data.site;
  data.version = config.data.version;
  data.idocVersion = config.data.idocVersion;
  data.RELATIVE_PATH = config.getRelativePath(to);

  if (config.data.data) {
    data.openSource = config.data.data.openSource || '';
    data.editButton = { ...config.data.data.editButton };
    if (data.editButton.url) {
      data.editButton.url = `${data.editButton.url.replace(/\/$/, '')}/${path.relative(config.data.root, from)}`;
    }
    if (config.data.data.menus) {
      data.menus = config.getMenuData(to);
    }
  }

  // File Stat
  data.fileStat = config.data.asset.find((item) => item.path === from) || {};
  const getKeys = <T>(obj: T) => Object.keys(obj) as Array<keyof T>;
  for (const key of getKeys(data.fileStat)) {
    if ((key === 'atime' || key === 'ctime' || key === 'mtime') && data.fileStat[key]) {
      data.fileStat = { ...data.fileStat, ...{ [`${key}Str`]: formatter('YYYY/MM/DD', data.fileStat[key]) as any } };
    }
  }
  return render(
    tmpStr.toString(),
    { ...config.data.data, ...data },
    {
      filename: tempPath,
    },
  );
}