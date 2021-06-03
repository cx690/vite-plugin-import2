import * as parser from '@babel/parser';
import * as types from '@babel/types';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import { addSideEffect } from '@babel/helper-module-imports';
import * as changeCase from 'change-case';
import { Plugin } from 'vite';
import autoInclude from 'vite-plugin-auto-include';

type ChangeCaseType = 'camelCase' | 'capitalCase' | 'constantCase' | 'dotCase' | 'headerCase' | 'noCase' | 'paramCase' | 'pascalCase' | 'pathCase' | 'sentenceCase' | 'snakeCase';

interface PluginInnerOption {
    libraryName: string;
    libraryResovle: (name: string) => string;
    styleResovle: null | ((name: string) => string | null | undefined);
}

interface PluginInnerOptions extends Array<PluginInnerOption> { }

interface Specifier {
    imported: {
        name: string;
    };
}

export interface PluginOption {
    libraryName: string;
    /** default es */
    libraryDirectory?: string;
    libraryChangeCase?: ChangeCaseType | ((name: string) => string);
    /** default style   */
    styleLibraryDirectory?: string;
    style?: true | string | ((name: string, autoIncludePath?: string) => string | null | undefined);
    styleChangeCase?: ChangeCaseType | ((name: string) => string);
    ignoreStyles?: string[];
    /** default true;if true will use vite-plugin-auto-include inject Pre-bundling dependencies */
    autoInclude?: boolean;
    /** 
     * vite-plugin-auto-include param;
     * - ignore some conponet's directory;
     * - default PluginOption.ignoreStyles
     * - https://www.npmjs.com/package/vite-plugin-auto-include
     */
    ignoreDirs?: string[];
}

export default function vitePluginImport(
    plgOption: PluginOption | PluginOption[]
): Plugin {
    const plgOptions = plgOption instanceof Array ? plgOption : [plgOption];
    const autoIncludeOpt = plgOptions.map(item => {
        return item.autoInclude === false ? null : {
            libraryName: item.libraryName,
            libraryDirectory: item.libraryDirectory,
            style: item.style,
            ignoreDirs: item.ignoreDirs || item.ignoreStyles,
        };
    }).filter(item => !!item);
    return {
        name: "vite-plugin-import2",
        config: autoIncludeOpt.length ? autoInclude(autoIncludeOpt).config : undefined,
        transform(code, id) {
            if (!/\.(?:[jt]sx?|vue|mjs)$/.test(id)) return;
            return {
                code: transformSrcCode(code, transformOptions(plgOptions)),
                map: null,
            };
        },

    };
}

function transformOptions(options: PluginOption[]): PluginInnerOptions {
    return options.map((opt) => {
        let libraryCaseFn: (name: string) => string;
        let styleCaseFn: (name: string) => string;
        if (typeof opt.libraryChangeCase === 'function') {
            libraryCaseFn = opt.libraryChangeCase;
        } else {
            libraryCaseFn = (name) => {
                return changeCase[
                    (opt.libraryChangeCase || 'paramCase') as ChangeCaseType
                ](name);
            };
        }
        if (typeof opt.styleChangeCase === 'function') {
            styleCaseFn = opt.styleChangeCase;
        } else {
            styleCaseFn = (name) => {
                return changeCase[
                    (opt.styleChangeCase || 'paramCase') as ChangeCaseType
                ](name);
            };
        }
        const libraryDirectory = opt.libraryDirectory || 'es';
        const styleLibraryDirectory = opt.styleLibraryDirectory || 'style';

        return {
            libraryName: opt.libraryName,
            libraryResovle: (name) => {
                let libraryPaths: string[] = [opt.libraryName];
                libraryPaths.push(libraryDirectory);
                libraryPaths.push(libraryCaseFn(name));
                return libraryPaths.join('/').replace(/\/\//g, '/');
            },
            styleResovle: typeof opt.style === 'function' ? (name) => {
                if (opt.ignoreStyles?.includes(name)) return null;
                return (opt.style as ((name: string) => string | null | undefined))(styleCaseFn(name));
            } : opt.style === true ? (name) => {
                if (opt.ignoreStyles?.includes(name)) return null;
                return `${opt.libraryName}/${libraryDirectory}/${styleCaseFn(name)}/${styleLibraryDirectory}`;
            } : (typeof opt.style === 'string' && opt.style !== '') ? (name) => {
                if (opt.ignoreStyles?.includes(name)) return null;
                return `${opt.libraryName}/${libraryDirectory}/${styleCaseFn(name)}/${styleLibraryDirectory}/${opt.style}`;
            } : null,
        } as PluginInnerOption;
    });
}

function transformSrcCode(
    code: string,
    plgOptions: PluginInnerOptions,
): string {
    const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx'],
    });
    traverse(ast, {
        enter(path) {
            const { node } = path;
            if (types.isImportDeclaration(node)) {
                const { value } = node.source;
                const plgOpt = plgOptions.find((opt) => opt.libraryName === value);
                if (plgOpt) {
                    let importStyles: string[] = [];
                    let declarations: types.ImportDeclaration[] = [];
                    node.specifiers.forEach((spec) => {
                        if (types.isImportSpecifier(spec)) {
                            let importedName = (spec as Specifier).imported.name;
                            let libPath = plgOpt.libraryResovle(importedName);
                            declarations.push(
                                types.importDeclaration(
                                    [
                                        types.importDefaultSpecifier(
                                            types.identifier(importedName)
                                        ),
                                    ],
                                    types.stringLiteral(libPath)
                                )
                            );
                            if (plgOpt.styleResovle) {
                                let styleImpPath = plgOpt.styleResovle!(importedName);
                                if (styleImpPath) {
                                    importStyles.push(styleImpPath);
                                }
                            }
                        }
                    });
                    path.replaceWithMultiple(declarations);
                    importStyles.forEach((style) => {
                        addSideEffect(path, style);
                    });
                }
            }
        },
    });
    return generate(ast).code;
}