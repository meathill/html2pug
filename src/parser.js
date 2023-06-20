const DOCUMENT_TYPE_NODE = '#documentType'
const TEXT_NODE = '#text'
const DIV_NODE = 'div'
const COMMENT_NODE = '#comment'
const COMMENT_NODE_PUG = '//'

const hasSingleTextNodeChild = node => {
  return (
    node.childNodes &&
    node.childNodes.length === 1 &&
    node.childNodes[0].nodeName === TEXT_NODE
  )
}

class Parser {
  constructor(root, options = {}) {
    this.root = root

    const { tabs, commas, doubleQuotes, newLine, header } = options
    this.pug = header ? '///- ' + header : '';

    // Tabs or spaces
    this.indentStyle = tabs ? '\t' : '  '
    // Comma separate attributes
    this.separatorStyle = commas ? ', ' : ' '
    // Single quotes or double
    this.quoteStyle = doubleQuotes ? '"' : "'"
    // New line or no new line
    this.newLineStyle = newLine;
  }

  getIndent(level = 0) {
    return this.indentStyle.repeat(level)
  }

  getSeparator(level) {
    if (!this.newLineStyle) return this.separatorStyle;

    return `${this.separatorStyle}\n${this.getIndent(level)}`;
  }

  parse() {
    const walk = this.walk(this.root.childNodes, 0)
    let it

    do {
      it = walk.next()
    } while (!it.done)

    return this.pug.substring(1)
  }

  /**
   * DOM tree traversal
   * Depth-first search (pre-order)
   *
   * @param {DOM} tree - DOM tree or Node
   * @param {Number} level - Current tree level
   */
  *walk(tree, level) {
    if (!tree) {
      return
    }

    for (let i = 0; i < tree.length; i++) {
      const node = tree[i]

      const newline = this.parseNode(node, level)
      if (newline) {
        this.pug += `\n${newline}`
      }

      if (
        node.childNodes &&
        node.childNodes.length > 0 &&
        !hasSingleTextNodeChild(node)
      ) {
        yield* this.walk(node.childNodes, level + 1)
      }
    }
  }

  /*
   * Returns a Pug node name with all attributes set in parentheses.
   */
  getNodeWithAttributes(node, level) {
    const { tagName, attrs } = node
    const attributes = []
    const classes = [];
    let pugNode = tagName

    if (!attrs) {
      return pugNode
    }

    // Add CSS selectors to pug node and append any element attributes to it
    for (const attr of attrs) {
      const { name, value } = attr

      // Remove div tag if a selector is present (shorthand)
      // e.g. div#form() -> #form()
      const hasSelector = name === 'id' || name === 'class'
      if (tagName === DIV_NODE && hasSelector) {
        pugNode = pugNode.replace(DIV_NODE, '')
      }

      switch (name) {
        case 'id':
          pugNode = pugNode
            ? pugNode.replace(/^(\s*[\w-]+)/, `$1#${value}`)
            : '#' + value;
          break
        case 'class':
          for (const className of value.split(' ')) {
            if (/[:[\].]/.test(className) || className.startsWith('-')) {
              classes.push(className)
            } else {
              pugNode += `.${className}`
            }
          }
          break
        default: {
          // Add escaped single quotes (\') to attribute values
          const val = value.replace(/'/g, "\\'")
          const quote = this.quoteStyle
          attributes.push(val ? `${name}=${quote}${val}${quote}` : name)
          break
        }
      }
    }

    if (classes.length) {
      attributes.unshift(`class="${classes.join(' ')}"`);
    }
    if (attributes.length) {
      pugNode += '(' + (this.newLineStyle ? '\n' + this.getIndent(level + 1) : '');
      pugNode += attributes.join(this.getSeparator(level + 1));
      if (this.newLineStyle) {
        pugNode += '\n' + this.getIndent(level);
      }
      pugNode += ')';
    }

    return pugNode
  }

  /**
   * formatPugNode applies the correct indent for the current line,
   * and formats the value as either as a single or multiline string.
   *
   * @param {String} node - The pug node (e.g. header(class='foo'))
   * @param {String} value - The node's value
   * @param {Number} level - Current tree level to generate indent
   * @param {String} blockChar - The character used to denote a multiline value
   */
  formatPugNode(node, value = '', level, blockChar = '.') {
    const indent = this.getIndent(level)
    const result = `${indent}${node}`

    const lines = value.split('\n')
    let hasTrailingNewline = false;
    if (lines[0] === '') {
      lines.shift();
    }
    if (lines[lines.length - 1] === '') {
      hasTrailingNewline = true;
      lines.pop();
    }

    // Create an inline node
    if (lines.length <= 1) {
      return value.length ? `${result} ${lines[0]}` : result
    }

    // Create a multiline node
    const indentChild = this.getIndent(level + 1)
    const multiline = lines.map(line => `${indentChild}${line}`).join('\n')
      // add trailing newline
      + (hasTrailingNewline ? '\n' : '');

    return `${result}${blockChar}\n${multiline}`
  }

  /**
   * createDoctype formats a #documentType element
   */
  createDoctype(node, level) {
    const indent = this.getIndent(level)
    return `${indent}doctype html`
  }

  /**
   * createComment formats a #comment element.
   *
   * Block comments in Pug don't require the dot '.' character.
   */
  createComment(node, level) {
    return this.formatPugNode(COMMENT_NODE_PUG, node.data, level, '')
  }

  /**
   * createText formats a #text element.
   *
   * A #text element containing only line breaks (\n) indicates
   * unnecessary whitespace between elements that should be removed.
   *
   * Actual text in a single #text element has no significant
   * whitespace and should be treated as inline text.
   */
  createText(node, level) {
    let { value } = node
    const indent = this.getIndent(level)

    // Omit line breaks between HTML elements
    if (/^\n+$/.test(value)) {
      return false
    }

    // remove starting and trailing line breaks
    value = value.replace(/^\n+|\n+$/g, '')

    return `${indent}| ${value}`
  }

  /**
   * createElement formats a generic HTML element.
   */
  createElement(node, level) {
    const pugNode = this.getNodeWithAttributes(node, level)

    const value = hasSingleTextNodeChild(node)
      ? node.childNodes[0].value
      : node.value

    return this.formatPugNode(pugNode, value, level)
  }

  parseNode(node, level) {
    const { nodeName } = node

    switch (nodeName) {
      case DOCUMENT_TYPE_NODE:
        return this.createDoctype(node, level)

      case COMMENT_NODE:
        return this.createComment(node, level)

      case TEXT_NODE:
        return this.createText(node, level)

      default:
        return this.createElement(node, level)
    }
  }
}

export default Parser;
