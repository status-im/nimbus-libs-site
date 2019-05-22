---
sidebar: auto
---

# About

This documentation suite was created as a comprehensive guide for using the Nim libraries produced by the Nimbus team at Status.im.

## What is Nimbus?

[Nimbus](https://nimbus.status.im) is an Ethereum 2.0 client, but these libraries are designed to be used outside of that context too. If your project needs good cryptography or verbose logging output, these libraries should fit the bill nicely.

You do not need to be a Nimbus user or developer to make use of these libraries.

## Why not Nimdoc?

We actually do use Nimdoc for the API reference included in each library's documentation on this site. However, Nimdoc's template isn't the easiest to modify and it can produce some buggy results, so we use its JSON output to feed the API docs into this tome, and we use Vuepress for the rest of the functionality, like custom layouts, styling, SEO support, searchability, and of course - custom documentation support, like guides, tutorials, references, and more.

## Contributing

You can contribute to these docs by submitting issues or pull requests in the official repository at [status-im/nimbus-docs-suite](https://github.com/status-im/nimbus-docs-suite).

Keep in mind the following:

- the API reference is generated from individual libraries. Thus, if you notice a mistake in the API reference, to submit a fix you should submit a PR to the library in question and fix its docblock.
- the guides are curated and not everything that's written about the libraries will be included here.