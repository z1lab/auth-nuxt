import nanoid from 'nanoid'
import jwt from 'jwt-decode'

const DEFAULTS = {
  tokenType: 'Bearer',
  tokenName: 'Authorization'
}

export default class OpenidScheme {
  constructor (auth, options) {
    this.$auth = auth
    this.name = options._name

    this.options = Object.assign({}, DEFAULTS, options)
  }

  _setToken (token) {
    // Set Authorization token for all axios requests
    this.$auth.ctx.app.$axios.setHeader(this.options.tokenName, token)
  }

  _clearToken () {
    // Clear Authorization token for all axios requests
    this.$auth.ctx.app.$axios.setHeader(this.options.tokenName, false)
  }

  async setTokens(result, remember = true) {
    let access_token = this.options.tokenType ? this.options.tokenType + ' ' + result.access_token : result.access_token,
      expires = {expires: new Date(new Date() * 1 + result.expires_in  * 1000)};

    await this.$auth.setToken(this.name, access_token, expires)

    if (remember && (remember !== null && remember !== 'undefined')) {
      await this.$auth.setRefreshToken(this.name, result.refresh_token, {expires: new Date(new Date() * 1 + result.expires_in  * 2000)})
    }

    await this.$auth.setIdToken(this.name, result.id_token, expires)

    this._setToken(access_token)
  }

  mounted () {
    const token = this.$auth.syncToken(this.name)
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
    };

    // Ditch any leftover local tokens before attempting to log in
    await this._logoutLocally();

    const result = await this.$auth.request(this.options.token_endpoint, {data: opts, method: 'POST'})

    await this.setTokens(result, params.remember)

    return this.fetchUser()
  }

  async fetchUser () {
    let token = this.$auth.getToken(this.name),
      refresh_token = this.$auth.getRefreshToken(this.name);

    // Token is required but not available
    if (!token && !refresh_token) return

    if (!token) {
      this._clearToken()

      const result = await this.$auth.request(this.options.token_endpoint, {data: {
          grant_type: 'refresh_token',
          refresh_token: refresh_token,
          client_id: this.options.client_id,
          client_secret: this.options.client_secret,
          scope: this.options.scope
        }, method: 'POST'})

      this.setTokens(result)
    }

    let decoded_idToken = jwt(await this.$auth.getIdToken(this.name)),
      info_user = {
        name: decoded_idToken.name,
        email: decoded_idToken.email
      }

    this.$auth.setUser(info_user)
  }

  async logout () {
    await this.$auth.request(this.options.logout_endpoint, {method: 'POST'})

    return this._logoutLocally()
  }

  async _logoutLocally () {
    this._clearToken()

    return this.$auth.reset()
  }
}
