"use strict";

const request = require('request'); // fetching remote files from repos
const fs = require('fs'); // file system operations like copying, renaming, reading files
const path = require('path'); // needed for some OS-agnostic file / folder path operations
const rm = require('rimraf'); // used to synchronously delete the git repos after generating API ref

const { execSync } = require('child_process');

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

                        if (repos[i].apiref !== undefined) {
                            switch (repos[i].apiref.lang) {
                                case "nim":
                                    try {
                                    const apiRefTemplateNim = "#### {name} \n\n {description} \n\n```nim{code}\n```\n\n";
                                    console.log("Starting nimdoc generation for repo " + repos[i].label);
                                    
                                    execSync('git clone ' + repos[i].location + " " + repos[i].name, (err, stdout, stderr) => {
                                        if (err) {
                                            console.error("Could not launch git clone");
                                            return;
                                        }
                                      
                                        console.log(`stdout: ${stdout}`);
                                        console.log(`stderr: ${stderr}`);
                                    });

                                    // Two passes because jsondoc is kinda broken
                                    // Bug: https://github.com/nim-lang/Nim/issues/11953
                                    console.log("Generating docs");
                                    execSync('nim doc --project ' + repos[i].name + '/' + repos[i].apiref.mainfile);
                                    console.log("Generating jsondocs");
                                    execSync('nim jsondoc --project ' + repos[i].name + '/' + repos[i].apiref.mainfile);

                                    console.log("Consuming files");

                                    let dir = repos[i].name + '/' + repos[i].apiref.subfolder;

                                    let jsonFiles = [];
                                    // Consume main file
                                    jsonFiles.push(JSON.parse(fs.readFileSync(dir + "/" + repos[i].apiref.mainfile.split(".nim")[0] + ".json")));
                                    // Consume all other files
                                    let subdir = dir + "/" + repos[i].apiref.mainfile.split(".nim")[0];
                                    let files = fs.readdirSync(subdir);
                                    files.forEach(file => {
                                        if(/\.json$/.test(file)) {
                                            let jsonContent = fs.readFileSync(subdir + "/" + file);
                                            jsonFiles.push(
                                                JSON.parse(jsonContent)
                                            );
                                        }
                                    });   

                                    console.log("Found " + jsonFiles.length + " doc file to MD-ify");
                                    let md = "";
                                    for (let z = 0; z < jsonFiles.length; z++) {
                                        // Turn each into MD
                                        console.log(jsonFiles[z].orig + " has " + jsonFiles[z].entries.length + " entries to document.");
                                        
                                        let entries = jsonFiles[z].entries;

                                        console.log("Processing " + jsonFiles[z].orig.match(/(\w+)\.nim$/gmi)[0].replace('.nim', ''));
                                        
                                        let prefix = (z === 0) ? "# API reference: " : "## ";
                                        md += prefix + jsonFiles[z].orig.match(/(\w+)\.nim$/gmi)[0].replace('.nim', '') + "\n";
                                        
                                        if (entries.length) {

                                            // Sort entries by type like in HTML docs
                                            let content = {
                                                "types": "", // skType
                                                "procs": "", // skProc
                                                "templates": "" // skTemplate
                                            }
 
                                            console.log("Working through entries of " + jsonFiles[z].orig);

                                            for (let z1 = 0; z1 < entries.length; z1++) {

                                                let newTpl = apiRefTemplateNim
                                                    .replace("{description}", entries[z1].description)
                                                    .replace("{name}", entries[z1].name)
                                                    .replace("{code}", "\n" + entries[z1].code.trim());

                                                switch(entries[z1].type) {
                                                    case "skType":
                                                        content.types += newTpl;
                                                        break;
                                                    case "skProc":
                                                        content.procs += newTpl;
                                                        break;
                                                    case "skTemplate":
                                                        content.templates += newTpl;
                                                        break;
                                                    default: break;
                                                }
                                            }

                                            md += "### Types\n\n" + content.types + "\n\n---\n\n### Procs\n\n---\n\n" + content.procs + "\n\n---\n\n### Templates\n\n---\n\n" + content.templates + "\n\n";
                                        }
                                    }
                                    
                                    fs.writeFileSync("lib/" + repos[i].name + "/api.md", "---\nsidebar: auto\n---\n\n" + md);
                                    rm.sync(repos[i].name);
                                    break;
                                } catch (e) {
                                    console.log(e);
                                    rm.sync(repos[i].name);
                                }
                                default: break;
                            }
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

const listDir = (dir, fileList = []) => {

    let files = fs.readdirSync(dir);

    files.forEach(file => {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            fileList = listDir(path.join(dir, file), fileList);
        } else {
            if(/\.html$/.test(file)) {
                let name = file.split('.')[0].replace(/\s/g, '_') + '.json';
                let src = path.join(dir, file);
                let newSrc = path.join(dir, name);
                fileList.push({
                    oldSrc: src,
                    newSrc: newSrc
                });
            }
        }
    });

    return fileList;
};