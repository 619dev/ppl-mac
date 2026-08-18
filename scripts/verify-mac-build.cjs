const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const projectDir = path.resolve(__dirname, '..')
const { version } = require(path.join(projectDir, 'package.json'))
const releaseDir = path.join(projectDir, 'release', version)
const appPath = path.join(releaseDir, 'mac-universal', 'PaperPhoneLite.app')
const dmgPath = path.join(releaseDir, `PaperPhoneLite-${version}-macOS.dmg`)

function run(command, args) {
  console.log(`> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    cwd: projectDir,
    encoding: 'utf8',
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    const error = new Error(`${command} exited with status ${result.status}`)
    Object.assign(error, result)
    throw error
  }
  return `${result.stdout || ''}${result.stderr || ''}`
}

function fail(message, error) {
  console.error(`\nmacOS build verification failed: ${message}`)
  if (error?.stdout) process.stderr.write(error.stdout)
  if (error?.stderr) process.stderr.write(error.stderr)
  process.exit(1)
}

if (!fs.existsSync(appPath)) {
  fail(`app bundle not found: ${appPath}`)
}
if (!fs.existsSync(dmgPath)) {
  fail(`DMG not found: ${dmgPath}`)
}

try {
  run('codesign', ['--verify', '--deep', '--strict', '--verbose=4', appPath])
} catch (error) {
  fail('the app bundle has an invalid or incomplete code signature', error)
}

let signatureDetails
try {
  signatureDetails = run('codesign', ['--display', '--verbose=4', appPath])
} catch (error) {
  fail('unable to inspect the app signature', error)
}

if (/Signature=adhoc/.test(signatureDetails) || /TeamIdentifier=not set/.test(signatureDetails)) {
  fail('the app is ad-hoc signed; a Developer ID Application signature is required')
}
if (!/Authority=Developer ID Application:/.test(signatureDetails)) {
  fail('the app is not signed with a Developer ID Application certificate')
}

try {
  run('xcrun', ['stapler', 'validate', appPath])
} catch (error) {
  fail('the notarization ticket is missing or invalid', error)
}

try {
  run('spctl', ['--assess', '--type', 'execute', '--verbose=4', appPath])
  run('spctl', [
    '--assess',
    '--type',
    'open',
    '--context',
    'context:primary-signature',
    '--verbose=4',
    dmgPath,
  ])
} catch (error) {
  fail('Gatekeeper rejected the app or DMG', error)
}

console.log(`\nVerified signed and notarized macOS ${version} release.`)
