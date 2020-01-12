import * as configs from './imaps.json';
import * as Constants from './Constants';

export const get = (str, selection) => {
    for (let i = 0; i < selection.length; i++)
      for (const id in configs[selection[i]].tag)
        return str.includes(configs[selection[i]].tag[id])
          ? {
              imap: {
                user: str.slice(0, str.indexOf(":")),
                password: str.slice(str.indexOf(":") + 1, str.length),
                host: configs[selection[i]].host,
                port: configs[selection[i]].port,
                tls: configs[selection[i]].tls,
                tlsOptions: {
                  rejectUnauthorized: false
                },
                authTimeout: Constants.AUTH_TO
              }
            }
          : null;
  };