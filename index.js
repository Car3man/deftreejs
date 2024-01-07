const valueRegex = /^\s*([a-zA-Z0-9_]*):\s([a-zA-Z0-9/\-:\._ \\{"]*)$/;
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

class DefTreeNodes {
    #nodes = [];

    constructor() {
        this.#nodes = [];
    }

    /**
     * @returns {Array.<DefTreeNode>} 
     */
    getNodes() {
        return this.#nodes;
    }

    /**
     * @returns {Array.<DefTreeNode>} 
     */
    addNode(node) {
        this.#nodes.push(node);
        return this.#nodes;
    }

    /**
     * @returns {Array.<DefTreeNode>} 
     */
    addNodes(nodes) {
        this.#nodes.push(...nodes);
        return this.#nodes;
    }

    /**
     * @returns {Array.<DefTreeNode>} 
     */
    removeNode(node) {
        this.#nodes.splice(this.#nodes.indexOf(node), 1);
        return this.#nodes;
    }

    /**
     * @returns {DefTreeNodes} 
     */
    findByKey(key) {
        return this.#findBy("key", key);
    }

    /**
     * @returns {DefTreeNodes} 
     */
    findByType(type) {
        return this.#findBy("type", type);
    }

    /**
     * @returns {DefTreeNodes} 
     */
    findByValue(value) {
        return this.#findBy("value", value);
    }

    /**
     * @returns {DefTreeNodes} 
     */
    #findBy(field, value) {
        const nodes = new DefTreeNodes();
        const filtered = this.getNodes().filter((x) => {
            let valueToFilter;
            switch (field) {
                case "key": valueToFilter = x.getKey(); break;
                case "type": valueToFilter = x.getType(); break;
                case "value": valueToFilter = x.getValue(); break;
                default: throw new Error(`Unknown field to filter: '${field}'`);

            }
            return valueToFilter === value;
        });
        nodes.addNodes(filtered);
        return nodes;
    }
}

class DefTreeNode {
    #key = "";
    #type = "";
    #value = null;
    #nodes = new DefTreeNodes();

    constructor(key, type, value) {
        this.#key = key;
        this.#type = type;
        this.#value = value;
    }

    /**
     * @returns {String} 
     */
    getKey() {
        return this.#key;
    }

    /**
     * @param {String} key 
     */
    setKey(key) {
        this.#key = key;
    }

    /**
     * @returns {String} 
     */
    getType() {
        return this.#type;
    }

    /**
     * @param {String} type 
     */
    setType(type) {
        if (!supportedTypes.includes(type)) {
            throw new Error(`Not supported node type: '${type}'`);
        }
        this.#type = type;
    }

    /**
     * @returns {String|Number|Boolean|DefTreeNode} 
     */
    getValue() {
        return this.#type === "tree" ? this.#nodes : this.#value;
    }

    /**
     * @param {String|Number|Boolean|DefTreeNode} value 
     */
    setValue(value) {
        // TODO: add type checking for provided value
        this.#value = value;
    }

    /**
     * @returns {Array.<DefTreeNode>} 
     */
    getNodes() {
        return this.#nodes.getNodes();
    }

    /**
     * @returns {Array.<DefTreeNode>} 
     */
    addNode(node) {
        return this.#nodes.addNode(node);
    }

    /**
     * @returns {Array.<DefTreeNode>} 
     */
    addNodes(nodes) {
        return this.#nodes.addNodes(nodes);
    }

    /**
     * @returns {Array.<DefTreeNode>} 
     */
    removeNode(node) {
        return this.#nodes.removeNode(node);
    }

    /**
     * @returns {DefTreeNodes} 
     */
    findByKey(key) {
        return this.#nodes.findByKey(key);
    }

    /**
     * @returns {DefTreeNodes} 
     */
    findByType(type) {
        return this.#nodes.findByType(type);
    }

    /**
     * @returns {DefTreeNodes} 
     */
    findByValue(value) {
        return this.#nodes.findByValue(value);
    }
}

function _serializeTree(tree, level, isRoot) {
    let serialized = "";
    for (const node of tree.getNodes()) {
        serialized += _serializeNode(node, level, isRoot);
    }
    return serialized;
}

function _serializeNode(node, level, isRoot) {
    if (node.getType() === "tree") {
        let serialized = _serializeTree(node, 0, false);
        serialized = serialized.replaceAll(/(?<!\\)(\\\")/g, "\\\\\\\"");
        serialized = serialized.replaceAll(/(?<!\\)(\")/g, "\\\"");
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
        serialized = `${"  ".repeat(level)}` + `${node.getKey()}: \"` + serialized;
        serialized = serialized + (isRoot ? "\n" : "\"\n");
        return serialized;
    } else if (node.getType() === "object") {
        return _serializeObjectNode(node, level, isRoot);
    } else {
        return _serializeValueNode(node, level);
    }
}

function _serializeValueNode(node, level) {
    if (node.getType() === "float" || node.getType() === "int") {
        return `${"  ".repeat(level)}${node.getKey()}: ${node.getType() === "int" ? node.getValue() : (node.getValue() % 1 === 0 ? node.getValue() + ".0" : node.getValue())}\n`;
    } else if (node.getType() === "string") {
        return `${"  ".repeat(level)}${node.getKey()}: "${node.getValue()}"\n`;
    } else {
        return `${"  ".repeat(level)}${node.getKey()}: ${node.getValue()}\n`;
    }
}

function _serializeObjectNode(node, level, isRoot) {
    let serialized = "";
    serialized += `${"  ".repeat(level)}${node.getKey()} {\n`;
    for (const child of node.getNodes()) {
        serialized += _serializeNode(child, level + 1, isRoot);
    }
    serialized += `${"  ".repeat(level)}}\n`;
    return serialized;
}

function _deserializeTree(content, key = "root") {
    const node = new DefTreeNode(key, "tree", null);
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        i += _deserializeNode(node, i, lines) - 1;
    }
    return node;
}

function _deserializeNode(parent, lineIndex, lines) {
    let parsedLines = 1;
    const line = lines[lineIndex];
    if (!line) {
        return parsedLines;
    }
    if (_isValue(line)) {
        const match = valueRegex.exec(line);
        const [_, key, value] = match;
        if (_isSubTreeValue(value)) {
            const subTreeRaw = _getSubTreeRaw(lineIndex, lines);
            parent.addNode(_deserializeTree(subTreeRaw.content, key));
            parsedLines += subTreeRaw.parsedLines - 1;
        } else {
            const node = new DefTreeNode(key, "value", value);
            parent.addNode(_strictTypesForNode(node));
        }
    } else if (_isObjectStart(line)) {
        const match = objectRegex.exec(line);
        const [_, key] = match;
        const node = new DefTreeNode(key, "object", null);
        parent.addNode(node);
        while (!_isObjectEnd(lines[lineIndex + parsedLines])) {
            parsedLines += _deserializeNode(node, lineIndex + parsedLines, lines);
        }
        parsedLines++;
    } else {
        throw new Error("Can't identify a line while parsing: " + lineIndex);
    }
    return parsedLines;
}

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

function _isValue(line) {
    return valueRegex.test(line);
}

function _isSubTreeValue(value) {
    if (value.startsWith("\"") && value.endsWith("\"")) {
        let valueNoQuotes = value.substring(1, value.length - 1);
        valueNoQuotes = valueNoQuotes.replaceAll(/(\\+n)/g, "");
        valueNoQuotes = valueNoQuotes.replaceAll(/(\\+")/g, "");
        return _isValue(valueNoQuotes) || _isObjectStart(valueNoQuotes);
    }
    return false;
}

function _isSubTreeEnd(line) {
    return line.trim() === "\"\"";
}

function _isObjectStart(line) {
    return objectRegex.test(line);
}

function _isObjectEnd(line) {
    return line.endsWith("}");
}

function _getFirstQuotesIndex(line) {
    for (let i = 0; i < line.length; i++) {
        if (line[i] === "\"") {
            return i;
        }
    }
    return -1;
}

function _getLastQuotesIndex(line) {
    for (let i = line.length - 1; i >= 0; i--) {
        if (line[i] === "\"") {
            return i;
        }
    }
    return -1;
}

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
    content = content.replaceAll(/(?<!\\)(\\\")/g, "\"");
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
 * @param {DefTreeNode} tree 
 * @returns {String}
 */
function serialize(tree) {
    return _serializeTree(tree, 0, true);
}

/**
 * @param {String} content 
 * @returns {DefTreeNode}
 */
function deserialize(content) {
    return _deserializeTree(content);
}

module.exports = {
    serialize,
    deserialize
};