import imaps from "imap-simple";

module.exports = async function(config, callback) {
  await imaps
    .connect(config)
    .then(connection => {
      callback(null, config);
    })
    .catch(error => callback(error, config));
};
