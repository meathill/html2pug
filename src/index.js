import { minify } from 'html-minifier';
import { parse, parseFragment } from 'parse5';
import Pugify from './parser.js';

const defaultOptions = {
  // html2pug options
  fragment: false,
  tabs: false,
  commas: true,
  doubleQuotes: false,
  newLine: true,

  // html-minifier options
  caseSensitive: true,
  removeEmptyAttributes: true,
  collapseWhitespace: true,
  collapseBooleanAttributes: true,
  preserveLineBreaks: true,
}

export default (sourceHtml, options = {}) => {
  // Minify source HTML
  const opts = { ...defaultOptions, ...options }
  const html = minify(sourceHtml, opts)

  const {
    fragment,
    tabs,
    commas,
    doubleQuotes,
    newLine,
    header,
  } = opts

  // Parse HTML and convert to Pug
  const doc = fragment ? parseFragment(html) : parse(html)
  const pugify = new Pugify(doc, {
    tabs,
    commas,
    doubleQuotes,
    newLine,
    header,
  })
  return pugify.parse()
}
