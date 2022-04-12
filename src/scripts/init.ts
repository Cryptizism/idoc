import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import { copyFile } from '../utils/copy.js';

export async function init(folder: string) {
  const initFolder = path.resolve(process.cwd(), folder);
  const option = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      default: path.basename(initFolder) || 'my-app',
      message: 'new project name',
    },
    {
      type: 'confirm',
      name: 'force',
      default: false,
      message: 'Whether to force regeneration of catalog files',
    },
    {
      type: 'confirm',
      name: 'theme',
      default: false,
      message: 'Whether to customize the template(\x1b[34;1mTheme\x1b[0m)',
    },
    {
      type: 'input',
      name: 'dir',
      default: 'docs',
      message: 'Modify the specified document directory location',
      filter: (input) => path.resolve(initFolder, input || 'docs'),
    },
    {
      type: 'input',
      name: 'output',
      default: 'dist',
      message: 'Modify the specified output static page directory location',
      filter: (input) => path.resolve(initFolder, input || 'dist'),
    },
  ]);

  if (option.force) {
    await fs.remove(initFolder);
  }
  if (!fs.existsSync(initFolder)) {
    await fs.ensureDir(initFolder);
  } else {
    console.log(`\n  \x1b[31;1mError:\x1b[0m Directory already exists!`);
    console.log(`   ╰┈\x1b[31;1m✗\x1b[0m folder: \x1b[33;1m${initFolder}\x1b[0m`);
  }

  if (option.theme) {
    const themepath = path.resolve(__dirname, '../../themes');
    await fs.copy(themepath, path.resolve(initFolder, 'themes'));
  }

  const temp = path.resolve(__dirname, '../../template/');
  const pkg = await fs.readJSON(path.resolve(temp, 'package.json'));

  await copyFile(path.resolve(temp, 'rdoc.yml'), path.resolve(initFolder, 'rdoc.yml'), {
    dir: path.basename(option.dir),
    output: path.basename(option.output),
    site: option.projectName,
    theme: option.theme ? 'themes/default' : 'default',
  });

  await copyFile(path.resolve(temp, 'package.json'), path.resolve(initFolder, 'package.json'), {
    name: option.projectName,
    version: pkg.version,
  });

  await fs.copy(path.resolve(temp, 'docs'), option.dir);
  console.log();
  console.log(` \x1b[32;1m✔\x1b[0m Start documentation with \x1b[35;1midoc\x1b[0m!`);
  console.log();
}