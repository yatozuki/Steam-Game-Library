import chalk from 'chalk';

export function time() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    return `${hours}h: ${minutes}m: ${seconds}s`;
}

export const log = console.log;

export function cleanExit(saveData) {
    log(chalk.yellow('\nSaving final progress before shutdown...'));
    saveData();
    process.exit(0);
}