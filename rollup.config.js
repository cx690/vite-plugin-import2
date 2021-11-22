import clear from 'rollup-plugin-clear';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';

/**
 * @param {'esm'|'cjs'} type 
 * @returns rollup config
 */
function config(type) {
    return {
        input: {
            'index': './src/index.ts',
            'include': './src/include.ts',
        },
        output: {
            dir: type,
            format: type,
            entryFileNames: '[name].js',
            exports: 'default',
        },
        plugins: [
            clear({
                targets: [type]
            }),
            resolve({
                extensions: ['.js', '.cjs', '.mjs', '.ts']
            }),
            commonjs(),
            typescript(),
        ],
        external: [
            '@babel/parser',
            '@babel/types',
            '@babel/traverse',
            '@babel/generator',
            '@babel/helper-module-imports',
            'change-case',
            'resolve'
        ],
    }
}

export default [config('esm'), config('cjs')]