import * as Logger from "./Logger";
import colors from "colors";

export const noHost = () => {
  console.log(
    colors.white("Please select a least one ") +
      colors.white.underline.bold("Host") +
      colors.white("...")
  );
  process.exit();
};

export const badDictionary = () => {
  console.log(
    colors.white("Please select a valid ") +
      colors.underline.bold("Dictionary") +
      colors.white("...")
  );
  process.exit();
};

export const telegramError = () => {
  console.log(
    colors.white("Failed to retrieve the Telegram API, ") +
      colors.white.bold("Check your internet connection or API KEY")
  );
  process.exit();
};
