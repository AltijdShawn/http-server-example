// // * EXPLAINATION: This is essentially a primitive express middleware

// /**
//  * Map the given param placeholder `name`(s) to the given callback.
//  *
//  * Parameter mapping is used to provide pre-conditions to routes
//  * which use normalized placeholders. For example a _:user_id_ parameter
//  * could automatically load a user's information from the database without
//  * any additional code,
//  *
//  * The callback uses the same signature as middleware, the only difference
//  * being that the value of the placeholder is passed, in this case the _id_
//  * of the user. Once the `next()` function is invoked, just like middleware
//  * it will continue on to execute the route, or subsequent parameter functions.
//  *
//  * Just like in middleware, you must either respond to the request or call next
//  * to avoid stalling the request.
//  *
//  *  app.param('user_id', function(req, res, next, id){
//  *    User.find(id, function(err, user){
//  *      if (err) {
//  *        return next(err);
//  *      } else if (!user) {
//  *        return next(new Error('failed to load user'));
//  *      }
//  *      req.user = user;
//  *      next();
//  *    });
//  *  });
//  *
//  * @param {String} name
//  * @param {Function} fn
//  * @return {app} for chaining
//  * @public
//  */

// proto.param = function param(name, fn) {
//   // param logic
//   if (typeof name === 'function') {
//     deprecate('router.param(fn): Refactor to use path params');
//     this._params.push(name);
//     return;
//   }

//   // apply param functions
//   var params = this._params;
//   var len = params.length;
//   var ret;

//   if (name[0] === ':') {
//     deprecate('router.param(' + JSON.stringify(name) + ', fn): Use router.param(' + JSON.stringify(name.slice(1)) + ', fn) instead')
//     name = name.slice(1)
//   }

//   for (var i = 0; i < len; ++i) {
//     if (ret = params[i](name, fn)) {
//       fn = ret;
//     }
//   }

//   // ensure we end up with a
//   // middleware function
//   if ('function' !== typeof fn) {
//     throw new Error('invalid param() call for ' + name + ', got ' + fn);
//   }

//   (this.params[name] = this.params[name] || []).push(fn);
//   return this;
// };