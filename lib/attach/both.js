import { Mongo } from 'meteor/mongo';

// allows passing in methods when setting up with new Mongo.Collection(..., { schema })
// by doing it this way, we get out-of-the-box intellisense
const originalCollection = Mongo.Collection;
Mongo.Collection = function Collection(name, options) {
  const { schema, ...rest } = options || {};
  const instance = new originalCollection(name, rest);

  if (schema) {
    instance.attachSchema(schema);
  }

  return instance;
}

Object.assign(Mongo.Collection, originalCollection); // preserve methods and properties
Mongo.Collection.prototype = originalCollection.prototype;
Mongo.Collection.prototype.constructor = Mongo.Collection;
