import * as fs from 'fs';
import * as path from 'path';
import { UserConfig } from 'vite';
import resolve from 'resolve';

interface AutoIncludeOpt {
    libraryName: string;
    /** default es */
    libraryDirectory?: string;
    /** default style */
    styleLibraryDirectory?: string;
    /** 
     * - true => index.js;
     * - string => string.js;  for example: if set css , will return css.js;
     * - function => path; notice : can't return .less or .scss or .stylus;
     */
    style?: true | string | ((name: string, path?: string) => string | null | undefined);
    /** ignore some conponet's directory */
    ignoreDirs?: string[];
}
function autoInclude(option: AutoIncludeOpt | AutoIncludeOpt[]) {

    return {
        name: 'auto-include',
        config(useConfig: UserConfig) {
            let includeJs: string[] = [];
            let includeCSS: string[] = [];
            const options = option instanceof Array ? option : [option];

            for (const option of options) {
                const { libraryName, libraryDirectory = 'es', styleLibraryDirectory = 'style', style, ignoreDirs } = option;
                if (!libraryName) {
                    console.warn(
                        "\x1B[33m waring: vite-plugin-auto-include libraryName can't be null!\x1B[0m"
                    );
                    break;
                }

                const dirRtn = `${libraryName}${libraryDirectory ? '/' + libraryDirectory : ''}`;
                const arr = resolve.sync(libraryName).split('node_modules');
                arr.pop();
                const dirCom = path.join(...arr, 'node_modules', libraryName, libraryDirectory ?? '');

                const conponets = fs.readdirSync(dirCom).filter((name) => {
                    const namePath = path.join(dirCom, name);
                    const stat = fs.statSync(namePath);
                    if (ignoreDirs && ignoreDirs.includes(name)) return false;
                    return stat.isDirectory();
                });

                for (const name of conponets) {
                    //js add
                    const namePath = path.join(dirCom, name);
                    const files = fs.readdirSync(namePath);
                    files.includes('index.js') && includeJs.push(`${dirRtn}/${name}`);

                    //css add
                    if (typeof style === 'function') {
                        const css = style(name, `${dirRtn}/${name}`);
                        css && includeCSS.push(css);
                    } else {
                        if (files.includes(styleLibraryDirectory)) {
                            if (style === true) {
                                includeCSS.push(`${dirRtn}/${name}/${styleLibraryDirectory}`);
                            } else if (typeof style === 'string' && style !== '') {
                                includeCSS.push(`${dirRtn}/${name}/${styleLibraryDirectory}/${style}`);
                            }
                        }
                    }
                }
            }

            if (useConfig.optimizeDeps && useConfig.optimizeDeps.include) {
                useConfig.optimizeDeps.include.push(...includeJs, ...includeCSS);
            } else if (useConfig.optimizeDeps) {
                useConfig.optimizeDeps.include = includeJs.concat(includeCSS);
            } else {
                useConfig.optimizeDeps = {
                    include: includeJs.concat(includeCSS),
                }
            }
        }
    }
}
export default autoInclude;