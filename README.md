# vite-plugin-import2

A tool look like babel-plugin-import and can auto inject to vite's Pre-bundling dependencies.
Can effectively prevent vite's reload page when it find new dependencies,because these had already pushed to Pre-bundling dependencies.
Fork from [vite-plugin-babel-import](https://www.npmjs.com/package/vite-plugin-babel-import "vite-plugin-babel-import") and add new features.
This is also a rollup plugin.

## install

```bash
npm i vite-plugin-import2 -D
or
yarn add vite-plugin-import2 --dev
```

## Example

```js
// vite.config.ts or vite.config.js
export default {
  ...
  plugins: [
    ....
    vitePluginImport(
      {
        libraryName: 'antd',
        style:true,//antd/es/${name}/style
      },
    )
  ]
}

// app.tsx
import { Button } from 'antd';

        ↓ ↓ ↓ ↓ ↓ ↓

import Button from 'antd/es/button';
import 'antd/es/button/style';


//vite config change (auto add Pre-bundling dependencies):
        ↓ ↓ ↓ ↓ ↓ ↓
  optimizeDeps:{
    include: ['antd/es/button','antd/es/button/style','antd/es/input','antd/es/input/style',...]
  }
```

## Usage

```js
// vite.config.ts or vite.config.js
// ...
import vitePluginImport from 'vite-plugin-import2';
// ...
export default {
  // ...
  plugins: [
    // ...
    vitePluginImport([
      {
        libraryName: 'vant',
        libraryDirectory: 'es',//default es
        style(name) {
          return `vant/es/${name}/style`;
        },
      },
      {
        libraryName: 'vant',
        libraryDirectory: 'es',
        style(name) {//or style:'less'
          return `vant/es/${name}/style/less`;//use less.js
        },
      },
      {
        libraryName: 'antd',
        style:true,//antd/es/${name}/style
      },
      {
        libraryName: 'element-plus',
        libraryDirectory: 'es',
        style(name) {
          return `element-plus/lib/theme-chalk/${name}.css`;
        },
      },
      {
        libraryName: 'ant-design-vue',
        libraryDirectory: 'es',
        style:'css',//ant-design-vue/es/${name}/style/css
      },
    ]),
  ],
  // ...
};
```
## In Rollup
It also works well in rollup.

```js
//rollup.config.js
export default{
  ...,
  plugins:[
    ...,
    vitePluginImport({
          libraryName: 'antd',
          style: true,
          autoInclude: false,//you'd better set autoInclude=false
      }),
  ]
}

```