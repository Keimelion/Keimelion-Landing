import packageJson from '../../package.json' with { type: 'json' }

const VERSION_PREFIX = 'v'
const BUILD_METADATA_SEPARATOR = '+'

function formatAppVersion(version: string, commitSha: string): string {
  if (commitSha === '') return `${VERSION_PREFIX}${version}`
  return `${VERSION_PREFIX}${version}${BUILD_METADATA_SEPARATOR}${commitSha}`
}

export const APP_VERSION = formatAppVersion(packageJson.version, process.env.GIT_SHA ?? '')
