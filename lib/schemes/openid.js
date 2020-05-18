import nanoid from 'nanoid'
import jwt from 'jwt-decode'
import consola from 'consola'

const DEFAULTS = {
  tokenType: 'Bearer',
  tokenName: 'Authorization'
}

const logger = consola.withScope('nuxt:auth')

export default class OpenidScheme {
  constructor (auth, options) {
    this.$auth = auth
    this.name = options._name

    this.options = Object.assign({}, DEFAULTS, options)
  }

  _setToken (token) {
    // Set Authorization token for all http requests
    this.$auth.ctx.app.$http.setToken(token)
  }

  _clearToken () {
    // Clear Authorization token for all http requests
    this.$auth.ctx.app.$http.setToken(false)
  }

  async setTokens (result, remember = true) {
    const access_token = this.options.tokenType ? this.options.tokenType + ' ' + result.access_token : result.access_token
    const expires = { expires: new Date(new Date() * 1 + result.expires_in * 1000) }

    await this.$auth.setToken(this.name, access_token, expires)

    if (remember && (remember !== 'undefined')) {
      await this.$auth.setRefreshToken(this.name, result.refresh_token, { expires: new Date(new Date() * 1 + result.expires_in * 2000) })
    }

    await this.$auth.setIdToken(this.name, result.id_token, expires)

    this._setToken(access_token)
  }

  mounted () {
    const token = this.$auth.getToken(this.name)
    this._setToken(token)

    return this.$auth.fetchUserOnce()
  }

  async login (params) {
    const opts = {
      client_id: this.options.client_id,
      client_secret: this.options.client_secret,
      grant_type: this.options.grant_type,
      scope: this.options.scope,
      state: nanoid(),
      username: params.username,
      password: params.password
    }

    // Ditch any leftover local tokens before attempting to log in
    await this._logoutLocally()

    await this.$auth.request(this.options.token_endpoint, '$post', opts).then(async response => {
      await this.setTokens(response, params.remember)
    })

    return this.fetchUser()
  }

  async fetchUser () {
    const token = this.$auth.getToken(this.name)
    const refresh_token = this.$auth.getRefreshToken(this.name)

    // Token is required but not available
    if (!token && !refresh_token) return

    if (!token) {
      await this._clearToken()

      await this.$auth.request(this.options.token_endpoint, '$post', {
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        client_id: this.options.client_id,
        client_secret: this.options.client_secret,
        scope: this.options.scope
      }).then(async response => await this.setTokens(response))
    } else {
      await this.checkChangeUser(token)
    }

    const decoded_idToken = JSON.parse(jwt(await this.$auth.getIdToken(this.name)).user);

    this.$auth.setUser(decoded_idToken)
  }

  async checkChangeUser (token) {
    const decoded_idToken = JSON.parse(jwt(await this.$auth.getIdToken(this.name)).user)

    await this.$auth.request(this.options.token_check_update, 'head', {
      headers: { 'Authorization': token, 'If-None-Match': decoded_idToken.etag }
    }).then(async () => {
      await this.$auth.request(this.options.token_check_update, '$get', {
        headers: { 'Authorization': token, 'If-None-Match': decoded_idToken.etag }
      }).then(async (response) => {
        const expires = { expires: new Date(new Date() * 1 + response.expires_in * 1000) }

        await this._clearToken()

        await this.$auth.setIdToken(this.name, response.id_token, expires)

        this.$auth.setUser(JSON.parse(jwt(response.id_token).user))
      }).catch(async e => {
        console.log(e)
        if (e.response.status !== 304) await logger.warn(e)
      })
    }).catch(async e => {
      console.log(e)
      if (e.response.status !== 304) await logger.warn(e)
    })
  }

  async logout () {
    await this.$auth.request(this.options.logout_endpoint, 'post')

    return this._logoutLocally()
  }

  async _logoutLocally () {
    await this._clearToken()

    return this.$auth.reset()
  }
}
