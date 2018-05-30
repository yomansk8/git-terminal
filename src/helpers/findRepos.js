import readdirp from 'readdirp'

const findRepos = (dir, depth = 5) => {
  return new Promise((resolve, reject) => {
    const found = []
    readdirp({ root: dir, directoryFilter: '.git', depth })
      .on('error', (err) => {
        reject(err)
      })
      .on('data', (data) => {
        found.push(`${data.fullParentDir} ${data.name}`)
      })
      .on('end', () => {
        resolve(found)
      })
  })
}

export default findRepos
