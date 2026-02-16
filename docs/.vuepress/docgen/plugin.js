"use strict";

const request = require('request'); // fetching remote files from repos
const fs = require('fs'); // file system operations like copying, renaming, reading files
const path = require('path'); // needed for some OS-agnostic file / folder path operations
const rm = require('rimraf'); // used to synchronously delete the git repos after generating API ref

const { execSync } = require('child_process'); // to trigger the external processes like cloning or Nim calling
const selectedLibs = new Set(
    (process.env.NIMBUS_LIBS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
);

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
            if (
                selectedLibs.size > 0 &&
                !selectedLibs.has(repos[i].name) &&
                !selectedLibs.has(repos[i].label)
            ) {
                console.log("Skipping " + repos[i].label + " because it is not in NIMBUS_LIBS.");
                continue;
            }

            let tags = repos[i].tags;
            mainReadmeLibs += "::: theorem <a href='/lib/"+repos[i].name.replace(/\/?$/, '/')+"'>"+repos[i].label+"</a>";
            for (let tagIndex = 0; tagIndex < tags.length; tagIndex++) {
                mainReadmeLibs += "<Badge text='"+tags[tagIndex]+"' ";
                let selTag = configuration.tags[tags[tagIndex]]
                if (selTag !== undefined && selTag.type !== undefined) {
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
    
                        let readmeBody = content
                        let readmeParts = content.split(ss)
                        if (readmeParts.length >= 2) {
                          readmeBody = readmeParts[1];
                        }
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
                            try {
                                generateApiReference(repos[i]);
                            } catch (e) {
                                console.log("Failed API reference generation for " + repos[i].label);
                                console.log(e);
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
    
                        var dir = './docs/lib/'+repos[i].name;
    
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
        fs.writeFileSync("./docs/README.md", mainReadme, function(err) {
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

function generateApiReference(repo) {
    if (!repo.apiref || repo.apiref.lang !== "nim") {
        return;
    }

    const mainfiles = normalizeMainfiles(repo.apiref);
    if (!mainfiles.length) {
        throw new Error("apiref.mainfile or apiref.mainfiles must be provided for " + repo.name);
    }
    if (!repo.apiref.subfolder) {
        throw new Error("apiref.subfolder is required for " + repo.name);
    }

    const tempRepoDir = ".docgen-apiref-" + repo.name + "-" + Date.now();
    const cloneTarget = path.join(process.cwd(), tempRepoDir);
    const libraryOutDir = path.join("docs", "lib", repo.name);
    const outFile = path.join(libraryOutDir, "api.md");

    console.log("Starting nimdoc generation for repo " + repo.label);
    execSync("git clone " + repo.location + " " + tempRepoDir, { stdio: "inherit" });
    try {
        if (repo.apiref.bootstrap !== undefined) {
            console.log("Running bootstrap for " + repo.label);
            execSync(repo.apiref.bootstrap, { cwd: cloneTarget, stdio: "inherit" });
        }

        let md = "# API reference\n\n";
        for (let i = 0; i < mainfiles.length; i++) {
            const mainfile = mainfiles[i];
            const moduleName = mainfile.replace(/\.nim$/i, "");

            // Two passes because jsondoc can miss symbols otherwise.
            console.log("Generating docs for " + mainfile);
            execSync("nim doc --project " + mainfile, { cwd: cloneTarget, stdio: "inherit" });
            console.log("Generating jsondocs for " + mainfile);
            execSync("nim jsondoc --project " + mainfile, { cwd: cloneTarget, stdio: "inherit" });

            const jsonFiles = collectNimJsonDocs(cloneTarget, repo.apiref.subfolder, moduleName);
            md += renderNimJsonDocs(moduleName, jsonFiles);
        }

        if (!fs.existsSync(libraryOutDir)) {
            fs.mkdirSync(libraryOutDir, { recursive: true });
        }
        fs.writeFileSync(outFile, "---\nsidebar: auto\n---\n\n" + md);
        console.log("Wrote " + outFile);
    } finally {
        rm.sync(tempRepoDir);
    }
}

function normalizeMainfiles(apiref) {
    if (Array.isArray(apiref.mainfiles)) {
        return apiref.mainfiles.filter(Boolean);
    }
    if (typeof apiref.mainfile === "string" && apiref.mainfile.length > 0) {
        return [apiref.mainfile];
    }
    return [];
}

function collectNimJsonDocs(cloneTarget, subfolder, moduleName) {
    const extension = ".json";
    const docsRoot = path.join(cloneTarget, subfolder);
    const jsonFiles = [];

    const mainJsonPath = path.join(docsRoot, moduleName + extension);
    if (fs.existsSync(mainJsonPath)) {
        jsonFiles.push(JSON.parse(fs.readFileSync(mainJsonPath, "utf8")));
    }

    const subdir = path.join(docsRoot, moduleName);
    if (fs.existsSync(subdir)) {
        const files = fs.readdirSync(subdir);
        files.forEach(file => {
            if (file.endsWith(extension)) {
                jsonFiles.push(JSON.parse(fs.readFileSync(path.join(subdir, file), "utf8")));
            }
        });
    }

    return jsonFiles;
}

function renderNimJsonDocs(moduleName, jsonFiles) {
    let md = "## " + moduleName + "\n\n";
    if (!jsonFiles.length) {
        return md + "_No generated API docs found._\n\n";
    }

    const apiRefTemplateNim = "#### {name}\n\n{description}\n\n```nim\n{code}\n```\n\n";
    for (let z = 0; z < jsonFiles.length; z++) {
        const doc = jsonFiles[z] || {};
        const entries = Array.isArray(doc.entries) ? doc.entries : [];
        const origin = (doc.orig || moduleName).toString();
        md += "### " + origin.replace(/^.*[\\/]/, "").replace(/\.nim$/i, "") + "\n\n";
        if (!entries.length) {
            md += "_No exported entries._\n\n";
            continue;
        }

        const content = {
            types: "",
            procs: "",
            templates: ""
        };
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i] || {};
            const newTpl = apiRefTemplateNim
                .replace("{description}", (entry.description || "").trim())
                .replace("{name}", entry.name || "<unnamed>")
                .replace("{code}", ((entry.code || "").trim()));
            switch (entry.type) {
                case "skType":
                    content.types += newTpl;
                    break;
                case "skProc":
                    content.procs += newTpl;
                    break;
                case "skTemplate":
                    content.templates += newTpl;
                    break;
                default:
                    break;
            }
        }

        md += "#### Types\n\n" + (content.types || "_None._\n\n");
        md += "#### Procs\n\n" + (content.procs || "_None._\n\n");
        md += "#### Templates\n\n" + (content.templates || "_None._\n\n");
    }
    return md + "\n";
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
