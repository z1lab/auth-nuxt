const { assignDefaults } = require('./_utils')

module.exports = function passport (strategy) {
  assignDefaults(strategy, {
    _scheme: 'openid',
    _name: 'passport',
    authorization_endpoint: `${strategy.url}/oauth/authorize`,
    token_endpoint: `${strategy.url}/oauth/token`,
    token_check_update: `${strategy.url}/oauth/openid`,
    logout_endpoint: `${strategy.url}/logout`,
    token_key: 'access_token',
    token_type: 'Bearer',
    refresh_token: 'refresh_token',
    id_token: 'id_token',
    grant_type: 'password',
    scope: 'openid'
  });
};
