const {readFileSync} = require("fs");
const {join} = require("path");
const {deserialize, serialize} = require("../index.js");
const documentPath = join(__dirname, "./example2.collection");
const document = readFileSync(documentPath, "utf-8");
const tree = deserialize(document);
const goInstance = tree.getNodes()
    .find((node) => {
        const keyIsEmbeddedInstances = node.getKey() === "embedded_instances";
        if (!keyIsEmbeddedInstances) {
            return false;
        }
        return node.getNodes().some((child) => child.getKey() === "id" && child.getValue() === "go");
    });
const collisionObjects = goInstance.getNodes()
    .find((node) => node.getKey() === "data")
    .getNodes()
    .filter((node) => node.getKey() === "embedded_components" && node.getNodes().some((child) => {
      return child.getKey() === "type" && child.getValue() === "collisionobject";
    }));
for (const collisionObject of collisionObjects) {
   const collisionData = collisionObject.getNodes().find((node) => node.getKey() === "data").getNodes();
   const massNode = collisionData.find((node) => node.getKey() === "mass");
   massNode.setValue(Math.random(1.0, 3.0));
}
console.log(serialize(tree));