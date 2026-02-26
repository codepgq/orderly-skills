#!/usr/bin/env node

/**
 * Orderly SDK Plugin Generator
 *
 * Generates a complete plugin package skeleton within the monorepo.
 * Zero third-party dependencies — uses only Node.js built-ins.
 *
 * Usage:
 *   node create-plugin.mjs --name <name> --type <widget|page|layout> --path <parent-dir>
 */

import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    name: { type: "string" },
    type: { type: "string", default: "widget" },
    path: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
  strict: true,
});

if (!args.name) {
  console.error("Error: --name is required");
  process.exit(1);
}

if (!args.path) {
  console.error("Error: --path is required (absolute path to parent directory)");
  process.exit(1);
}

const VALID_TYPES = ["widget", "page", "layout"];
const pluginType = (args.type ?? "widget").toLowerCase();

if (!VALID_TYPES.includes(pluginType)) {
  console.error(`Error: --type must be one of: ${VALID_TYPES.join(", ")}`);
  process.exit(1);
}

const NAME_RE = /^[a-z][a-z0-9-]*$/;
const pluginName = args.name.toLowerCase();

if (!NAME_RE.test(pluginName)) {
  console.error(
    "Error: --name must start with a letter and contain only lowercase letters, digits, and hyphens"
  );
  process.exit(1);
}

const dryRun = args["dry-run"] ?? false;
const parentDir = resolve(args.path);
const dirName = `plugin-${pluginName}`;
const pluginDir = join(parentDir, dirName);
const pkgScope = "@orderly.network";
const pkgName = `${pkgScope}/plugin-${pluginName}`;

// ---------------------------------------------------------------------------
// Generate unique plugin ID
// ---------------------------------------------------------------------------

function generatePluginId(name) {
  const seed = `${name}-${Date.now()}-${randomBytes(8).toString("hex")}`;
  const hash = createHash("sha256").update(seed).digest("hex").slice(0, 8);
  return `orderly-plugin-${name}-${hash}`;
}

const pluginId = generatePluginId(pluginName);

// ---------------------------------------------------------------------------
// Template: package.json
// ---------------------------------------------------------------------------

function makePackageJson() {
  return JSON.stringify(
    {
      name: pkgName,
      version: "0.1.0",
      description: `Orderly SDK plugin — ${pluginName}`,
      main: "dist/index.js",
      module: "dist/index.mjs",
      types: "dist/index.d.ts",
      scripts: {
        build: "tsup",
        dev: "tsup --watch",
      },
      files: ["dist"],
      peerDependencies: {
        react: ">=18",
        "react-dom": ">=18",
        "@orderly.network/plugin-core": "workspace:*",
        "@orderly.network/ui": "workspace:*",
        "@orderly.network/hooks": "workspace:*",
      },
      dependencies: {},
      devDependencies: {
        "@types/react": "^18.2.38",
        "@types/react-dom": "^18.2.17",
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        tsconfig: "workspace:*",
        tsup: "^8.5.1",
        typescript: "^5.1.6",
      },
      publishConfig: {
        access: "public",
      },
    },
    null,
    2
  );
}

// ---------------------------------------------------------------------------
// Template: tsconfig.json
// ---------------------------------------------------------------------------

function makeTsconfig() {
  return JSON.stringify(
    {
      extends: "../tsconfig/base.json",
      compilerOptions: {
        outDir: "dist",
        rootDir: "src",
        jsx: "react-jsx",
      },
      include: ["src"],
    },
    null,
    2
  );
}

// ---------------------------------------------------------------------------
// Template: tsup.config.ts
// ---------------------------------------------------------------------------

function makeTsupConfig() {
  return `import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.tsx"],
  splitting: false,
  format: ["cjs", "esm"],
  target: "es6",
  sourcemap: true,
  clean: !options.watch,
  dts: true,
  tsconfig: "tsconfig.json",
  external: [
    "react",
    "react-dom",
    "@orderly.network/plugin-core",
    "@orderly.network/hooks",
    "@orderly.network/ui",
    "@orderly.network/trading",
  ],
}));
`;
}

// ---------------------------------------------------------------------------
// Template: src/index.tsx  (varies by plugin type)
// ---------------------------------------------------------------------------

function camelCase(str) {
  return str
    .split("-")
    .map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join("");
}

function pascalCase(str) {
  return str
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");
}

function makeWidgetIndex() {
  const fnName = `register${pascalCase(pluginName)}Plugin`;
  const componentName = `${pascalCase(pluginName)}Widget`;
  const componentFile = `${camelCase(pluginName)}Widget`;

  return `import React from "react";
import { createInterceptor } from "@orderly.network/plugin-core";
import type { OrderlySDK } from "@orderly.network/plugin-core";
import { ${componentName} } from "./components/${componentFile}";

export interface ${pascalCase(pluginName)}PluginOptions {
  /** Optional CSS class for the wrapper */
  className?: string;
}

/**
 * Register the ${pluginName} plugin.
 * Intercepts a target component and injects custom UI.
 */
export function ${fnName}(options?: ${pascalCase(pluginName)}PluginOptions) {
  return (SDK: OrderlySDK) => {
    SDK.registerPlugin({
      id: "${pluginId}",
      name: "${pascalCase(pluginName)}",
      version: "0.1.0",
      orderlyVersion: ">=2.9.0",

      interceptors: [
        // TODO: Change the target path to the component you want to intercept.
        // Use the Inspector tool to discover available paths.
        createInterceptor(
          "Trading.OrderEntry.SubmitButton" as any,
          (Original, props, _api) => (
            <div className={options?.className}>
              <${componentName} />
              <Original {...props} />
            </div>
          ),
        ),
      ],

      setup: (api) => {
        // Non-UI logic: event subscriptions, logging, etc.
      },
    });
  };
}

export default ${fnName};
`;
}

function makePageIndex() {
  const fnName = `register${pascalCase(pluginName)}Plugin`;
  const componentName = `${pascalCase(pluginName)}Page`;
  const componentFile = `${camelCase(pluginName)}Page`;

  return `import React from "react";
import type { OrderlySDK } from "@orderly.network/plugin-core";
import { ${componentName} } from "./components/${componentFile}";

export interface ${pascalCase(pluginName)}PluginOptions {
  /** Optional configuration */
  title?: string;
}

/**
 * Page plugin: ${pluginName}
 *
 * Page plugins are standalone route components.
 * Mount this via your host router — no interceptor registration needed.
 * The register function is kept for consistency and optional setup logic.
 */
export function ${fnName}(options?: ${pascalCase(pluginName)}PluginOptions) {
  return (SDK: OrderlySDK) => {
    SDK.registerPlugin({
      id: "${pluginId}",
      name: "${pascalCase(pluginName)}",
      version: "0.1.0",
      orderlyVersion: ">=2.9.0",

      setup: (api) => {
        // Non-UI logic: event subscriptions, logging, etc.
      },
    });
  };
}

/** Export the page component for host router integration */
export { ${componentName} } from "./components/${componentFile}";
export default ${fnName};
`;
}

function makeLayoutIndex() {
  const fnName = `register${pascalCase(pluginName)}Plugin`;
  const componentName = `${pascalCase(pluginName)}Layout`;
  const componentFile = `${camelCase(pluginName)}Layout`;

  return `import React from "react";
import { createInterceptor } from "@orderly.network/plugin-core";
import type { OrderlySDK } from "@orderly.network/plugin-core";
import { ${componentName} } from "./components/${componentFile}";

export interface ${pascalCase(pluginName)}PluginOptions {
  /** Optional CSS class for the layout wrapper */
  className?: string;
}

/**
 * Layout plugin: ${pluginName}
 *
 * Intercepts the top-level trading layout container and rearranges
 * child blocks (Chart, Orderbook, OrderEntry, etc.).
 */
export function ${fnName}(options?: ${pascalCase(pluginName)}PluginOptions) {
  return (SDK: OrderlySDK) => {
    SDK.registerPlugin({
      id: "${pluginId}",
      name: "${pascalCase(pluginName)}",
      version: "0.1.0",
      orderlyVersion: ">=2.9.0",

      interceptors: [
        // Intercept the top-level layout to rearrange child blocks
        createInterceptor(
          "Trading.TradingLayout" as any,
          (Original, props, _api) => (
            <${componentName} className={options?.className}>
              <Original {...props} />
            </${componentName}>
          ),
        ),
      ],

      setup: (api) => {
        // Non-UI logic: event subscriptions, logging, etc.
      },
    });
  };
}

export default ${fnName};
`;
}

// ---------------------------------------------------------------------------
// Template: src/components/<Component>.tsx  (varies by plugin type)
// ---------------------------------------------------------------------------

function makeWidgetComponent() {
  const componentName = `${pascalCase(pluginName)}Widget`;
  return `import React from "react";

export interface ${componentName}Props {
  className?: string;
}

export const ${componentName}: React.FC<${componentName}Props> = ({ className }) => {
  return (
    <div className={className}>
      {/* TODO: Implement your widget UI here */}
      <p>${pascalCase(pluginName)} Widget</p>
    </div>
  );
};
`;
}

function makePageComponent() {
  const componentName = `${pascalCase(pluginName)}Page`;
  return `import React from "react";

export interface ${componentName}Props {
  className?: string;
}

/**
 * Standalone page component.
 * Mount this via the host application's router.
 * You can use @orderly-network/hooks directly here.
 */
export const ${componentName}: React.FC<${componentName}Props> = ({ className }) => {
  return (
    <div className={className}>
      {/* TODO: Implement your page UI here */}
      <h1>${pascalCase(pluginName)}</h1>
    </div>
  );
};
`;
}

function makeLayoutComponent() {
  const componentName = `${pascalCase(pluginName)}Layout`;
  return `import React from "react";

export interface ${componentName}Props {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Custom layout wrapper.
 * Rearranges trading page blocks (Chart, Orderbook, OrderEntry, etc.).
 */
export const ${componentName}: React.FC<${componentName}Props> = ({ className, children }) => {
  return (
    <div className={className}>
      {/* TODO: Rearrange child blocks as needed */}
      {children}
    </div>
  );
};
`;
}

// ---------------------------------------------------------------------------
// File creation
// ---------------------------------------------------------------------------

const COMPONENT_FILE_MAP = {
  widget: `${camelCase(pluginName)}Widget`,
  page: `${camelCase(pluginName)}Page`,
  layout: `${camelCase(pluginName)}Layout`,
};

const INDEX_FN_MAP = {
  widget: makeWidgetIndex,
  page: makePageIndex,
  layout: makeLayoutIndex,
};

const COMPONENT_FN_MAP = {
  widget: makeWidgetComponent,
  page: makePageComponent,
  layout: makeLayoutComponent,
};

const componentFileName = COMPONENT_FILE_MAP[pluginType];

const files = [
  { rel: "package.json", content: makePackageJson() },
  { rel: "tsconfig.json", content: makeTsconfig() },
  { rel: "tsup.config.ts", content: makeTsupConfig() },
  { rel: "src/index.tsx", content: INDEX_FN_MAP[pluginType]() },
  {
    rel: `src/components/${componentFileName}.tsx`,
    content: COMPONENT_FN_MAP[pluginType](),
  },
  { rel: "src/components/.gitkeep", content: "" },
];

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

if (existsSync(pluginDir)) {
  console.error(`Error: directory already exists — ${pluginDir}`);
  process.exit(1);
}

console.log(`\n  Plugin Name : ${pluginName}`);
console.log(`  Plugin Type : ${pluginType}`);
console.log(`  Plugin ID   : ${pluginId}`);
console.log(`  Package     : ${pkgName}`);
console.log(`  Directory   : ${pluginDir}\n`);

if (dryRun) {
  console.log("  [dry-run] Files that would be created:\n");
  for (const f of files) {
    console.log(`    ${dirName}/${f.rel}`);
  }
  console.log("\n  [dry-run] No files were written.\n");
  process.exit(0);
}

for (const f of files) {
  const fullPath = join(pluginDir, f.rel);
  const dir = join(fullPath, "..");
  mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, f.content, "utf-8");
  console.log(`  created: ${dirName}/${f.rel}`);
}

console.log(`
  Done! Next steps:

  1. cd ${pluginDir}
  2. Run \`pnpm install\` from the monorepo root
  3. Edit src/index.tsx — add your interceptors / page logic
  4. Build with \`pnpm build\`
  5. Register in host app:

     import register${pascalCase(pluginName)}Plugin from "${pkgName}";

     <OrderlyProvider plugins={[register${pascalCase(pluginName)}Plugin()]}>
       ...
     </OrderlyProvider>
`);
