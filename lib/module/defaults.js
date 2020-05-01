module.exports = {
  //  -- Error handling --

  resetOnError: false,

  // -- Authorization --

  scopeKey: 'scope',

  // -- Redirects --

  rewriteRedirects: true,

  fullPathRedirect: false,

  watchLoggedIn: true,

  forceRedirect: '',

  redirect: {
    login: '/login',
    logout: '/',
    home: '/',
    callback: '/login'
  },

  //  -- Vuex Store --

  vuex: {
    namespace: 'auth'
  },

  // -- Cookie Store --

  cookie: {
    prefix: 'auth.',
    options: {
      path: '/'
    }
  },

  // -- Token --

  token: {
    prefix: 'token.'
  },

  // -- Id Token --

  id_token: {
    prefix: 'id_token.'
  },

  // -- Refresh token --

  refresh_token: {
    prefix: 'refresh_token.'
  },

  // -- Strategies --

  defaultStrategy: undefined /* will be auto set at module level */,

  strategies: {
    passport: {
      url: 'http://api',
      client_id: '',
      client_secret: ''
    }
  }
}
