# Third-party notices

The UI/UX Pro Max and SEO Audit files listed below are vendored development tools. They are not
part of the website bundle. Their upstream MIT notices are reproduced here.

## Package dependencies

The project's MIT license applies to its original source. Installed dependencies retain their
own licenses and notices; this file is not a complete inventory of every deployment artifact.
Examples in the current lockfile include:

| Package family | Declared terms and upstream reference |
| --- | --- |
| `sharp` and optional `@img/sharp-*` native/WebAssembly packages | Apache-2.0, LGPL-3.0-or-later and, for the WebAssembly package, MIT components. See [platform package metadata](https://github.com/lovell/sharp/blob/main/npm/win32-x64/package.json), [libvips licensing](https://github.com/lovell/sharp-libvips#licences) and its [component notices](https://github.com/lovell/sharp-libvips/blob/main/THIRD-PARTY-NOTICES.md). |
| `next-mdx-remote` | [MPL-2.0](https://github.com/hashicorp/next-mdx-remote/blob/main/LICENSE). |
| `caniuse-lite` | [CC-BY-4.0](https://github.com/browserslist/caniuse-lite/blob/main/LICENSE). |

Optional platform packages are alternatives; a lockfile entry does not mean every architecture
is distributed. Preserve applicable package licenses and component notices when preparing a
frontend archive or image, and inspect that actual artifact against the upstream terms. The
backend-only container does not bundle the Next.js image-processing dependencies.

## UI/UX Pro Max

Source: [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)

Included under `.agents/skills/ui-ux-pro-max/`.

```text
MIT License

Copyright (c) 2024 Next Level Builder

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## SEO Audit

Source: [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills)

Included under `.agents/skills/seo-audit/`.

```text
MIT License

Copyright (c) 2025 Corey Haines

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
