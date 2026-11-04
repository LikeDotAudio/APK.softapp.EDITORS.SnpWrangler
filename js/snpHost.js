// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* snpHost.js — the SNP block in and out of the CAD over cad.like.audio/host@1,
   through the vendored APKSoftapp client (ROAD-3485 / ROAD-3491). No DOM here:
   the round-trip test drives it with the real client in a stub window. */

import { SnpModel } from './snpModel.js';

export const EDITOR = 'SNP Stream Wrangler';
export const BLOCK_TYPE = 'snpwrangler';

export function blockMeta(model) {
  return { filename: String(model.unitName || 'snp').toLowerCase(), title: `SNP ${model.unitName}` };
}

/**
 * state.model is the live SnpModel; onLoaded(model, meta) redraws.
 * Returns the APKSoftapp host handle (changed / save / close / embedded).
 */
export function connectSnpHost(S, state, { onLoaded, notice } = {}) {
  return S.connectHost({
    editor: EDITOR,
    blockType: BLOCK_TYPE,
    block: state.model.toJSON(),
    notice,
    onLoad: (block, meta) => {
      state.model = new SnpModel(block);
      if (onLoaded) onLoaded(state.model, meta);
    },
    onRequest: () => ({ block: state.model.toJSON(), meta: blockMeta(state.model) }),
  });
}
