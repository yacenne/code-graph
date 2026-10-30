import { Project, SyntaxKind, type SourceFile } from 'ts-morph';
import type { EdgeKind } from './types';

export interface RawImport {
  sourceFile: string;
  specifier: string;
  kind: EdgeKind;
  line: number;
}

/**
 * Extracts raw imports, re-exports, and dynamic imports with literal strings
 * from a TypeScript or JavaScript source file using ts-morph AST.
 */
export function extractImportsFromSource(
  sourceFile: SourceFile,
  relativePath: string
): RawImport[] {
  const rawImports: RawImport[] = [];

  // 1. Plain imports: import ... from '...'
  for (const importDecl of sourceFile.getImportDeclarations()) {
    const specifier = importDecl.getModuleSpecifierValue();
    if (specifier !== undefined) {
      rawImports.push({
        sourceFile: relativePath,
        specifier,
        kind: 'import',
        line: importDecl.getStartLineNumber(),
      });
    }
  }

  // 2. Re-exports: export ... from '...'
  for (const exportDecl of sourceFile.getExportDeclarations()) {
    const specifier = exportDecl.getModuleSpecifierValue();
    if (specifier !== undefined) {
      rawImports.push({
        sourceFile: relativePath,
        specifier,
        kind: 're-export',
        line: exportDecl.getStartLineNumber(),
      });
    }
  }

  // 3. Dynamic imports with literal string: import('...')
  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  for (const call of callExpressions) {
    const expression = call.getExpression();
    const isImportKeyword =
      expression.getKind() === SyntaxKind.ImportKeyword ||
      expression.getText() === 'import';

    if (isImportKeyword) {
      const args = call.getArguments();
      if (args.length > 0 && args[0].getKind() === SyntaxKind.StringLiteral) {
        const stringLiteral = args[0].asKindOrThrow(SyntaxKind.StringLiteral);
        rawImports.push({
          sourceFile: relativePath,
          specifier: stringLiteral.getLiteralText(),
          kind: 'dynamic-import',
          line: call.getStartLineNumber(),
        });
      }
    }
  }

  return rawImports;
}

/**
 * Parses all in-memory files and extracts their raw imports.
 */
export function extractRepositoryImports(
  fileContents: Map<string, string>
): RawImport[] {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      allowJs: true,
    },
  });

  const allRawImports: RawImport[] = [];

  for (const [relativePath, content] of fileContents.entries()) {
    const sourceFile = project.createSourceFile(relativePath, content, {
      overwrite: true,
    });
    const fileImports = extractImportsFromSource(sourceFile, relativePath);
    for (const item of fileImports) {
      allRawImports.push(item);
    }
  }

  return allRawImports;
}
