const valueRegex = /^\s*([a-zA-Z0-9_]*):\s([a-zA-Z0-9/\-:._ \\{"]*)$/;
const objectRegex = /^\s*([a-zA-Z0-9_]*)\s{$/;
const supportedTypes = [
    "string",
    "int",
    "float",
    "bool",
    "custom",
    "object",
    "tree"
];

class DefTreeNode {
    /**
     * @type {string}
     * @private
     */
    _key;
    /**
     * @type {string}
     * @private
     */
    _type;
    /**
     * @type {string|number|boolean|DefTreeNode}
     * @private
     */
    _value;
    /**
     * @type {Array.<DefTreeNode>}
     * @private
     */
    _nodes;

    constructor(key, type, value) {
        this._key = key;
        this._type = type;
        this._value = value;
        this._nodes = [];
    }

    /**
     * @returns {string} The current key of node
     */
    getKey() {
        return this._key;
    }

    /**
     * @param {string} key The new key to apply to node
     */
    setKey(key) {
        this._key = key;
    }

    /**
     * @returns {string} The current type of node
     */
    getType() {
        return this._type;
    }

    /**
     * @param {string} type The new type to apply to node
     */
    setType(type) {
        if (!supportedTypes.includes(type)) {
            throw new Error(`Not supported node type: '${type}'`);
        }
        this._type = type;
    }

    /**
     * @returns {string|number|boolean|DefTreeNode} The current value of node
     */
    getValue() {
        return this._type === "tree" ? this._nodes : this._value;
    }

    /**
     * @param {string|number|boolean|DefTreeNode} value The new value to apply to node
     */
    setValue(value) {
        // TODO: add type checking for provided value
        this._value = value;
    }

    /**
     * @returns {Array.<DefTreeNode>} Children nodes of the node
     */
    getNodes() {
        return this._nodes;
    }
}

/**
 * @param {DefTreeNode} tree Tree to serialize
 * @param {number} level Level of offset, actually tab offset
 * @param {boolean} isRoot Is the tree is root tree
 * @returns {string} Serialized tree
 */
function _serializeTree(tree, level, isRoot) {
    let serialized = "";
    for (const node of tree.getNodes()) {
        serialized += _serializeNode(node, level, isRoot);
    }
    return serialized;
}

/**
 * @param {DefTreeNode} node Node to serialize
 * @param {number} level Level of offset, actually tab offset
 * @param {boolean} isRoot Is the node is root
 * @returns {string} Serialized node
 */
function _serializeNode(node, level, isRoot) {
    if (node.getType() === "tree") {
        let serialized = _serializeTree(node, 0, false);
        serialized = serialized.replaceAll(/(?<!\\)(\\")/g, "\\\\\\\"");
        serialized = serialized.replaceAll(/(?<!\\)(")/g, "\\\"");
        serialized = serialized.replaceAll(/(?<!\\)(\\n)/g, "\\\\n");
        serialized = serialized.replaceAll(/(?<!n)(\n)/g, "\\n\n");
        if (isRoot) {
            const lines = serialized.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
                if (i === 0) {
                    lines[i] = lines[i] + "\"";
                    continue;
                }
                lines[i] = `${"  ".repeat(level)}` + "\"" + lines[i] + "\"";
            }
            serialized = lines.join("\n");
        }
        serialized = `${"  ".repeat(level)}` + `${node.getKey()}: "` + serialized;
        serialized = serialized + (isRoot ? "\n" : "\"\n");
        return serialized;
    } else if (node.getType() === "object") {
        return _serializeObjectNode(node, level, isRoot);
    } else {
        return _serializeValueNode(node, level);
    }
}

/**
 * @param {DefTreeNode} node Value node to serialize
 * @param {number} level Level of offset, actually tab offset
 * @returns {string} Serialized value node
 */
function _serializeValueNode(node, level) {
    if (node.getType() === "float" || node.getType() === "int") {
        return `${"  ".repeat(level)}${node.getKey()}: ${node.getType() === "int" ? node.getValue() : (node.getValue() % 1 === 0 ? node.getValue() + ".0" : node.getValue())}\n`;
    } else if (node.getType() === "string") {
        return `${"  ".repeat(level)}${node.getKey()}: "${node.getValue()}"\n`;
    } else {
        return `${"  ".repeat(level)}${node.getKey()}: ${node.getValue()}\n`;
    }
}

/**
 * @param {DefTreeNode} node Object to serialize
 * @param {number} level Level of offset, actually tab offset
 * @param {boolean} isRoot Is the node is root
 * @returns {string} Serialized object node
 */
function _serializeObjectNode(node, level, isRoot) {
    let serialized = "";
    serialized += `${"  ".repeat(level)}${node.getKey()} {\n`;
    for (const child of node.getNodes()) {
        serialized += _serializeNode(child, level + 1, isRoot);
    }
    serialized += `${"  ".repeat(level)}}\n`;
    return serialized;
}

/**
 * @param {string} content Content to deserialize
 * @param {string} key How to name tree
 * @returns {DefTreeNode} Node of deserialized trees
 */
function _deserializeTree(content, key = "root") {
    const node = new DefTreeNode(key, "tree", null);
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        i += _deserializeNode(node, i, lines) - 1;
    }
    return node;
}

/**
 * @param {DefTreeNode} parent Parent which will own parsed node
 * @param {number} lineIndex Line index to deserialize from
 * @param {Array.<string>} lines Array of strings to deserialize
 * @returns {number} Amount of deserialize lines
 */
function _deserializeNode(parent, lineIndex, lines) {
    let parsedLines = 1;
    const line = lines[lineIndex];
    if (!line) {
        return parsedLines;
    }
    if (_isValue(line)) {
        const match = valueRegex.exec(line);
        // eslint-disable-next-line no-unused-vars
        const [_, key, value] = match;
        if (_isSubTreeValue(value)) {
            const subTreeRaw = _getSubTreeRaw(lineIndex, lines);
            parent.getNodes().push(_deserializeTree(subTreeRaw.content, key));
            parsedLines += subTreeRaw.parsedLines - 1;
        } else {
            const node = new DefTreeNode(key, "value", value);
            parent.getNodes().push(_strictTypesForNode(node));
        }
    } else if (_isObjectStart(line)) {
        const match = objectRegex.exec(line);
        // eslint-disable-next-line no-unused-vars
        const [_, key] = match;
        const node = new DefTreeNode(key, "object", null);
        parent.getNodes().push(node);
        while (!_isObjectEnd(lines[lineIndex + parsedLines])) {
            parsedLines += _deserializeNode(node, lineIndex + parsedLines, lines);
        }
        parsedLines++;
    } else {
        throw new Error("Can't identify a line while parsing: " + lineIndex);
    }
    return parsedLines;
}

/**
 * @param {DefTreeNode} node Node to strict
 * @returns {DefTreeNode} Returns provided, but stricted node
 */
function _strictTypesForNode(node) {
    if (isNaN(node.getValue())) {
        if (node.getValue() === "true" || node.getValue() === "false") {
            node.setType("bool");
            node.setValue(node.getValue() === "true");
        } else if (node.getValue().startsWith("\"") && node.getValue().endsWith("\"")) {
            node.setType("string");
            node.setValue(node.getValue().replaceAll("\"", ""));
        } else {
            node.setType("custom");
        }
    } else {
        if (node.getValue().includes(".")) {
            node.setType("float");
            node.setValue(Number.parseFloat(node.getValue()));
        } else {
            node.setType("int");
            node.setValue(Number.parseInt(node.getValue()));
        }
    }
    return node;
}

/**
 * @param {string} line Line to check
 * @returns {boolean} Returns true if the line has value pattern
 */
function _isValue(line) {
    return valueRegex.test(line);
}

/**
 * @param {string} line Line to check
 * @returns {boolean} Returns true if the line is start of a sub-tree
 */
function _isSubTreeValue(line) {
    if (line.startsWith("\"") && line.endsWith("\"")) {
        let valueNoQuotes = line.substring(1, line.length - 1);
        valueNoQuotes = valueNoQuotes.replaceAll(/(\\+n)/g, "");
        valueNoQuotes = valueNoQuotes.replaceAll(/(\\+")/g, "");
        return _isValue(valueNoQuotes) || _isObjectStart(valueNoQuotes);
    }
    return false;
}

/**
 * @param {string} line Line to check
 * @returns {boolean} Returns true if the line is the end of a sub-tree
 */
function _isSubTreeEnd(line) {
    return line.trim() === "\"\"";
}

/**
 * @param {string} line Line to check
 * @returns {boolean} Returns true if the line is the start of the object
 */
function _isObjectStart(line) {
    return objectRegex.test(line);
}

/**
 * @param {string} line Line to check
 * @returns {boolean} Returns true if the line is the end of object
 */
function _isObjectEnd(line) {
    return line.endsWith("}");
}

/**
 * @param {string} line The line where to find
 * @returns {number} The index of found quoute starts from the left of the line
 */
function _getFirstQuotesIndex(line) {
    for (let i = 0; i < line.length; i++) {
        if (line[i] === "\"") {
            return i;
        }
    }
    return -1;
}

/**
 * @param {string} line The line where to find
 * @returns {number} The index of found quoute starts from the right of the line
 */
function _getLastQuotesIndex(line) {
    for (let i = line.length - 1; i >= 0; i--) {
        if (line[i] === "\"") {
            return i;
        }
    }
    return -1;
}

/**
 * @param {number} lineIndex Line index to read from
 * @param {Array.<string>} lines Array of strings of defold sub-tree
 * @returns {object} Return the parsed subtree, has two fields the one
 * is amount of processed lines and the second is actually subtree
 */
function _getSubTreeRaw(lineIndex, lines) {
    let parsedLines = 0;
    let content = "";
    for (let i = lineIndex; i < lines.length; i++) {
        parsedLines++;
        const line = lines[i];
        if (_isSubTreeEnd(line)) {
            break;
        }
        const firstQuotesIndex = _getFirstQuotesIndex(line);
        const lastQuotesIndex = _getLastQuotesIndex(line);
        content += line.substring(firstQuotesIndex + 1, lastQuotesIndex) + "\n";
    }
    content = content.replaceAll(/(?<!\\)(\\\\n\n)/g, "\"\n\"");
    content = content.replaceAll(/(?<!\\)(\\n)/g, "");
    content = content.replaceAll(/(?<!\\)(\\")/g, "\"");
    content = content.replaceAll(/(?<!\\)(\\\\\\")/g, "\\\"");
    if (content.endsWith("\n")) {
        content = content.substring(0, content.length - 1);
    }
    return {
        parsedLines,
        content,
    };
}

/**
 * @param {DefTreeNode} tree The defold tree to serialize
 * @returns {string} The serialized defold tree
 */
function serialize(tree) {
    return _serializeTree(tree, 0, true);
}

/**
 * @param {string} content The defold file content to deserialize
 * @returns {DefTreeNode} The root node of deserialized tree
 */
function deserialize(content) {
    return _deserializeTree(content);
}

module.exports = {
    serialize,
    deserialize
};