import inquirer from 'inquirer'
import fuzzypath from 'inquirer-fuzzy-path'
import * as Logger from './Logger.js'
import configs from './Imaps.js'
import os from 'os'

export const file = () => {
    inquirer.registerPrompt('fuzzypath', fuzzypath)
    return inquirer.prompt([
        {
            excludePath: nodePath => {
                return os.platform() === 'darwin' // IF MACOS
                    ? nodePath.includes('/.') || // REMOVE
                          nodePath.includes('node_modules') ||
                          nodePath.includes('/Library/')
                    : nodePath.includes('/.') ||
                          nodePath.includes('node_modules') // FALSE
            },
            excludeFilter: nodePath =>
                !(nodePath.includes('.txt') && nodePath !== 'results.txt'),

            // excludePath :: (String) -> Bool
            // excludePath to exclude some paths from the file-system scan
            type: 'fuzzypath',
            name: 'path',
            itemType: 'file',
            rootPath: os.homedir(),
            message: 'Select your dictionary/combolist',
            default: null,
            suggestOnly: false,
            depthLimit: 6,
        },
    ])
}

export const host = () => {
    Logger.clear()
    let arrayConfigs = []
    for (const conf in configs) arrayConfigs.push(conf)

    //arrayConfigs.pop() // REMOVE UNWANTED DEFAULT

    return inquirer.prompt({
        type: 'checkbox',
        name: 'selection',
        message: 'Select host to Attack',
        choices: arrayConfigs,
        pageSize: 6,
    })
}
