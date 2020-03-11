const fs = require('fs');

let rawdata = fs.readFileSync('./config.json');  
let configuration = JSON.parse(rawdata);

// Builds the navigation (sidebar)
let repos = configuration.repos;
var nav = [];
var sidebar = {};

for (let i = 0; i < repos.length; i++) {
    let topLevel = {
        text: repos[i].label
    }
    // Broken as fuck
    //if (repos[i].apiref !== undefined) {
    //    topLevel['items'] = [
    //        {text: "Docs", link: "/lib/" + repos[i].name.replace(/\/?$/, '/')},
    //        {text: "API Reference", link: "/lib/" + repos[i].name.replace(/\/?$/, '/') + "api.html"} 
    //    ];
    //} else {
    //    topLevel['link'] = "/lib/" + repos[i].name.replace(/\/?$/, '/');
    //}
    topLevel = {
      text: repos[i].label,
      link: "/lib/" + repos[i].name.replace(/\/?$/, '/'),
    }
    nav.push(topLevel);

    //sidebar[repos[i].name] = getSidebar(repos[i]);
}

module.exports = {
    title: 'Nimbus Libraries',
    description: 'Ethereum 2.0 utilities and more',
    base: '/',
    head: [
        ['link', { rel: 'icon', href: '/assets/img/logo.png' }]
    ],
    markdown: {
        lineNumbers: true
    },
    plugins: [
        ['container', {
            type: 'right',
            defaultTitle: '',
          }],
          ['container', {
            type: 'theorem',
            before: info => `<div class="theorem"><p class="title">${info}</p>`,
            after: '</div>',
          }],
          require("./docgen/plugin.js")
    ],
    themeConfig: {
        logo: '/assets/img/logo.png',
        displayAllHeaders: true,
        serviceWorker: {
            updatePopup: true
        },
        nav: nav,
        sidebar: ["/"]
  }}

  function getSidebar(repoObject) {
      let sb = [""];
      // for each file in guides, push filename

      // menu for API ref if apiref exists
  }
