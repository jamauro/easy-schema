import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { config } from '../config/server';
import { setDefaults } from '../defaults/server';
import { hasOperators } from '../utils/shared';
import { check } from '../check/server';

// Wrap DB write operation methods
// Apply defaults, if any, and validate the data prior to insert / update / upsert
const writeMethods = ['insert', 'update'].map(m => Meteor.isFibersDisabled ? `${m}Async` : m); // Meteor.isFibersDisabled = true in Meteor 3+, eventually remove this .map when Meteor drops *Async post 3.0. upsert will run through update so we don't need to add it explicitly here.
Meteor.startup(() => {
  writeMethods.forEach(methodName => {
    const method = Mongo.Collection.prototype[methodName];
    Mongo.Collection.prototype[methodName] = async function(...args) {
      const collection = this;
      const { _name, schema, _schemaDeepOptional } = collection;

      if (!schema) {
        return method.apply(collection, args);
      }

      const isUpdate = ['update', 'updateAsync'].includes(methodName);
      const isUserServicesUpdate = isUpdate && _name === 'users' && Object.keys(Object.values(args[1])[0])[0].split('.')[0] === 'services';

      // If you do have a Meteor.users schema, then this prevents a check on Meteor.users.services updates that run periodically to resume login tokens and other things that don't need validation
      if (isUserServicesUpdate) {
        return method.apply(collection, args);
      }

      const isUpsert = isUpdate && args[2]?.upsert;
      const isReplace = isUpdate && !hasOperators(args[1]);

      const { $defaults, ...schemaRest } = schema; // $defaults is only on schema as an optimization
      const schemaToCheck = isUpdate && !isReplace ? _schemaDeepOptional : schemaRest;
      if (isUpdate && schema.$rules) schemaToCheck['$rules'] = schema.$rules; // $rules is only on schema but we want to put them on _schemaDeepOptional when we pass it into check

      await setDefaults({ $defaults, args, isUpdate, isUpsert, isReplace });

      const { autoCheck = true } = args[args.length - 1] || {};
      if (!autoCheck || !config.autoCheck) {
        if (!Meteor.isFibersDisabled && !isUpdate && args.length > 1 ) delete args[args.length - 1]; // in 2.x insert doesn't have options so we need to remove it
        return method.apply(collection, args);
      }

      const data = isUpsert ? { ...(typeof args[0] === 'string' ? { _id: args[0] } : args[0]), ...args[1] } : isUpdate ? args[1] : args[0]; // the typeof check for upsert allows using the shorthand _id
      const full = isReplace || !isUpdate;

      check(data, schemaToCheck, { full });

      return method.apply(collection, args);
    }
  });
});
