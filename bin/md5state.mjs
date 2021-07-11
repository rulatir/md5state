import {promises as fs} from "fs";
import getStdin from "get-stdin";
import md5 from "crypto-js/md5.js";
import hex from "crypto-js/enc-hex.js";

class UsageError extends Error
{
    constructor() {
        super(
            `Usage:
    md5state [options] [--] [arguments]
    
Options:
    --
        treat subsequent arguments as files
    -
        read filelist from stdin
    -i path
        read filelist from file specified by path
    -n string
        use string as the pseudo-checksum for nonexistent files (default: "[nonexistent]")
    -N
        fail if a file doesn't exist
    -n-
        omit nonexistent files from output
    -d string
        use string as the pseudo-checksum for filelist entries that are directories
    -D
        fail if an item is a directory
    -d-
        omit directories from output (default)
    -u string
        use string as the pseudo-checksum for existing but unreadable filelist entries
    -U
        fail on unreadable files (default)
    -u-
        omit unreadable filelist entries from output
`.trim()
        );
        this.name = "UsageError";
    }
}

/**
 *
 * @param {string[]} argv
 */
async function main(argv)
{
    const settings = parseCommandLine(argv.slice());
    const files = await loadFileList(settings);
    validate(settings, files);
    console.log((await hashFiles(files, settings))+'\n');
}

/**
 *
 * @param {object} settings
 * @param {string[]} files
 */
function validate(settings, files)
{
    //nothing to do for now, validate algorithm name once we support specifying it
}

/**
 * @param files
 * @param settings
 * @return {Promise<string>}
 */
async function hashFiles(files, settings)
{
    const hashes = (await Promise.all(files.map(_ => hashFile(_, settings)))).filter(_ => undefined !== _);
    return hashes.map(_ => _.hash + "  " + _.path).join("\n");
}

/**
 * @typedef {Object<string, string>} HashResult
 * @property {string} path
 * @property {string} hash
 */

/**
 *
 * @param path
 * @param settings
 * @return {Promise<HashResult>}
 */
async function hashFile(path, settings)
{
    const result = { path };
    try {
        result.hash = hex.stringify(md5(await fs.readFile(path,"utf8")));
    }
    catch (e) {
        if (e instanceof Error) {
            switch(e.code) {
                case "ENOENT": return recover(result, settings.nonexistent, e);
                case "EISDIR": return recover(result, settings.directory, e);
                case "EACCES": return recover(result, settings.unreadable, e);
            }
        }
        throw new Error(`Error when processing ${path}: ${e.message || e.name || e.code || e.toString()}`);
    }
    return result;
}

/**
 *
 * @param {HashResult} result
 * @param {string|undefined|boolean} policy
 * @param {Error} e
 * @return {HashResult|undefined}
 */
function recover(result, policy, e)
{
    switch(policy) {
        case undefined: return undefined;
        case false: throw new Error(
            `Error when processing ${result.path}: ${e.message || e.name || e.code || e.toString()}`
        );
        default: result.hash = policy; return result;
    }
}


/**
 *
 * @param {object} settings
 * @return {Promise<string[]>}
 */
async function loadFileList(settings)
{
    switch(settings.filelistSource) {
        case "argv": return settings.filelist;
        case "file": return parseFileList(settings, await fs.readFile(settings.filelistSource, "utf8"));
        case "stdin": return parseFileList(settings, (await getStdin.buffer()).toString("utf8"));
    }
    return [];
}

/**
 * @param {object} settings
 * @param {string} contents
 * @return {string[]}
 */
function parseFileList(settings, contents)
{
    return contents.split("\n").filter(_ => (''+_).length > 0);
}

/**
 *
 * @param {string[]} argv
 * @return {object}
 */
function parseCommandLine(argv) {

    const settings = {
        filelistSource:     "argv",
        nonexistent:        "[nonexistent]",
        unreadable:         false,
        algorithm:          "md5",
    };
    let arg;
    while(argv.length) {
        switch(arg = argv.shift()) {
            case "--":
                settings.filelistSource = "argv"; settings.filelist = argv; return settings;
            case "-":
                settings.filelistSource = "stdin"; delete settings.filelist; break;
            case "-h":
                settings.algorithm = argv.shift(); break;
            case "-i":
                settings.filelistSource = "file"; settings.filelist = argv.shift(); break;
            case "-n":
                settings.nonexistent = argv.shift(); break;
            case "-N":
                settings.nonexistent = false; break;
            case "-n-":
                delete settings.nonexistent; break;
            case "-d":
                settings.directory = argv.shift(); break;
            case "-D":
                settings.directory = false; break;
            case "-d-":
                delete settings.directory; break;
            case "-u":
                settings.unreadable = argv.shift(); break;
            case '-U':
                settings.unreadable = false; break;
            case "-u-":
                delete settings.unreadable; break;
            default:
                if ('-' === arg.charAt(0)) {
                    throw new UsageError();
                }
                argv.unshift(arg);
                break;
        }
    }
    if ("argv" === settings.filelistSource) {
        settings.filelist = argv;
    }
    return settings;
}

try {
    await main(process.argv.slice(2));
}
catch(e) {
    console.error(e.message || e.name || e.code || e.toString());
    process.exit(1);
}
