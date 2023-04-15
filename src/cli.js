#!/usr/bin/env node

import yargs from 'yargs';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import {fileURLToPath} from "url";
import html2pug from './index.js';

const argv = yargs(process.argv.slice(2))
  .scriptName('html2pug')
  .usage('$0 [options] -i [file]')
  .example('$0 -i example.html', 'write to stdout')
  .example('$0 -i example.html -o example.pug', 'write to file')
  .option('i', {
    alias: 'input',
    describe: 'Input file',
    type: 'string',
    demandOption: true,
  })
  .option('o', {
    alias: 'output',
    describe: 'Output file',
    type: 'string',
  })
  .option('f', {
    alias: 'fragment',
    describe: "Don't wrap in enclosing <html> tag",
    default: true,
    type: 'boolean',
  })
  .option('t', {
    alias: 'tabs',
    describe: 'Use tabs for indentation',
    default: false,
    type: 'boolean',
  })
  .option('c', {
    alias: 'commas',
    describe: 'Use commas to separate attributes',
    default: false,
    type: 'boolean',
  })
  .option('d', {
    alias: 'doubleQuotes',
    describe: 'Use double quotes for attribute values',
    default: true,
    type: 'boolean',
  })
  .help('h')
  .alias('h', 'help')
  .version('v')
  .alias('v', 'version')
  .argv;

const cwd = process.cwd();
const file = fileURLToPath(new URL(argv.input, cwd));
const input = existsSync(file) ? await readFile(file, 'utf8') : argv.input;
try {
  const output = html2pug(input, argv);
  if (argv.output) {
    const to = fileURLToPath(new URL(argv.output, cwd));
    await writeFile(to, output, 'utf8');
  } else {
    console.log(output);
  }
} catch (e) {
  console.error(e);
}
