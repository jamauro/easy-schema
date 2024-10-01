import { check as c, Match } from 'meteor/check';

export const config = { // most configs are on the server only
  base: {},
};

export const configure = options => {
  c(options, Match.ObjectIncluding({
    base: Match.Maybe(Object),
  }));

  return Object.assign(config, options);
}
