import inquirer from "inquirer";
import fuzzypath from "inquirer-fuzzy-path";
import * as Logger from "./Logger";
import * as configs from "./imaps.json";

export const file = () => {
  inquirer.registerPrompt("fuzzypath", fuzzypath);

  return inquirer.prompt([
    {
      excludePath: nodePath => nodePath.startsWith("node_modules"),
      excludeFilter: nodePath => !(nodePath.includes(".txt") && nodePath !== "results.txt"),

      // excludePath :: (String) -> Bool
      // excludePath to exclude some paths from the file-system scan
      type: "fuzzypath",
      name: "path",
      itemType: "file",
      rootPath: '.',
      message: "Select your dictionary/combolist",
      default: null,
      suggestOnly: false,
      depthLimit: 6
    }
  ]);
};

export const bot = () => {
  return inquirer.prompt({
    type: "confirm",
    name: "activeBot",
    message: 'Do you want to enable the telegram bot "@ChichkeBOT"'
  });
};

export const host = () => {
  Logger.clear();
  let arrayConfigs = [];
  for (const conf in configs) arrayConfigs.push(conf);

  arrayConfigs.pop(); // REMOVE UNWANTED DEFAULT 

  return inquirer.prompt({
    type: "checkbox",
    name: "selection",
    message: "Select host to Attack",
    choices: arrayConfigs,
    pageSize: 6
  });
};
