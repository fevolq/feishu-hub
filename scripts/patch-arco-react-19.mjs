import fs from "node:fs/promises";
import path from "node:path";

const packageRoot = path.resolve("node_modules/@arco-design/web-react");
const packageJson = JSON.parse(
  await fs.readFile(path.join(packageRoot, "package.json"), "utf8")
);

if (packageJson.version !== "2.66.15") {
  throw new Error(
    `Unsupported @arco-design/web-react version ${packageJson.version}; review the React 19 patch before upgrading.`
  );
}

const replacements = [
  {
    files: ["es/_util/react-dom.js", "lib/_util/react-dom.js"],
    from: `    if (children && children.ref) {
        if (isFunction(children.ref)) {
            children === null || children === void 0 ? void 0 : children.ref(node);
        }
        if ('current' in children.ref) {
            children.ref.current = node;
        }
    }`,
    to: `    var originRef = children && children.props && children.props.ref;
    if (originRef) {
        if (isFunction(originRef)) {
            originRef(node);
        }
        if ('current' in originRef) {
            originRef.current = node;
        }
    }`,
    cjsFrom: `    if (children && children.ref) {
        if ((0, is_1.isFunction)(children.ref)) {
            children === null || children === void 0 ? void 0 : children.ref(node);
        }
        if ('current' in children.ref) {
            children.ref.current = node;
        }
    }`,
    cjsTo: `    var originRef = children && children.props && children.props.ref;
    if (originRef) {
        if ((0, is_1.isFunction)(originRef)) {
            originRef(node);
        }
        if ('current' in originRef) {
            originRef.current = node;
        }
    }`
  },
  {
    files: ["es/AutoComplete/index.js", "lib/AutoComplete/index.js"],
    from: "var originRef = usedTriggerElement.ref;",
    to: "var originRef = usedTriggerElement.props.ref;"
  },
  {
    files: ["es/_class/VirtualList/index.js"],
    from: `if (isFunction((_a = node) === null || _a === void 0 ? void 0 : _a.ref)) {
                        (_b = node) === null || _b === void 0 ? void 0 : _b.ref(ele);`,
    to: `if (isFunction((_a = node) === null || _a === void 0 ? void 0 : _a.props.ref)) {
                        (_b = node) === null || _b === void 0 ? void 0 : _b.props.ref(ele);`
  },
  {
    files: ["lib/_class/VirtualList/index.js"],
    from: `if ((0, is_1.isFunction)((_a = node) === null || _a === void 0 ? void 0 : _a.ref)) {
                        (_b = node) === null || _b === void 0 ? void 0 : _b.ref(ele);`,
    to: `if ((0, is_1.isFunction)((_a = node) === null || _a === void 0 ? void 0 : _a.props.ref)) {
                        (_b = node) === null || _b === void 0 ? void 0 : _b.props.ref(ele);`
  },
  {
    files: ["es/Trigger/index.js", "lib/Trigger/index.js"],
    from: "ref: popupChildren.ref",
    to: "ref: popupChildren.props.ref"
  }
];

let changedFiles = 0;

for (const replacement of replacements) {
  for (const relativeFile of replacement.files) {
    const filePath = path.join(packageRoot, relativeFile);
    const isCommonJs = relativeFile.startsWith("lib/");
    const from = isCommonJs && replacement.cjsFrom ? replacement.cjsFrom : replacement.from;
    const to = isCommonJs && replacement.cjsTo ? replacement.cjsTo : replacement.to;
    const source = await fs.readFile(filePath, "utf8");

    if (source.includes(to)) {
      continue;
    }
    if (!source.includes(from)) {
      throw new Error(`Unable to patch ${relativeFile}; expected source was not found.`);
    }

    await fs.writeFile(filePath, source.replace(from, to), "utf8");
    changedFiles += 1;
  }
}

console.log(
  changedFiles
    ? `Patched ${changedFiles} Arco files for React 19.`
    : "Arco React 19 patch already applied."
);
