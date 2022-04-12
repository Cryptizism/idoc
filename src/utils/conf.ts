import { parse } from 'yaml';
import fs from 'fs-extra';
import path from 'path';
import readdirFiles, { getExt, IFileDirStat } from 'recursive-readdir-files';

export interface Config {
  root: string;
  dir: string;
  output: string;
  chapters: Record<string, string>;
  asset: IFileDirStat[];
  config?: Partial<Record<'conf' | 'chapters', string>>;
  theme?: string;
  /** `<process.cwd()>/README.md` */
  readme?: string;
  /** site name */
  site?: string;
  /** Template Data */
  data?: Record<string, any>;
  version?: string;
  idocVersion?: string;
}

export type MenuData = {
  name: string;
  url?: string;
  active?: boolean;
};

export class Conf {
  constructor() {
    this.initConf();
  }
  data: Config = {
    root: process.cwd(),
    dir: path.resolve(process.cwd(), 'docs'),
    output: path.resolve(process.cwd(), 'dist'),
    chapters: {},
    config: {},
    asset: [],
    data: {},
  };
  get all() {
    return this.data;
  }
  async initConf() {
    const confPath = path.resolve(this.data.root, 'rdoc.yml');
    if (fs.existsSync(confPath)) {
      this.data.config.conf = confPath;
      const conf = await fs.readFile(confPath, 'utf8');
      const data: Config = parse(conf);
      if (data.dir) {
        data.dir = path.resolve(process.cwd(), data.dir);
      }
      if (data.output) {
        data.output = path.resolve(process.cwd(), data.output);
      }
      this.data = Object.assign(this.data, data);
      if (this.data.theme === 'default') {
        this.data.theme = path.resolve(new URL('../../themes/default', import.meta.url).pathname);
      }
    }
    this.getChaptersConf();
    this.getFiles();

    const pkgIdoc = await fs.readJSON(new URL('../../package.json', import.meta.url).pathname);
    this.data.idocVersion = pkgIdoc.version;
    const pkg = await fs.readJSON(path.resolve(this.data.root, 'package.json'));
    this.data.version = pkg.version;

    return this.data;
  }
  async getChaptersConf() {
    const chaptersPath = path.resolve(this.data.root, 'rdoc.chapters.yml');
    if (fs.existsSync(chaptersPath)) {
      this.data.config.chapters = chaptersPath;
      const chapters = await fs.promises.readFile(chaptersPath, 'utf8');
      this.data.chapters = parse(chapters) || {};
    }
  }
  async getFiles() {
    const files = await readdirFiles(this.data.dir, {
      ignored: /\/(node_modules|\.git)/,
    });
    this.data.asset = files;
    await this.getReadme();
  }
  async getReadme() {
    const readmePath = path.resolve(this.data.root, 'README.md');
    const existsReadme = this.data.asset.find((item) => /\/(readme.md)/.test(item.path.toString()));
    if (existsReadme) {
      this.data.readme = existsReadme.path;
    } else if (fs.existsSync(readmePath) && !existsReadme) {
      this.data.readme = readmePath;
      const stat = (await fs.promises.stat(readmePath)) as IFileDirStat;
      stat.path = path.resolve(this.data.root, 'README.md');
      stat.ext = await getExt(stat.path);
      stat.name = path.basename(stat.path);
      this.data.asset.push(stat);
    }
  }
  getRelativePath(toPath: string) {
    const rel = path.relative(path.dirname(toPath), config.data.output).split(path.sep).join('/');
    return rel ? rel + '/' : '';
  }
  getMenuData(toPath: string) {
    const data: MenuData[] = [];
    if (this.data.data.menus) {
      Object.keys(this.data.data.menus).forEach((key) => {
        const menu: MenuData = { name: key };
        const current = path.join(this.data.output, this.data.data.menus[key]);
        if (toPath === current) {
          menu.url = path.basename(current);
          menu.active = true;
        } else {
          const rel = path.relative(
            path.dirname(toPath),
            path.dirname(path.join(this.data.output, this.data.data.menus[key])),
          );
          if (rel.startsWith('..')) {
            menu.url = path.join(rel, this.data.data.menus[key]).split(path.sep).join('/');
          } else {
            menu.url = this.data.data.menus[key];
          }
        }
        data.push(menu);
      });
    }
    return data;
  }
}

export const config = new Conf();