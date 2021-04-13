import { name as pkgName } from '../../package.json';
import { ComponentAction } from '../../types/global';
import metadataCollect from './metadata-collect';
import debugFactory from 'debug';
import execa from 'execa';

const debug = debugFactory(`${pkgName}:${ComponentAction.Audit}`);

export default async function () {
  const metadata = await metadataCollect();

  if (!metadata.shouldSkipCi) {
    await execa('npm', ['audit', `--audit-level=${metadata.npmAuditFailLevel}`], {
      stdio: 'inherit'
    });
  } else debug(`skipped component action "${ComponentAction.Audit}"`);
}
