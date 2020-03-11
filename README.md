# Nimbus Docs Suite

This a documentation generator for Nimbus Libraries at [nimbus-libs.status.im](https://nimbus-libs.status.im). It's made to auto-regenerate from master on all the repos you want documented but at the same time supports custom content and theming. It uses [Vuepress](https://v1.vuepress.vuejs.org) behind the scenes.

## Dependencies

You need:

- a fairly recent [version of NodeJS](https://github.com/nvm-sh/nvm) ([Windows Version](https://github.com/coreybutler/nvm-windows))
- [yarn](https://yarnpkg.com/en/)
- [vuepress globally installed](https://vuepress.vuejs.org/) or locally but for use via npx.

## Building

```bash
git clone https://github.com/status-im/nimbus-libs-site
cd nimbus-libs-site
cd docgen && yarn install
vuepress build
```

The results of the build process will be in `docgen/.vuepress/dist`.

> Note: You will have to run `vuepress build` twice, because the first run writes the temporary MD files, while the second run builds HTML from them. We're working on making all that happen in one go and there's a [pending issue in Vuepress](https://github.com/vuejs/vuepress/issues/1613).

## Commands

- `vuepress build` builds the docs
- `yarn run clearlib` clears the downloaded and generated MD files in `lib`
- `yarn run cleardist` clears the generated static files
- `yarn run clearall` clears all the cached content - both MD files and static file

## What's behind the build command

When you run `vuepress build`, the builder:

- reads `config.json` for the repos it should process.
- uses the information there to build the homepage by constructing library cards for each repo.
- for every repo with `update: true`, grabs their `README` file and strips their header and footer (above `Introduction` and below `Contributing`). It is recommended you fix your repos to match this pattern rather than use `update: false`.
- changes image URLs to match raw ones from Github if they are hosted on Github.
- generates frontmatter from the data in `config.json`, combines it with the README and generates a homepage for each library that way.
- @todo: if a `Guides` folder exists in library's subfolder, it will generate a sidebar navigation from its contents.

The logic responsible for this is in a custom plugin in `.vuepress/docgen/plugin.js`.

## Modifying for your use case

To generate docs in the same way for your own repos:

1. Modify `config.json` to contain the repos you want process
    - `name`: slug, URL-friendly name of the project and will be the folder name where the lib's docs are stored
    - `label`: human readable label and title to be placed at the top of the homepage
    - `location`: the Github URL of the repo. Must be public. Gitlab and private repos coming soon.
    - `update`: when false, only generates content from local MD content, does not try to fetch from online master
    - `tags`: a JS array of tags applying to this lib. Purely aesthetic for now, for the homepage - colored badges will appear next to the lib's name. Add tags into the `tags` object as desired.
    - `subdocs`: see next section
    - `apiref`: see ApiRef section
    - `description`: description for the homepage
    - `frontmatter`: frontmatter to generate. Key value pairs. Values are same as [documented in Vuepress](https://v1.vuepress.vuejs.org/guide/frontmatter.html).
2. Also in `config.json`, set up the start and end separators. This indicates where your README's body begins, and where it ends. Useful for avoiding licensing information or CI badges in your human-readable docs. `separators[0]` is the starting point of the readme's body, `separators[1]` is the ending point of the readme's body, and `separators[2]` lets you specify several separators for start and end if your READMEs across projects aren't standardized. The string of each separator will be exploded with `separators[2]` and the first of those which is found in a README is considered the valid separator.
3. Modify styles in `.vuepress/styles` and theme configuration in `.vuepress/config.js` as desired. Use the Vuepress docs.
4. Run `vuepress build` inside `docgen`.

### Subdocs

Sometimes your master README file might contain links to subdocs of that repo. 

Those subdocs are assumed to be listed in a subsection with links e.g. `"subdocs": "## Docs"`. That label will be used as a section identifier for the subdocs. All markdown links in that section will be grabbed in their raw format - the generator will assume they are all subdocs, so don't have other links in there.

If these subdocs have H1 level headings, all headings will be moved 1 level lower (i.e. `##` becomes `###`). The subsection will be replaced with a content composed of all subdocs merged into a single file.

@todo currently image URLs are not fixed because it's [not straightforward](https://github.com/status-im/nimbus-libs-site/issues/6).

### ApiRef

Generating an API reference for a library is a heavy and slow operation, so it needs to be specific. You define it through an object like this:

```json
"apiref": {
    "lang": "nim",
    "mainfile": "nimcrypto.nim",
    "subfolder": "nimcrypto",
    "bootstrap": "nimble install -y" // <-- OPTIONAL
},
```

The only supported language is currently `nim` and it requires a version at or above 0.19.6! The mainfile is the entry file through which the generator starts generating the doc, this might be language specific like in the case of Nim. In Nim's case, the JSON is generated in a subfolder, which is specified in the `subfolder` value. For Nim, all three values are required.

If the `bootstrap` option is provided, the generator will run this command verbatim inside the folder of the cloned repo. This is useful for installing dependencies or pre-generating things inside the folder of the lib itself. **Note that if your bootstrap is something like `nimble install -y`, your global nimble folder will be updated! Back it up before launching the generator and then go [yell at @dom96](https://github.com/nim-lang/nimble).**

## Enhancing the docs further

To further enhance the docs, please consult the [Vuepress docs](https://v1.vuepress.vuejs.org) as underneath it's all just a [Vue](https://vuejs.org) app built by Vuepress. Also check [existing issues](https://github.com/status-im/nimbus-libs-site/issues).

## License

Licensed and distributed under either of

* MIT license: [LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT

or

* Apache License, Version 2.0, ([LICENSE-APACHEv2](LICENSE-APACHEv2) or http://www.apache.org/licenses/LICENSE-2.0)

at your option. These files may not be copied, modified, or distributed except according to those terms.
