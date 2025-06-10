import * as fs from 'fs'
import * as path from 'path'
import { Stream } from 'stream'

async function readFile<
  J extends boolean = true, T = J extends true ? Record<string, any> : string
> (
  filePath: string,
  options: { json: J } = { json: true as J }
): Promise<T> {
  const data = await fs.promises.readFile(filePath, {
    encoding: 'utf-8'
  })
  return options.json ? JSON.parse(data) : data as T
}

async function writeFile (
  filePath: string,
  data: | string
    | NodeJS.ArrayBufferView
    | Iterable<string | NodeJS.ArrayBufferView>
    | AsyncIterable<string | NodeJS.ArrayBufferView>
    | Stream,
  { json = true, createDirs = true }: { json: boolean, createDirs: boolean }
): Promise<void> {
  if (!fs.existsSync(filePath)) {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      if (createDirs) {
        fs.mkdirSync(dir, { recursive: true })
      } else {
        throw new Error(`Can't save file '${filePath}', folder '${dir}' doesn't exists.`)
      }
    }
  }

  await fs.promises.writeFile(
    filePath,
    json ? JSON.stringify(data) : data,
    { encoding: 'utf-8' }
  )
}

export {
  readFile,
  writeFile
}
