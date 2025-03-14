import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _defaults } from '../shape';
import { setDefaults } from '../defaults/client';
import { hasOperators } from '../utils/shared';

// Apply defaults, if any, that have been defined in the schema prior to insert / update / upsert
const writeMethods = ['insert', 'update'].map(m => Meteor.isFibersDisabled ? `${m}Async` : m); // Meteor.isFibersDisabled = true in Meteor 3+, eventually remove this .map when Meteor drops *Async post 3.0. upsert will run through update so we don't need to add it explicitly here.
Meteor.startup(() => {
  writeMethods.forEach(methodName => {
    const method = Mongo.Collection.prototype[methodName];
    Mongo.Collection.prototype[methodName] = async function(...args) {
      const collection = this;
      const { _name, schema } = collection;

      if (!schema) {
        return method.apply(collection, args);
      }

      const isUpdate = ['update', 'updateAsync'].includes(methodName);
      const isUpsert = isUpdate && args[2]?.upsert;
      const isReplace = isUpdate && !hasOperators(args[1]);
      const defaults = schema[_defaults];

      setDefaults({ defaults, args, isUpdate, isUpsert, isReplace });

      const { autoCheck = true } = args[args.length - 1] || {};
      if (!autoCheck && !Meteor.isFibersDisabled && !isUpdate && args.length > 1) {
        delete args[args.length - 1]; // in 2.x insert doesn't have options so we need to remove it
      }

      return method.apply(collection, args)
    }
  });
});
