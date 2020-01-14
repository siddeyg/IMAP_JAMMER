import * as Constants from './Constants.js'
import os from 'os'
import fs from 'fs'
import colors from 'colors'

export const showResult = found => {
    const result = fs.readFileSync(Constants.RESULT_FILE, { encoding: 'utf-8' })
    console.log(
        colors.green.bold('- Found out ' + found + ' correct combo -' + os.EOL)
    )
    console.log(colors.white.bold('- Result List -' + os.EOL))
    console.log(colors.bold(result))
}

export const writeResult = result => {
    fs.appendFileSync(Constants.RESULT_FILE, result)
}

export const readSave = () => {
    var rawData = fs.readFileSync(Constants.SAVE_FILE, { encoding: 'utf-8' })
    return rawData ? JSON.parse(rawData) : []
}

export const writeSave = clean => {
    fs.writeFileSync(Constants.SAVE_FILE, JSON.stringify(clean, null, 2))
}

export const createSave = () => {
    fs.open(Constants.SAVE_FILE, 'r', function(err, fd) {
        if (err) {
            fs.writeFile(Constants.SAVE_FILE, '', function(err) {
                if (err) console.log(err)
            })
        }
    })
}

export const getComboList = dictionary => {
    return fs
        .readFileSync(dictionary)
        .toString()
        .split(/\r?\n/)
}
