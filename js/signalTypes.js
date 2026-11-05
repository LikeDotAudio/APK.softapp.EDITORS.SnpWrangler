// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* The stream signal types the inspector offers (ROAD-3501): the stored values
   and their labels are config data (config/vocabulary.json signalTypes), each
   tied to the ST 2110 essence it is in the CAD catalogue (vendor/apk-vocabulary)
   — which gives its standard, description and signal class. */
import { VOCABULARY } from './vocabulary.js';

/** [{ value, label, standard, description, class }] in config order. */
export const SIGNAL_TYPES = (VOCABULARY.config.signalTypes || []).map((t) => {
  const f = VOCABULARY.formatFor(t.value);
  return {
    value: t.value,
    label: t.label || t.value,
    standard: f ? f.abbreviation.replace(/^ST(\d+)-/, 'ST $1-') : '',
    description: f ? f.description : '',
    class: f ? f.class || '' : '',
  };
});

/** The inspector's <option>s, escaped with `esc`; the current value stays offered even when the config does not list it. */
export function signalTypeOptions(current, esc) {
  const list = SIGNAL_TYPES.some(t => t.value === current) || !current
    ? SIGNAL_TYPES
    : [...SIGNAL_TYPES, { value: current, label: current, standard: '', description: '' }];
  return list.map(t => {
    const text = t.standard ? `${t.label} (${t.standard})` : t.label;
    return `<option value="${esc(t.value)}" title="${esc(t.description)}"${t.value === current ? ' selected' : ''}>${esc(text)}</option>`;
  }).join('\n            ');
}
