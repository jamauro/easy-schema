import { Meteor } from 'meteor/meteor';
import { DDP } from 'meteor/ddp-client';
import { shouldSet, hasUser, resolveValue } from './shared';
import { isEmpty, extract } from '../utils/shared';
import { merge } from '../utils/server';
import { flatten, unflatten } from 'flat';

export const setDefaults = async ({ defaults, args, isUpdate, isUpsert, isReplace }) => {
  if (!defaults) return;

  const isInsert = !isUpdate;
  const ds = (isInsert || isUpsert) ? defaults : defaults.filter(({ value }) => shouldSet(value));
  if (!ds.length) {
    return;
  }

  if (args[0] === undefined) args[0] = {};

  const userId = DDP._CurrentInvocation.get()?.userId;
  const needsUser = ds.some(({ value }) => hasUser(value));
  const user = needsUser && userId && await Meteor.users.findOneAsync(userId);
  const now = new Date();

  // inserts
  if (isInsert) {
    for (const { path, value } of ds) {
      if (extract(args[0], path) === undefined) {
        const key = path.join('.');
        const obj = unflatten({ [key]: await resolveValue({ value, userId, user, now }) });

        merge(obj, args[0]);
      }
    }

    return;
  }

  // updates
  let { $set: s = {}, $setOnInsert: soi = {}, ...rest } = args[1] || {};

  const $set = flatten(s);
  const $setOnInsert = flatten(soi);

  for (const { path, value } of ds) {
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
