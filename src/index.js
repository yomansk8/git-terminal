#! /usr/bin/env node
import { spawn } from 'child_process'
import blessed from 'blessed'
import contrib from 'blessed-contrib'
import chalk from 'chalk'

import findRepos from './helpers/findRepos'

const headers = ['Name', 'Current branch', 'Diff with remote']
const dirToScan = process.argv[2] || process.cwd()

const getTimeDisplay = () => new Date().toLocaleTimeString()

const getStatusColor = status => {
  switch (status) {
    case 'Up-to-date':
      return chalk.green(status)
    case 'Need to pull':
      return chalk.yellow.bold(status)
    case 'Need to push':
      return chalk.yellow.bold(status)
    case 'Diverged':
      return chalk.red.bold(status)
    default:
      return status
  }
}

const getBranchColor = branchName => {
  switch (branchName) {
    case 'develop':
      return chalk.green(branchName)
    case 'master':
      return chalk.green.bold(branchName)
    default:
      return chalk.cyan(branchName)
  }
}

/**
 * Transform the Raw data array extracted from shell response
 * @param  {Array<String>} repoData Raw table data array extracted from shell response
 * @return {Array<String>}          Tranformed table data array
 */
const formatTableData = repoData => {
  const repoName = chalk.bold(repoData.shift().split('/').pop())
  const branchName = getBranchColor(repoData.shift())
  const status = getStatusColor(repoData.shift())
  return [repoName, branchName, status]
}

/**
 * Parse the raw data return by git-helper.sh and adapt it for contrib.table component
 * @param  {string} rawData The raw string data received from git-helper.sh
 * @return {Object}         The data object for contrib.table
 */
const parseData = rawData => {
  const data = []
  const repositories = rawData.split('\n')
  repositories.forEach(repository => {
    if (repository.length > 0) {
      data.push(formatTableData(repository.split(';')))
    }
  })
  data.sort((a, b) => {
    if (a[0] < b[0]) {
      return -1
    }
    if (a[0] > b[0]) {
      return 1
    }
    return 0
  })
  return { headers, data: data }
}

// Configuring the main screen
const mainScreen = blessed.screen({
  ullUnicode: true,
  smartCSR: true,
  autoPadding: true,
  title: 'Git Terminal'
})

// Quit on Escape, q, or Control-C
mainScreen.key(['escape', 'q', 'C-c'], () => process.exit(0))

// Configuring the layout
const grid = new contrib.grid({ rows: 12, cols: 12, screen: mainScreen })
const reposListTable = grid.set(0, 0, 8, 8, contrib.table, {
  label: 'Repositories list',
  interactive: false,
  fg: 'white',
  columnSpacing: 2, // in chars
  columnWidth: [20, 60, 16] /* in chars */
})
const actionsBox = grid.set(0, 8, 8, 4, blessed.box, { label: 'Actions' })
const outputBox = grid.set(8, 0, 4, 8, contrib.log, {
  fg: 'white',
  label: 'Output'
})
const aboutBox = grid.set(8, 8, 4, 4, blessed.box, { label: 'About' })

outputBox.log(chalk.bold('Welcome to Git Terminal'))
aboutBox.insertLine(0, `${chalk.bold('Current directory:')} ${dirToScan}`)
aboutBox.insertLine(2, `${chalk.bold('Controls List:')}`)
aboutBox.insertLine(3, '-----------------------------------')
aboutBox.insertLine(4, `${chalk.bold('Refresh repositories:')} Control+r or r`)
aboutBox.insertLine(5, `${chalk.bold('Quit:')} ESC, Control+c or q`)

mainScreen.render()

const fetchGitInformation = () => {
  findRepos(dirToScan)
    .then(repos => {
      outputBox.log(`[${getTimeDisplay()}] FOUND ${repos.length}`)
      actionsBox.setContent(String(repos))
      mainScreen.render()
    })
  outputBox.log(`[${getTimeDisplay()}] Scanning folders for git files...`)
  const gitHelper = spawn(`sh ${__dirname}/git-helper.sh ${dirToScan}`, { shell: true })
  let blob = ''

  gitHelper.stdout.on('data', data => {
    blob += data
  })

  gitHelper.stdout.on('end', () => {
    outputBox.log(`[${getTimeDisplay()}] Scanning finished!`)
    if (blob !== '') {
      const parsedData = parseData(blob.toString())
      reposListTable.setData(parsedData)
    } else {
      outputBox.log(chalk.keyword('orange')(`[${getTimeDisplay()}] No data to display...`))
    }
    mainScreen.render()
  })

  gitHelper.stderr.on('data', data => {
    outputBox.log(chalk.red(`[${getTimeDisplay()}] Error: ${data}`))
    mainScreen.render()
  })
}

// Refresh repos list on r or Control-r
mainScreen.key(['r', 'C-r'], () => fetchGitInformation())

fetchGitInformation()
setInterval(fetchGitInformation, 300000)
