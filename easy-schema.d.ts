import { Match } from 'meteor/check';

export declare const has: unique symbol;

type HasFluentSchema<T> = {
  [has]: BaseSchema<T>
};

// Object pattern limited to
export type ObjectPattern<T> = {
  type: HasFluentSchema<T>
}

export type Pattern =
  | BaseSchema<any>
  | HasFluentSchema<any>
  | ObjectPattern<any>
  | [Pattern]
  // Meteor Check doesn't require Pattern[], because check schemas are ephemeral
  // so typescript gives e.g. [String] the strict type of [StringConstructor]
  // but a schema declared as a variable does not have this benefit of the doubt
  // and is inferred as StringConstructor[]
  // Object.freeze or `as const` makes TS complain about mutability... can't win.
  | Pattern[]
  | {[key: string]: Pattern}
  | Match.Pattern;

export type Infer<T extends Pattern> =
  T extends BaseSchema<infer U> ? U :
  T extends HasFluentSchema<infer U> ? U :
  T extends [Pattern] ? Infer<T[0]>[] :
  T extends Pattern[] ? Infer<T[0]>[] :
  T extends ObjectPattern<infer U> ? U & { [key: string]: any } :
  T extends {[key: string]: Pattern} ? {[K in keyof T]: Infer<T[K]>} :
  Match.PatternMatch<T>;

// Base Schema class for common behavior
declare class BaseSchema<T> {
  constructor(type: T);

  default(value: any): this;
  where(value: (item: T) => boolean): this;
  enums(value: any, message?: string): this;
}

// Specialized schemas for different types
declare class StringSchema extends BaseSchema<string> {
  min(value: number | string, message?: string): this;
  max(value: number | string, message?: string): this;
  regex(value: RegExp, message?: string): this;
}

declare class NumberSchema extends BaseSchema<number> {
  min(value: number, message?: string): this;
  max(value: number, message?: string): this;
}

declare class ArraySchema extends BaseSchema<any[]> {
  min(value: number, message?: string): this;
  max(value: number, message?: string): this;
  unique(value?: boolean): this;
  only(value?: any): this;
}

declare class ObjectSchema extends BaseSchema<object> {
  min(value: number, message?: string): this;
  max(value: number, message?: string): this;
  only(value?: any): this;
}

// Augment native constructors with "has" symbol-based getter
declare global {
  interface StringConstructor {
    [has]: StringSchema;
  }

  interface NumberConstructor {
    [has]: NumberSchema;
  }

  interface ArrayConstructor {
    [has]: ArraySchema;
  }

  interface ObjectConstructor {
    [has]: ObjectSchema;
  }

  interface BooleanConstructor {
    [has]: BaseSchema<boolean>;
  }

  interface DateConstructor {
    [has]: BaseSchema<Date>;
  }
}

// Custom types for Integer, ID, and ObjectID
interface IntegerConstructor {
  [has]: NumberSchema;
}

interface DoubleConstructor {
  [has]: NumberSchema;
}

interface IDConstructor {
  [has]: BaseSchema<string>;
}

interface ObjectIDConstructor {
  [has]: BaseSchema<Mongo.ObjectID>;
}

interface DecimalConstructor {
  [has]: BaseSchema<any>;
}

export declare const ID: IDConstructor;
export declare const ObjectID: ObjectIDConstructor;

/**
 * @summary Check that data matches a schema pattern.
 * If the data does not match the schema, a `ValidationError` is thrown.
 *
 * @param {any} data The data to check
 * @param {Pattern} schema The schema to match `data` against
 * @param {Object} [options] Additional options for validation
 * @param {boolean} [options.full] Perform a full validation (on the server only)
 *
 * @throws {ValidationError} If the data does not conform to the schema
 */
export declare function check<T extends Pattern>(
  data: any,
  schema: T,
  options?: { full?: boolean }
): asserts data is Infer<T>;


/** Matches any value. */
export declare const Any: Match.Matcher<any>;
/** Matches a signed 32-bit integer. Doesn’t match `Infinity`, `-Infinity`, or `NaN`. */
export declare const Integer: Match.Matcher<number>;
export declare const Double: Match.Matcher<number>;

/**
  * Matches either `undefined`, `null`, or pattern. If used in an object, matches only if the key is not set as opposed to the value being set to `undefined` or `null`. This set of conditions
  * was chosen because `undefined` arguments to Meteor Methods are converted to `null` when sent over the wire.
  */
export declare function Optional<T extends Pattern>(
  pattern: T
): Match.Matcher<Infer<T> | undefined | null>;

/**
 * Shapes a schema object based on a POJO.
 *
 * @param {Object} schema - The schema object to be shaped.
 * @param {Object} [options] - Options object.
 * @param {boolean} [options.optionalize=false] - If true, marks all properties as optional.
 * @returns {Object} The shaped schema object that's ready to use with jam:easy-schema `check`.
 */
//export declare const shape: (obj: Record<string, any>, options?: { optionalize?: boolean }) => Record<string, any>;
export declare const shape: <T extends Pattern>(
  schema: T,
  options?: { optionalize?: boolean }
) => options extends { optionalize: true } ? Partial<Infer<T>> : Infer<T>;
/**
 * Creates a new object composed of the specified keys and their corresponding values from the given object.
 *
 * @param {Object} obj - The source object from which to pick keys.
 * @param {string[]} keys - An array of keys to pick from the source object.
 * @returns {Object} - A new object containing only the specified keys and their values.
 */
// export declare const pick: (obj: Record<string, any>, keys: string[]) => Record<string, any>;
export declare const pick: <T extends Pattern, K extends keyof Infer<T>>(
  obj: T,
  keys: K[]
) => Pick<Infer<T>, K>;

export declare const EasySchema: {
  /**
    * Readonly configuration options for EasySchema.
    */
  readonly config: {
    base?: object;
    autoCheck?: boolean;
    autoAttachJSONSchema?: boolean;
    validationAction?: string;
    validationLevel?: string;
    additionalBsonTypes?: object;
  },
  /**
   * Configures the settings for EasySchema.
   */
  configure: (options: {
    base?: object;
    autoCheck?: boolean;
    autoAttachJSONSchema?: boolean;
    validationAction?: string;
    validationLevel?: string;
    additionalBsonTypes?: object;
  }) => object,
  /**
   * Make a field required that was optional. See docs for more info.
   */
  readonly REQUIRED: string,
};

declare module 'meteor/mongo' {
  namespace Mongo {
    interface Collection<T> {
      attachSchema<U extends Pattern>(schema: U): Collection<Infer<U>>
      schema?: Pattern;
    }
  }
}
