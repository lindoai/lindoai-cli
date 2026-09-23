// Ambient module declaration so `import foo from './x.md'` typechecks.
// The actual runtime value comes from tsup's `.md` text loader (configured
// in tsup.config.ts), which inlines the file contents as a string constant.
declare module '*.md' {
  const content: string;
  export default content;
}
