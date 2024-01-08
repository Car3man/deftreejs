# DefTreeJS
Small library to serialize/deserialize Defold files
## Install
Deftree requires Node.js to use it
```sh
npm i git+https://github.com/Car3man/deftreejs.git
```
## Usage
```js
const {readFileSync, writeFileSync} = require("fs");            // require methods to read/write files
const {serialize, deserialize} = require("deftreejs");          // require methods to work with defold files
const documentPath = "./main.collection";                       // define path for document to read
const document = readFileSync(documentPath, "utf-8");           // reading the document
const tree = deserialize(document);                             // parse the defold document
tree.getNodes()
    .find((node) => node.getKey() === "name")
    .setValue("newName");                                       // find node by key equals "name" and change it value to "newName"
const serialized = serialize(tree);                             // serialize the modified tree
writeFileSync(documentPath, serialized);                        // write it to document file
```
#### DefTreeNode Methods
- getKey() -> string
- setKey(string)
- getType() -> string
- setType(string)
- getValue() -> string|number|boolean|node
- setValue(string|number|boolean|node)
- getNodes() -> node[]
