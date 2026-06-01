export function downloadProjectFile(data) {
  const name = data.meta?.projectName?.trim() || 'engagement'
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const filename = `${slug}.acef.json`
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function readProjectFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data.version || !data.meta) {
          reject(new Error('Not a valid .acef.json project file'))
          return
        }
        resolve(data)
      } catch {
        reject(new Error('File could not be parsed as JSON'))
      }
    }
    reader.onerror = () => reject(new Error('File could not be read'))
    reader.readAsText(file)
  })
}
