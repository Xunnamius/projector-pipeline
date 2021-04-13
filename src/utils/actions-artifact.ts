import { name as pkgName } from '../../package.json';
import { ComponentActionError } from '../error';
import debugFactory from 'debug';
import artifact from '@actions/artifact';

const debug = debugFactory(`${pkgName}:actions-artifact`);

/**
 * Upload `paths` to artifact storage using key `artifactKey`.
 */
export async function uploadPaths(
  paths: string[],
  artifactKey: string,
  retentionDays: number
) {
  debug(
    `uploading artifact with key "${artifactKey}" (${retentionDays}) and paths: %O`,
    paths
  );

  const uploadInfo = await artifact
    .create()
    .uploadArtifact(artifactKey, paths, '.', { continueOnError: false, retentionDays });

  if (!uploadInfo.artifactItems.length) {
    throw new ComponentActionError(
      `failed to upload artifact "${artifactKey}": paths matched 0 items`
    );
  }

  if (uploadInfo.failedItems.length) {
    throw new ComponentActionError(
      `failed to upload artifact "${artifactKey}": ` +
        `${uploadInfo.failedItems.length} items failed to upload`
    );
  }
}

/**
 * Download and unpack artifact `artifactKey` to directory `destDir`. By
 * default, `destDir` is the current working directory.
 */
export async function downloadPaths(artifactKey: string, destDir?: string) {
  debug(`downloading artifact with key "${artifactKey}" to path: ${destDir}`);
  await artifact
    .create()
    .downloadArtifact(artifactKey, destDir, { createArtifactFolder: false });
}
