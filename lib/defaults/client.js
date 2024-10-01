import { resolveValue, shouldSet } from './shared';
import { isEmpty } from '../utils/shared';

export const setDefaults = ({ $defaults, args, isUpdate, isUpsert, isReplace }) => {
  if (!$defaults) return;

  const isInsert = !isUpdate;
  const defaults = (isInsert || isUpsert) ? $defaults : $defaults.filter(({ value }) => shouldSet(value));
  if (!defaults.length) {
    return;
  }

  if (args[0] === undefined) args[0] = {};

  const userId = Meteor.userId();
  const user = Meteor.user();
  const now = new Date();

  // inserts
  if (isInsert) {
    for (const { path, value } of $defaults) {
      if (path.length > 1) continue; // top-level fields only on the client

      const [ key ] = path;

      if (args[0][key] === undefined) {
        args[0][key] = resolveValue({ value, userId, user, now });;
      }
    }

    return;
  }

  // updates
  const { $set = {}, $setOnInsert = {}, ...rest } = args[1] || {};

  for (const { path, value } of defaults) {
    if (path.length > 1) continue; // top-level fields only on the client

    const [ key ] = path;

    if ($set[key] === undefined && shouldSet(value)) {
      $set[key] = resolveValue({ value, userId, user, now });
    }

    if (isUpsert && $set[key] === undefined && $setOnInsert[key] === undefined) {
      $setOnInsert[key] = resolveValue({ value, userId, user, now });
    }
  }

  args[1] = isReplace ? { ...$setOnInsert, ...$set, ...rest } : { ...(!isEmpty($setOnInsert) && { $setOnInsert }), ...(!isEmpty($set) && { $set }), ...rest };

  return;
};
