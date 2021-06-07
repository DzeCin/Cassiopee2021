import { readFileSync } from "fs";
import htmlParser from 'node-html-parser';

var html = readFileSync("tp-01.html", "utf8");
var root = htmlParser.parse(html);

console.log(root.querySelectorAll(".outline-2"));
root.querySelectorAll(".outline-2").forEach(element => {
  console.log(element.toString());
  console.log("!!!PAUSE!!!");
});
