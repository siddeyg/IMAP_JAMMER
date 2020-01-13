import cliProgress from 'cli-progress'

export const progressBar = new cliProgress.SingleBar(
    { forceRedraw: true },
    cliProgress.Presets.shades_classic
)

export const clear = () => {
    process.stdout.write('\x1Bc')
}
