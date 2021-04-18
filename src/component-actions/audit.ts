import { name as pkgName } from '../../package.json';
import { ComponentAction } from '../../types/global';
import metadataCollect from './metadata-collect';
import debugFactory from 'debug';
import execa from 'execa';

const debug = debugFactory(`${pkgName}:${ComponentAction.Audit}`);

export default async function () {
  const { shouldSkipCi, npmAuditFailLevel } = await metadataCollect();

  if (!shouldSkipCi) {
    await execa('npm', ['audit', `--audit-level=${npmAuditFailLevel}`], {
      stdio: 'inherit'
    });
  } else debug(`skipped component action "${ComponentAction.Audit}"`);
}
