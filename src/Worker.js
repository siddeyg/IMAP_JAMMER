import imaps from "imap-simple";

module.exports = function(config, callback) {
  imaps
    .connect(config)
    .then(connection => {
      callback(null, config);
    })
    .catch(error => callback(error, config));
};
