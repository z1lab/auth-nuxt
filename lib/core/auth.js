import getProp from 'dotprop'

import Storage from './storage'
import { routeOption, isRelativeURL, isSameURL } from './utilities'

export default class Auth {
  constructor (ctx, options) {
    this.ctx = ctx
    this.options = options

    // Strategies
    this.strategies = {}

    // Error listeners
    this._errorListeners = []

    // Redirect listeners
    this._redirectListeners = []

    // Storage & State
    options.initialState = { user: null, loggedIn: false }
    const storage = new Storage(ctx, options)

    this.$storage = storage
    this.$state = storage.state
  }

  async init () {
    // Reset on error
    if (this.options.resetOnError) {
      this.onError((...args) => {
        if (typeof (this.options.resetOnError) !== 'function' || this.options.resetOnError(...args)) this.reset()
      })
    }

    // Restore strategy
    this.$storage.syncUniversal('strategy', this.options.defaultStrategy)

    // Set default strategy if current one is invalid
    if (!this.strategy) {
      this.$storage.setUniversal('strategy', this.options.defaultStrategy)

      // Give up if still invalid
      if (!this.strategy) return Promise.resolve()
    }

    try {
      // Call mounted for active strategy on initial load
      await this.mounted()
    } catch (error) {
      this.callOnError(error)
    } finally {
      // Watch for loggedIn changes only in client side
      if (process.client && this.options.watchLoggedIn) {
        this.$storage.watchState('loggedIn', loggedIn => {
          if (!routeOption(this.ctx.route, 'auth', false)) {
            this.redirect(loggedIn ? 'home' : 'logout')
          }
        })
      }
    }
  }

  // ---------------------------------------------------------------
  // Strategy and Scheme
  // ---------------------------------------------------------------

  get strategy () {
    return this.strategies[this.$state.strategy]
  }

  registerStrategy (name, strategy) {
    this.strategies[name] = strategy
  }

  setStrategy (name) {
    if (name === this.$storage.getUniversal('strategy')) return Promise.resolve()

    // Set strategy
    this.$storage.setUniversal('strategy', name)

    // Call mounted hook on active strategy
    return this.mounted()
  }

  mounted () {
    if (!this.strategy.mounted) return this.fetchUserOnce()

    return Promise.resolve(this.strategy.mounted(...arguments)).catch(error => {
      this.callOnError(error, { method: 'mounted' })
      return Promise.reject(error)
    })
  }

  loginWith (name, ...args) {
    const params = args[0]

    if(params.forceRedirect) {
      this.options.forceRedirect = params.forceRedirect
    }

    return this.setStrategy(name).then(() => this.login(...args))
  }

  login () {
    if (!this.strategy.login) return Promise.resolve()

    return this.wrapLogin(this.strategy.login(...arguments)).catch(error => {
      this.callOnError(error, { method: 'login' })
      return Promise.reject(error)
    })
  }

  fetchUser () {
    if (!this.strategy.fetchUser) return Promise.resolve()

    return Promise.resolve(this.strategy.fetchUser(...arguments)).catch(error => {
      this.callOnError(error, { method: 'fetchUser' })
      return Promise.reject(error)
    })
  }

  logout () {
    if (!this.strategy.logout) {
      this.reset()
      return Promise.resolve()
    }

    return Promise.resolve(this.strategy.logout(...arguments)).catch(error => {
      this.callOnError(error, { method: 'logout' })
      return Promise.reject(error)
    })
  }

  reset () {
    if (!this.strategy.reset) {
      this.setUser(false)
      this.setToken(this.$state.strategy, false)
      this.setIdToken(this.$state.strategy, false)
      this.setRefreshToken(this.$state.strategy, false)
      this.$storage.clearLocalStorage()
      return Promise.resolve()
    }

    return Promise.resolve(this.strategy.reset(...arguments)).catch(error => {
      this.callOnError(error, { method: 'reset' })
      return Promise.reject(error)
    })
  }

  // ---------------------------------------------------------------
  // Token helpers
  // ---------------------------------------------------------------

  getToken (strategy) {
    const _key = this.options.token.prefix + strategy

    return this.$storage.getUniversal(_key)
  }

  setToken (strategy, token, options = {}) {
    const _key = this.options.token.prefix + strategy

    return this.$storage.setUniversal(_key, token, options)
  }

  // ---------------------------------------------------------------
  // ID token helpers
  // ---------------------------------------------------------------

  getIdToken (strategy) {
    const _key = this.options.id_token.prefix + strategy

    return this.$storage.getUniversal(_key)
  }

  setIdToken (strategy, IdToken, options = {}) {
    const _key = this.options.id_token.prefix + strategy

    return this.$storage.setUniversal(_key, IdToken, options)
  }

  // ---------------------------------------------------------------
  // Refresh token helpers
  // ---------------------------------------------------------------

  getRefreshToken (strategy) {
    const _key = this.options.refresh_token.prefix + strategy

    return this.$storage.getUniversal(_key)
  }

  setRefreshToken (strategy, refreshToken, options = {}) {
    const _key = this.options.refresh_token.prefix + strategy

    return this.$storage.setUniversal(_key, refreshToken, options)
  }

  // ---------------------------------------------------------------
  // User helpers
  // ---------------------------------------------------------------

  get user () {
    return this.$state.user
  }

  get loggedIn () {
    return this.$state.loggedIn
  }

  fetchUserOnce () {
    if (!this.$state.user) return this.fetchUser(...arguments)

    return Promise.resolve()
  }

  setUser (user) {
    this.$storage.setState('user', user)
    this.$storage.setState('loggedIn', Boolean(user))
  }

  // ---------------------------------------------------------------
  // Utils
  // ---------------------------------------------------------------

  get busy () {
    return this.$storage.getState('busy')
  }

  async request (endpoint, method, options) {
    return await new Promise((resolve, reject) => {
      this.ctx.app.$http[method](endpoint, options)
        .then(response => resolve(response))
        .catch(error => {
          // Call all error handlers
          this.callOnError(error, { method: 'request' })

          // Throw error
          reject(error)
        })
    })
  }

  wrapLogin (promise) {
    this.$storage.setState('busy', true)
    this.error = null

    return Promise.resolve(promise)
      .then(() => { this.$storage.setState('busy', false) })
      .catch(error => {
        this.$storage.setState('busy', false)
        return Promise.reject(error)
      })
  }

  onError (listener) {
    this._errorListeners.push(listener)
  }

  callOnError (error, payload = {}) {
    this.error = error

    for (const fn of this._errorListeners) fn(error, payload)
  }

  redirect (name, noRouter = false) {
    if (!this.options.redirect) return

    const forceRedirect = this.options.forceRedirect

    this.options.forceRedirect = ''

    const from = this.options.fullPathRedirect ? this.ctx.route.fullPath : this.ctx.route.path

    let to = this.options.redirect[name]

    if (!to) return

    // Apply rewrites
    if (this.options.rewriteRedirects) {
      if (name === 'login' && isRelativeURL(from) && !isSameURL(to, from)) {
        this.$storage.setUniversal('redirect', from)
      }

      if (name === 'home') {
        const redirect = this.$storage.getUniversal('redirect')
        this.$storage.setUniversal('redirect', null)

        if (isRelativeURL(redirect)) to = redirect
      }
    }

    // Call onRedirect hook
    to = this.callOnRedirect(to, from) || to

    // Prevent infinity redirects
    if (isSameURL(to, from)) {
      return
    }

    if (process.client) {
      if (forceRedirect) {
        this.ctx.redirect(forceRedirect)
      } else if (noRouter) {
        window.location.replace(to)
      } else {
        this.ctx.redirect(to, this.ctx.query)
      }
    } else {
      if (forceRedirect) {
        this.ctx.redirect(forceRedirect)
      } else {
        this.ctx.redirect(to, this.ctx.query)
      }
    }
  }

  onRedirect (listener) {
    this._redirectListeners.push(listener)
  }

  callOnRedirect (to, from) {
    for (const fn of this._redirectListeners) {
      to = fn(to, from) || to
    }
    return to
  }

  hasScope (scope) {
    const userScopes = this.$state.user && getProp(this.$state.user, this.options.scopeKey)

    if (!userScopes) {
      return undefined
    }

    if (Array.isArray(userScopes)) {
      return userScopes.includes(scope)
    }

    return Boolean(getProp(userScopes, scope))
  }
}
