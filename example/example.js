const {readFileSync} = require("fs");
const {join} = require("path");
const {deserialize} = require("../index.js");
const documentPath = join(__dirname, "./example.collection");
const document = readFileSync(documentPath, "utf-8");
const tree = deserialize(document);
const objects = tree.getNodes().filter((node) => node.getKey() === "myObject");
const objectToFind = objects.filter((myObject) => {
   return myObject.getNodes().some((child) => child.getKey() === "name" && child.getValue() === "Skuf"); 
})[0];
console.log(objectToFind);