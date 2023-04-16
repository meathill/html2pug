#!/usr/bin/env node

import yargs from 'yargs';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import puppeteer from "puppeteer";
import pick from 'lodash-es/pick.js';
import html2pug from './index.js';

const argv = yargs(process.argv.slice(2))
  .scriptName('html2pug')
  .usage('$0 [options] -i [file]')
  .example('$0 -i example.html', 'write to stdout')
  .example('$0 -i example.html -o example.pug', 'write to file')
  .example('$0 --url http://localhost:3000 --id app -o app.pug', 'Fetch webpage, convert `#app` into pug file')
  .option('i', {
    alias: 'input',
    describe: 'Input file',
    type: 'string',
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
  .option('n', {
    alias: 'newLine',
    describe: 'Use new line for each attribute',
    default: true,
    type: 'boolean',
  })
  .option('url', {
    describe: 'Which URL to fetch',
    type: 'string',
  })
  .option('w', {
    alias: 'wrapper',
    describe: 'Which DOM element should be converted',
    type: 'string',
  })
  .option('header', {
    describe: 'Add custom comment header',
    type: 'string',
  })
  .help('h')
  .alias('h', 'help')
  .version('v')
  .alias('v', 'version')
  .argv;

let input = '';
const cwd = process.cwd();
if (argv.input) {
  const file = resolve(cwd, argv.input);
  input = existsSync(file) ? await readFile(file, 'utf8') : argv.input;
} else if (argv.url && argv.wrapper) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(argv.url, {
    networkidle0: true,
  });
  await page.waitForSelector(argv.wrapper);
  const element = await page.$(argv.wrapper);
  input = await page.evaluate(element => element.innerHTML, element);
  await writeFile('test.html', input, 'utf8');
  await browser.close();
} else {
  console.error('No input file or URL');
  process.exit(1);
}

try {
  const pickKeys = ['fragment', 'tabs', 'commas', 'doubleQuotes', 'newLine', 'header'];
  const params = pick(argv, pickKeys);
  const output = html2pug(input, params);
  if (argv.output) {
    const to = resolve(cwd, argv.output);
    await writeFile(to, output, 'utf8');
  } else {
    console.log(output);
  }
} catch (e) {
  console.error(e);
}
