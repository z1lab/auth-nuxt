# auth

> 

## Introduction

Module developed for the nuxt framework for app authentication and user management.

## License

Auth Modulo is open source software licensed under the [MIT License] (https://opensource.org/licenses/MIT).

## Installation

```
yarn add @z1lab/auth or npm install @z1lab/auth
```

## Setup

Edit `nuxt.config.js`:


```
modules: [
  '@nuxtjs/axios',
  '@nuxtjs/auth'
],

auth: {
  // Options
}
```

> **Important**
>
> Don't forget to enable vuex store in your app. More information on how to do that can be found on the Nuxt Getting Started Guide.


## Middleware

You can enable auth middleware either globally or per route. When this middleware is enabled on a route and loggedIn is false user will be redirected to redirect.login route. (/login by default)

Setting per route:
```
export default {
  middleware: 'auth'
}
```

Globally setting in nuxt.config.js:
```
router: {
  middleware: ['auth']
}
```

In case of global usage, You can set auth option to false in a specific component and the middleware will ignore that route.
```
export default {
  auth: false
}
```

You can set auth option to guest in a specific component. When this middleware is enabled on a route and loggedIn is true user will be redirected to redirect.home route. (/ by default)
```
export default {
  auth: 'guest'
}
```


### Properties

| Property          | Input     | Default                                                           | Description                                                                                             |
|-------------      |-----------|-------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| resetOnError      | Bool/Func | FALSE                                                             | If enabled, user will be automatically logged out if an error happens. (For example when token expired).|
| scopeKey          | String    | scope                                                             | User object property used for scope checking (hasScope). Can be either an array or a object.            |
| rewriteRedirects  | Bool      | TRUE                                                              | If enabled, user will redirect back to the original guarded route instead of redirect.home.             |
| fullPathRedirect  | Bool      | FALSE                                                             | If true, use the full route path with query parameters for redirect.                                    |
| watchLoggedIn     | Bool      | TRUE                                                              | When enabled (default) user will be redirected on login/logouts.                                        |
| redirect          | Object    | {login: '/login', logout: '/', home: '/', callback: '/login'}     | Routes to redirect after performing certain actions.                                                    |
| vuex              | Object    | {namespace: 'auth'}                                               | Vuex store namespace.                                                                                   |
| cookie            | Object    | {prefix: 'auth.', options: {path: '/'}}                           | cookie setting options to be set by the plugin.                                                         |
| token             | Object    | {prefix: 'token.'}                                                | Token prefix setting.                                                                                   |
| id_token          | Object    | {prefix: 'id_token.'}                                             | Token prefix setting.                                                                                   |
| refresh_token     | Object    | {prefix: 'refresh_token.'}                                        | Token prefix setting.                                                                                   |
| defaultStrategy   | Bool      | undefined                                                         | Default strategy name.                                                                                  |
| strategies        | Object    | {passport: {url: 'http://api', client_id: '', client_secret: ''}} | Etrategies and their settings.                                                                          |


### Usage

To do a password based login by sending credentials in request body as a JSON object:

``` javascript
this.$auth.loginWith('passport', {username: 'your_username',password: 'your_password'})
```

Example config `nuxt.config.js`:

```
auth: {
    cookie: {prefix: 'auth2.', options: {path: '/'}},
    strategies: {
      passport: {
        url: 'http://api.com.br',
        client_id: '',
        client_secret: ''
      }
    }
  }
```



