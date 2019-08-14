"use strict";

const request = require('request');
const fs = require('fs');

module.exports = {
    ready () {
        console.log("Initializing library docs fetching");

        let rawdata = fs.readFileSync('config.json');  
        let configuration = JSON.parse(rawdata);  
        
        let repos = configuration.repos;

        let mainReadme = fs.readFileSync('README.template', 'utf8');
        console.log("Loaded main README template.");
        let mainReadmeLibs = "";

        let startSeparators = configuration.separators[0].split(configuration.separators[2]);
        let endSeparators = configuration.separators[1].split(configuration.separators[2]);

        for (let i = 0; i < repos.length; i++) {

            console.log("Processing " + repos[i].label);

            let tags = repos[i].tags;
            mainReadmeLibs += "::: theorem <a href='/lib/"+repos[i].name.replace(/\/?$/, '/')+"'>"+repos[i].label+"</a>";
            for (let tagIndex = 0; tagIndex < tags.length; tagIndex++) {
                mainReadmeLibs += "<Badge text='"+tags[tagIndex]+"' ";
                if (configuration.tags[tags[tagIndex]].type !== undefined) {
                    mainReadmeLibs += "type='"+configuration.tags[tags[tagIndex]].type+"'";
                }
                mainReadmeLibs += "/>"
            }
            mainReadmeLibs += "\n" + repos[i].description + "\n:::\n\n";

            // Skip iteration if update is disabled, library is fully manual
            if (repos[i].update === false) {
                console.log("Skipping " + repos[i].label + " because it's set to manual.");
                continue;
            }

            let repoPath = repos[i].location.replace(/\/?$/, '/');
            let rawPath = repoPath.replace("https://github.com", "https://raw.githubusercontent.com");
            let readmePath = rawPath + "master/README.md";

            processReadme(readmePath);

            function processReadme(path) {

                console.log("Fetching " + readmePath);
                request.get(readmePath, async function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        console.log("File fetched successfully");
                        let content = body;
    
                        let ss, es;
                        for (let ssLen = 0; ssLen < startSeparators.length; ssLen++) {
                            if (content.indexOf(startSeparators[ssLen]) > -1) {
                                ss = startSeparators[ssLen];
                                break;
                            }
                        }
                        for (let esLen = 0; esLen < endSeparators.length; esLen++) {
                            if (content.indexOf(endSeparators[esLen]) > -1) {
                                es = endSeparators[esLen];
                                break;
                            }
                        }
    
                        let readmeBody = content.split(ss)[1];
                        readmeBody = "# " + repos[i].label + "\n\n" + readmeBody.split(es)[0];

                        console.log("Fixing images");
                        // Apply only to local images in repo
                        readmeBody = readmeBody.replace(/\!\[(.*)\]\((?!http)(.*)\)/igm, function (match, g1, g2) {
                            return "![" + g1 + "](" + repos[i].location.replace(/\/?$/, '/')+"raw/master/" + g2 + "?sanitize=true)";
                        });

                        if (repos[i].subdocs !== undefined && readmeBody.indexOf(repos[i].subdocs) > -1) {
                            console.log("Subdocs detected in README. Parsing nested docs.");
                            // Grab the whole section, from subdocs label to next newline starting with # (new subheading)
                            let subSection = readmeBody.split(repos[i].subdocs)[1];
                            subSection = subSection.split(/^##\s.*/gmi)[0];

                            // console.log("-----------------");
                            // console.log(readmeBody);
                            readmeBody = readmeBody.replace(repos[i].subdocs + subSection, "--subdocs--");
                            // console.log(readmeBody);
                            // console.log(readmeBody.indexOf(subSection));
                            // console.log("-----------------");

                            let rex = /\((.*\.md)\)/gmi;
                            let match = rex.exec(subSection);
                            //let matches = [];
                            let subdocsContent = "";
                            while (match != null) {
                                //matches.push(match[1]);
                                // Got all the links, let's fetch them.
                                // console.log("Fetchable link " + readmePath.replace("README.md", match[1]));
                                let subdoc = await downloadPage(readmePath.replace("README.md", match[1]));
                                match = rex.exec(subSection);

                                // Deepen heading level for all subheadings if H1 detected
                                subdoc = deepenHeadings(subdoc);

                                subdocsContent += subdoc;
                            }

                            //console.log(subdocsContent);
                            readmeBody = readmeBody.replace("--subdocs--", subdocsContent);
                        }
    
                        let frontMatter = "";
                        if (repos[i].frontMatter !== undefined) {
                            for (let key in repos[i].frontMatter) {
                                if (repos[i].frontMatter.hasOwnProperty(key)) {
                                    frontMatter += key + ": " + repos[i].frontMatter[key] + "\n";
                                }
                            }
                            frontMatter = "---\n" + frontMatter + "---\n\n";
                        }
    
                        let finalFile = frontMatter + readmeBody;
    
                        var dir = './lib/'+repos[i].name;
    
                        if (!fs.existsSync(dir)){
                            fs.mkdirSync(dir);
                        }
    
                        console.log("Writing " + dir+"/README.md");
                        fs.writeFileSync(dir+"/README.md", finalFile, function(err) {
                            if(err) {
                                return console.log(err);
                            }
                        
                            console.log("The file " + dir + "/README.md" + " was saved!");
                        }); 
                    }
                });                
            }

        }

        console.log("Preparing to write new main README file");
        mainReadme = mainReadme.replace("{{{libraries}}}", mainReadmeLibs);
        fs.writeFileSync("./README.md", mainReadme, function(err) {
            if(err) {
                return console.log(err);
            }
        
            console.log("The main README.md file was saved!");
        }); 
    }     
}

function downloadPage(url) {
    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (error) reject(error);
            if (response.statusCode != 200) {
                reject('Invalid status code <' + response.statusCode + '>');
            }
            resolve(body);
        });
    });
}

function deepenHeadings(content) {
    // Detect if H1 exists
    let h1rex = /^#\s.*/gmi;
    if (h1rex.test(content)) {
        // Increase all headings by one
        console.log("Subdoc has H1 heading, pushing all headings one level down");
        content = content.replace(/^#/gmi, "##");
    }
    return content;
}