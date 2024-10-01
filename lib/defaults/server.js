import { Meteor } from 'meteor/meteor';
import { DDP } from 'meteor/ddp-client';
import { shouldSet, hasUser, resolveValue } from './shared';
import { isEmpty, extract } from '../utils/shared';
import { merge } from '../utils/server';
import { unflatten } from 'flat';

export const setDefaults = async ({ $defaults, args, isUpdate, isUpsert, isReplace }) => {
  if (!$defaults) return;

  const isInsert = !isUpdate;
  const defaults = (isInsert || isUpsert) ? $defaults : $defaults.filter(({ value }) => shouldSet(value));
  if (!defaults.length) {
    return;
  }

  if (args[0] === undefined) args[0] = {};

  const userId = DDP._CurrentInvocation.get()?.userId;
  const needsUser = defaults.some(({ value }) => hasUser(value));
  const user = needsUser && userId && await Meteor.users.findOneAsync(userId);
  const now = new Date();

  // inserts
  if (isInsert) {
    for (const { path, value } of defaults) {
      if (extract(args[0], path) === undefined) {
        const key = path.join('.');
        const obj = unflatten({ [key]: await resolveValue({ value, userId, user, now }) });

        merge(obj, args[0]);
      }
    }

    return;
  }

  // updates
  const { $set = {}, $setOnInsert = {}, ...rest } = args[1] || {};

  for (const { path, value } of defaults) {
    const key = path.join('.');

    if ($set[key] === undefined && shouldSet(value)) {
      $set[key] = await resolveValue({ value, userId, user, now });
    }

    if (isUpsert && $set[key] === undefined && $setOnInsert[key] === undefined) {
      $setOnInsert[key] = await resolveValue({ value, userId, user, now });
    }
  }

  args[1] = isReplace ? { ...unflatten($setOnInsert), ...unflatten($set), ...rest } : { ...(!isEmpty($setOnInsert) && { $setOnInsert }), ...(!isEmpty($set) && { $set }), ...rest };

  return;
};
