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
                return  intToBool(nodePath.indexOf('/.')) || // REMOVE THESE DIRECTORY FROM THE SEARCH
                intToBool(nodePath.indexOf('node_modules')) ||
                          intToBool(nodePath.indexOf('/Library/')) ||
                    intToBool(nodePath.indexOf('Microsoft')) ||
                    intToBool(nodePath.indexOf('AppData'))

            },
            excludeFilter: nodePath =>
                !(intToBool(nodePath.indexOf('.txt')) && nodePath !== 'results.txt'),

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

const intToBool = (i) => i !== -1

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
