const userStrings = ['Meteor.user.', 'currentUser', 'Meteor.userAsync'];
const dateStrings = ['Date', 'now'];

export const shouldSet = value => typeof value === 'function' && value !== Date.now;

export const hasUser = value => {
  const stringValue = String(value);
  return userStrings.some(s => stringValue.includes(s));
};

export const resolveValue = ({ value, user, userId, now }) => {
  if (value === 'Meteor.userId') {
    return userId;
  }

  if (user && hasUser(value)) {
    const field = String(value).split('.').pop().replace(/\)$/, '')
    return user[field];
  }

  if (typeof value === 'function') {
    if (value === Date.now) return now;

    const stringValue = String(value);

    if (dateStrings.some(s => stringValue.includes(s))) {
      const result = value();
      return new Date(typeof result === 'function' ? result() : result);
    }

    return value();
  }

  return value;
}
